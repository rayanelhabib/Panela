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
	cfg            *config.Config
	userHandler    *UserHandler
	serverHandler  *ServerHandler
	consoleHandler *websocket.ConsoleHandler
}

// NewHandler constructs and wires all sub-handlers together
func NewHandler(cfg *config.Config, userH *UserHandler, serverH *ServerHandler, consoleH *websocket.ConsoleHandler) *Handler {
	return &Handler{
		cfg:            cfg,
		userHandler:    userH,
		serverHandler:  serverH,
		consoleHandler: consoleH,
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
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Adjust appropriately in production deployment
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

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

		// Users Actions
		users := v1.Group("/users", authMiddleware)
		{
			users.GET("/me", h.userHandler.Profile)
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
		}
	}

	// WebSocket routes (often don't share same middlewares perfectly due to WS upgrades)
	r.GET("/ws/servers/:id/console", h.consoleHandler.ServeConsole)

	return r
}
