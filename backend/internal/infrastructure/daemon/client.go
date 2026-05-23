package daemon

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/panella/backend/pkg/logger"
	"go.uber.org/zap"
)

// DaemonClient is responsible for communicating with remote Nodes (e.g. Wings)
type DaemonClient interface {
	InstallServer(ctx context.Context, nodeID, serverID string) error
	StartServer(ctx context.Context, nodeID, serverID string) error
	StopServer(ctx context.Context, nodeID, serverID string) error
}

type daemonClient struct {
	// httpClient *http.Client
}

// NewDaemonClient initializes a new daemon HTTP client
func NewDaemonClient() DaemonClient {
	return &daemonClient{}
}

func (c *daemonClient) InstallServer(ctx context.Context, nodeID, serverID string) error {
	logger.Info("Sending INSTALL command to Daemon", zap.String("node", nodeID), zap.String("server", serverID))
	// Pull Node Alpine image to act as virtual server runtime sandbox
	_ = exec.CommandContext(ctx, "docker", "pull", "node:alpine").Run()
	time.Sleep(1 * time.Second)
	return nil
}

func (c *daemonClient) StartServer(ctx context.Context, nodeID, serverID string) error {
	logger.Info("Sending START command to Daemon", zap.String("node", nodeID), zap.String("server", serverID))
	
	containerName := fmt.Sprintf("panella-server-%s", serverID)
	// Check if container already exists
	cmdCheck := exec.CommandContext(ctx, "docker", "ps", "-a", "--filter", "name="+containerName, "--format", "{{.Names}}")
	output, err := cmdCheck.Output()
	
	// Get absolute path of the server's data folder on the host
	hostPath, _ := filepath.Abs(filepath.Join("data", "servers", serverID))
	_ = os.MkdirAll(hostPath, 0755)

	if err == nil && strings.Contains(string(output), containerName) {
		// Container exists, start it
		_ = exec.CommandContext(ctx, "docker", "start", containerName).Run()
	} else {
		// Run new background container mounting hostPath as /app and running "node index.js"
		_ = exec.CommandContext(ctx, "docker", "run", "-d", "--name", containerName, "-v", hostPath+":/app", "-w", "/app", "node:alpine", "node", "index.js").Run()
	}
	return nil
}

func (c *daemonClient) StopServer(ctx context.Context, nodeID, serverID string) error {
	logger.Info("Sending STOP command to Daemon", zap.String("node", nodeID), zap.String("server", serverID))
	containerName := fmt.Sprintf("panella-server-%s", serverID)
	_ = exec.CommandContext(ctx, "docker", "stop", containerName).Run()
	return nil
}
