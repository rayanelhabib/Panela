package websocket

import (
	"bufio"
	"context"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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
	serverID := c.Param("id")
	if serverID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "server id is required"})
		return
	}

	// 1. Get the token from query param or header
	tokenString := c.Query("token")
	if tokenString == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token is required"})
		return
	}

	// 2. Parse and validate the JWT token dynamically
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(h.cfg.JWT.Secret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired authorization token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}

	userID, _ := claims["sub"].(string)

	// Verify server exists and user has access
	_, err = h.serverUsecase.GetServer(c.Request.Context(), serverID, userID)
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

	containerName := fmt.Sprintf("panella-server-%s", serverID)
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	// Write system welcome message
	_ = ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("[System] Connected to container: %s\r\n", containerName)))

	// Check if container is running
	checkCmd := exec.CommandContext(ctx, "docker", "inspect", "-f", "{{.State.Running}}", containerName)
	isRunningOutput, checkErr := checkCmd.Output()
	containerRunning := false
	if checkErr == nil && strings.TrimSpace(string(isRunningOutput)) == "true" {
		containerRunning = true
	}

	if !containerRunning {
		_ = ws.WriteMessage(websocket.TextMessage, []byte("[System] Container is currently offline. Press START to boot.\r\n"))
	}

	// 1. Goroutine to stream real Docker logs to the browser WebSocket in real-time
	go func() {
		var cmd *exec.Cmd
		for {
			select {
			case <-ctx.Done():
				if cmd != nil && cmd.Process != nil {
					_ = cmd.Process.Kill()
				}
				return
			default:
				// Check if container exists
				inspectCmd := exec.CommandContext(ctx, "docker", "inspect", containerName)
				if err := inspectCmd.Run(); err != nil {
					// Container doesn't exist yet, wait and retry
					time.Sleep(2 * time.Second)
					continue
				}

				// Container exists! Start tailing logs
				cmd = exec.CommandContext(ctx, "docker", "logs", "-f", "--tail", "100", containerName)
				stdout, err := cmd.StdoutPipe()
				if err != nil {
					time.Sleep(2 * time.Second)
					continue
				}
				cmd.Stderr = cmd.Stdout

				if err := cmd.Start(); err != nil {
					time.Sleep(2 * time.Second)
					continue
				}

				scanner := bufio.NewScanner(stdout)
				for scanner.Scan() {
					text := scanner.Text() + "\r\n"
					if err := ws.WriteMessage(websocket.TextMessage, []byte(text)); err != nil {
						_ = cmd.Process.Kill()
						return
					}
				}
				
				// If logs tailer exited (e.g. container stopped), kill command and loop back to check again
				_ = cmd.Process.Kill()
				time.Sleep(2 * time.Second)
			}
		}
	}()

	// 2. Read loop: Read commands from WebSocket input and execute them inside the container
	for {
		_, msg, err := ws.ReadMessage()
		if err != nil {
			break
		}

		cmdStr := strings.TrimSpace(string(msg))
		if cmdStr == "" {
			continue
		}

		// Echo the entered command to the client console
		_ = ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("$ %s\r\n", cmdStr)))

		// Execute the command dynamically inside the alpine container sandbox
		execCmd := exec.CommandContext(ctx, "docker", "exec", containerName, "sh", "-c", cmdStr)
		out, execErr := execCmd.CombinedOutput()
		if execErr != nil {
			errMsg := fmt.Sprintf("Error executing command: %s\r\n", execErr.Error())
			if len(out) > 0 {
				errMsg = string(out) + "\r\n"
			}
			_ = ws.WriteMessage(websocket.TextMessage, []byte(errMsg))
		} else {
			_ = ws.WriteMessage(websocket.TextMessage, []byte(string(out)))
		}
	}
}
