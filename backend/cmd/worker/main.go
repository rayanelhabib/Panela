package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/hibiken/asynq"
	"github.com/panella/backend/internal/config"
	"github.com/panella/backend/internal/infrastructure/queue"
	"github.com/panella/backend/internal/repository"
	"github.com/panella/backend/pkg/database"
	"github.com/panella/backend/pkg/logger"
	"go.uber.org/zap"
)

func main() {
	// 1. Initialize configs
	cfg, err := config.LoadConfig("configs")
	if err != nil {
		fmt.Printf("Error loading configurations: %v\n", err)
		os.Exit(1)
	}

	// 2. Initialize structured logger
	logger.Initialize(cfg.App.Env)
	logger.Info("Background Worker started successfully", zap.String("app_name", cfg.App.Name))

	// 3. Graceful shutdown worker setup
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// 4. Initialize Postgres for the worker
	db, err := database.InitPostgres(cfg)
	if err != nil {
		logger.Fatal("Worker failed to connect to database", zap.Error(err))
	}
	serverRepo := repository.NewPostgresServerRepository(db)

	// 4. Initialize Asynq Server
	redisConnOpt := asynq.RedisClientOpt{Addr: "localhost:6379"} // In prod, read from cfg
	srv := asynq.NewServer(
		redisConnOpt,
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"default": 10,
			},
		},
	)

	// 5. Register Task Handlers
	mux := asynq.NewServeMux()
	mux.HandleFunc(queue.TypeInstallServer, queue.HandleInstallServerTask(serverRepo))

	// 6. Run the Worker Server
	go func() {
		if err := srv.Run(mux); err != nil {
			logger.Fatal("Worker server failed", zap.Error(err))
		}
	}()

	<-quit
	logger.Info("Shutting down background worker gracefully...")
	logger.Info("Worker exited cleanly.")
}
