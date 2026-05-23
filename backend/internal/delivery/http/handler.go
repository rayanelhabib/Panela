package http

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/panella/backend/internal/config"
	"github.com/panella/backend/internal/delivery/websocket"
	"github.com/panella/backend/pkg/response"
)

// Handler holds instances of sub-handlers and configs
type Handler struct {
	cfg                 *config.Config
	userHandler         *UserHandler
	serverHandler       *ServerHandler
	consoleHandler      *websocket.ConsoleHandler
	extHandler          *ExtensionHandler
	notificationHandler *NotificationHandler
	fileHandler         *FileManagerHandler
}

// NewHandler constructs and wires all sub-handlers together
func NewHandler(
	cfg *config.Config,
	userH *UserHandler,
	serverH *ServerHandler,
	consoleH *websocket.ConsoleHandler,
	extH *ExtensionHandler,
	notifH *NotificationHandler,
	fileH *FileManagerHandler,
) *Handler {
	return &Handler{
		cfg:                 cfg,
		userHandler:         userH,
		serverHandler:       serverH,
		consoleHandler:      consoleH,
		extHandler:          extH,
		notificationHandler: notifH,
		fileHandler:         fileH,
	}
}

// InitRouter configures gin engine, CORS, health endpoint, groups and routing
func (h *Handler) InitRouter() *gin.Engine {
	if h.cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	r := gin.Default()

	// CORS Setup
	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}

	if h.cfg.App.Env == "production" {
		corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	} else {
		// Dynamically allow any origin for robust local network development (e.g. LAN IPs)
		corsConfig.AllowOriginFunc = func(origin string) bool {
			return true
		}
	}
	r.Use(cors.New(corsConfig))

	// Base/health endpoint
	r.GET("/health", func(c *gin.Context) {
		response.OK(c, gin.H{
			"status": "UP",
			"app":    h.cfg.App.Name,
		}, "API service is running cleanly")
	})

	// API Group Endpoint
	v1 := r.Group("/api/v1")
	{
		// Public Auth
		auth := v1.Group("/auth")
		{
			auth.POST("/register", h.userHandler.Register)
			auth.POST("/login", h.userHandler.Login)
		}

		// Authenticated Middlewares
		authMiddleware := AuthMiddleware(h.cfg)

		// Notifications Actions
		notifications := v1.Group("/notifications", authMiddleware)
		{
			notifications.GET("", h.notificationHandler.GetNotifications)
			notifications.POST("/read", h.notificationHandler.MarkAllRead)
		}

		// Users Actions
		users := v1.Group("/users", authMiddleware)
		{
			users.GET("/me", h.userHandler.Profile)
			users.PUT("/me", h.userHandler.UpdateProfile)
			users.POST("/me/avatar", h.userHandler.UploadAvatar)
		}

		// Servers Actions
		servers := v1.Group("/servers", authMiddleware)
		{
			servers.POST("", h.serverHandler.Create)
			servers.GET("", h.serverHandler.ListMy)
			servers.GET("/:id", h.serverHandler.Get)
			servers.POST("/:id/start", h.serverHandler.Start)
			servers.POST("/:id/stop", h.serverHandler.Stop)
			servers.DELETE("/:id", h.serverHandler.Delete)

			// Real File Manager Endpoints
			servers.GET("/:id/files", h.fileHandler.ListFiles)
			servers.GET("/:id/files/content", h.fileHandler.GetFileContent)
			servers.POST("/:id/files/content", h.fileHandler.SaveFileContent)
			servers.POST("/:id/files/folder", h.fileHandler.CreateFolder)
			servers.DELETE("/:id/files", h.fileHandler.DeleteFile)
			servers.POST("/:id/files/rename", h.fileHandler.RenameFile)
			servers.POST("/:id/files/upload", h.fileHandler.UploadFile)
			servers.POST("/:id/files/unarchive", h.fileHandler.UnarchiveFile)

			// GORM databases
			servers.POST("/:id/databases", h.extHandler.CreateDatabase)
			servers.GET("/:id/databases", h.extHandler.ListDatabases)
			servers.POST("/:id/databases/:db_id/rotate", h.extHandler.RotatePassword)
			servers.DELETE("/:id/databases/:db_id", h.extHandler.DeleteDatabase)

			// Backups
			servers.POST("/:id/backups", h.extHandler.CreateBackup)
			servers.GET("/:id/backups", h.extHandler.ListBackups)
			servers.DELETE("/:id/backups/:backup_id", h.extHandler.DeleteBackup)

			// Schedules
			servers.POST("/:id/schedules", h.extHandler.CreateSchedule)
			servers.GET("/:id/schedules", h.extHandler.ListSchedules)
			servers.POST("/:id/schedules/:sched_id/toggle", h.extHandler.ToggleSchedule)
		}
	}

	// WebSocket routes (often don't share same middlewares perfectly due to WS upgrades)
	r.GET("/ws/servers/:id/console", h.consoleHandler.ServeConsole)

	return r
}
