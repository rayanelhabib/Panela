package websocket

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/panella/backend/internal/config"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/pkg/logger"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// ConsoleHandler manages websocket connections for server consoles
type ConsoleHandler struct {
	cfg           *config.Config
	serverUsecase domain.ServerUsecase
}

func NewConsoleHandler(cfg *config.Config, serverUsecase domain.ServerUsecase) *ConsoleHandler {
	return &ConsoleHandler{
		cfg:           cfg,
		serverUsecase: serverUsecase,
	}
}

func (h *ConsoleHandler) ServeConsole(c *gin.Context) {
	// Authentication is usually done via a one-time token in query params for websockets
	// Simplified here for bootstrapping
	serverID := c.Param("id")
	if serverID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "server id is required"})
		return
	}

	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token context"})
		return
	}

	// Verify server exists and user has access
	_, err := h.serverUsecase.GetServer(c.Request.Context(), serverID, userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "server not found"})
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("Failed to upgrade websocket", zap.Error(err))
		return
	}
	defer ws.Close()

	logger.Info("Client connected to server console", zap.String("server_id", serverID))

	// Mocking console output from a daemon
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// Handle disconnects
	go func() {
		for {
			if _, _, err := ws.ReadMessage(); err != nil {
				logger.Debug("Client disconnected from console", zap.String("server_id", serverID))
				return
			}
		}
	}()

	for range ticker.C {
		logLine := fmt.Sprintf("[%s] Daemon: Server is running. Memory Usage: 256MB / 1024MB\r\n", time.Now().Format(time.RFC3339))
		if err := ws.WriteMessage(websocket.TextMessage, []byte(logLine)); err != nil {
			break
		}
	}
}
