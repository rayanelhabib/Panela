package daemon

import (
	"context"
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
	time.Sleep(1 * time.Second) // Mocking network call
	return nil
}

func (c *daemonClient) StartServer(ctx context.Context, nodeID, serverID string) error {
	logger.Info("Sending START command to Daemon", zap.String("node", nodeID), zap.String("server", serverID))
	// In production, make a POST to http://<node-ip>:<daemon-port>/api/servers/<id>/power
	// with action="start"
	return nil
}

func (c *daemonClient) StopServer(ctx context.Context, nodeID, serverID string) error {
	logger.Info("Sending STOP command to Daemon", zap.String("node", nodeID), zap.String("server", serverID))
	return nil
}
