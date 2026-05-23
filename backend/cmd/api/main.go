package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/panella/backend/internal/config"
	delivery "github.com/panella/backend/internal/delivery/http"
	"github.com/panella/backend/internal/delivery/websocket"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/internal/infrastructure/daemon"
	"github.com/panella/backend/internal/repository"
	"github.com/panella/backend/internal/usecase"
	"github.com/panella/backend/pkg/database"
	"github.com/panella/backend/pkg/logger"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 1. Initialize configurations
	cfg, err := config.LoadConfig("configs")
	if err != nil {
		fmt.Printf("Error loading configurations: %v\n", err)
		os.Exit(1)
	}

	// 2. Initialize structured logger
	logger.Initialize(cfg.App.Env)
	logger.Info("Configurations loaded successfully", zap.String("app_name", cfg.App.Name))

	// 3. Initialize Repositories (PostgreSQL)
	db, err := database.InitPostgres(cfg)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}

	// Auto-migrate tables
	logger.Info("Running auto-migrations...")
	err = db.AutoMigrate(
		&domain.User{}, 
		&domain.Server{}, 
		&domain.Allocation{},
		&domain.ServerDatabase{},
		&domain.ServerBackup{},
		&domain.ServerSchedule{},
		&domain.Notification{},
	)
	if err != nil {
		logger.Fatal("Failed to run migrations", zap.Error(err))
	}

	userRepo := repository.NewPostgresUserRepository(db)
	serverRepo := repository.NewPostgresServerRepository(db)
	allocRepo := repository.NewPostgresAllocationRepository(db)
	extRepo := repository.NewPostgresExtensionRepository(db)
	notifRepo := repository.NewPostgresNotificationRepository(db)

	// Seed some mock allocations for node-1 if empty
	var count int64
	db.Model(&domain.Allocation{}).Count(&count)
	if count == 0 {
		allocRepo.Create(context.Background(), &domain.Allocation{
			ID:     "00000000-0000-0000-0000-000000000001",
			NodeID: "node-1",
			IP:     "192.168.1.100",
			Port:   25565,
		})
		allocRepo.Create(context.Background(), &domain.Allocation{
			ID:     "00000000-0000-0000-0000-000000000002",
			NodeID: "node-1",
			IP:     "192.168.1.100",
			Port:   25566,
		})
	}

	// Seed an initial admin user for development if not already present
	// Email: admin@panella.com, Password: adminpassword
	ctx := context.Background()
	adminUser, err := userRepo.GetByEmail(ctx, "admin@panella.com")
	if err != nil {
		hashedAdminPassword, _ := bcrypt.GenerateFromPassword([]byte("adminpassword"), bcrypt.DefaultCost)
		_ = userRepo.Create(ctx, &domain.User{
			ID:       "11111111-1111-1111-1111-111111111111",
			Email:    "admin@panella.com",
			Password: string(hashedAdminPassword),
			Username: "admin",
			Role:     "admin",
		})
	} else if len(adminUser.Password) > 0 && adminUser.Password[0] != '$' {
		// Existing admin has plaintext password, migrate to bcrypt
		hashedAdminPassword, _ := bcrypt.GenerateFromPassword([]byte("adminpassword"), bcrypt.DefaultCost)
		db.Model(&domain.User{}).Where("email = ?", "admin@panella.com").Update("password", string(hashedAdminPassword))
		logger.Info("Admin password securely migrated to Bcrypt.")
	}
	logger.Info("Development admin user checked/seeded: admin@panella.com / adminpassword")

	// Seed initial notification alert for admin onboarding
	var notifCount int64
	db.Model(&domain.Notification{}).Count(&notifCount)
	if notifCount == 0 {
		notifRepo.Create(ctx, &domain.Notification{
			ID:        "00000000-0000-0000-0000-000000000100",
			Message:   "Welcome to Panella Cloud Panel. Your clean orchestration dashboard is fully initialized and operational.",
			Type:      "success",
			CreatedAt: time.Now().Unix(),
			Read:      false,
		})
	}

	// 4. Initialize Asynq Client
	redisConnOpt := asynq.RedisClientOpt{Addr: "localhost:6379"} // Should be from cfg in prod
	asynqClient := asynq.NewClient(redisConnOpt)
	defer asynqClient.Close()

	// 5. Initialize Infrastructure Adapters
	daemonClient := daemon.NewDaemonClient()

	// 6. Initialize Usecases
	userUsecase := usecase.NewUserUsecase(userRepo, cfg)
	allocUsecase := usecase.NewAllocationUsecase(allocRepo)
	serverUsecase := usecase.NewServerUsecase(serverRepo, allocUsecase, asynqClient, daemonClient)
	extUsecase := usecase.NewExtensionUsecase(extRepo)
	notifUsecase := usecase.NewNotificationUsecase(notifRepo)
	fileUsecase := usecase.NewFileManagerUsecase()

	// 7. Initialize Handlers and Routers
	userHandler := delivery.NewUserHandler(userUsecase)
	serverHandler := delivery.NewServerHandler(serverUsecase)
	consoleHandler := websocket.NewConsoleHandler(cfg, serverUsecase)
	extHandler := delivery.NewExtensionHandler(extUsecase)
	notifHandler := delivery.NewNotificationHandler(notifUsecase)
	fileHandler := delivery.NewFileManagerHandler(fileUsecase, notifUsecase)
	
	mainHandler := delivery.NewHandler(cfg, userHandler, serverHandler, consoleHandler, extHandler, notifHandler, fileHandler)

	router := mainHandler.InitRouter()

	// 8. Graceful Shutdown HTTP Server Setup
	serverAddr := fmt.Sprintf(":%d", cfg.App.Port)
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: router,
	}

	go func() {
		logger.Info("Starting HTTP Server...", zap.String("addr", serverAddr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to serve HTTP requests", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down API server gracefully...")

	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(ctxShutdown); err != nil {
		logger.Error("API Server forced shutdown", zap.Error(err))
	}

	logger.Info("API Server exited cleanly.")
}
