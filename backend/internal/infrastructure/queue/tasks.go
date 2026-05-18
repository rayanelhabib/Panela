package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/pkg/logger"
	"go.uber.org/zap"
)

// Task Types
const (
	TypeInstallServer = "server:install"
	TypeSuspendServer = "server:suspend"
)

// TaskPayloadInstallServer defines the payload for an install task
type TaskPayloadInstallServer struct {
	ServerID string `json:"server_id"`
}

// EnqueueInstallServer creates and pushes the install task to Redis
func EnqueueInstallServer(client *asynq.Client, serverID string) error {
	payload, err := json.Marshal(TaskPayloadInstallServer{ServerID: serverID})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeInstallServer, payload)
	
	// Enqueue with a max retry of 3
	info, err := client.Enqueue(task, asynq.MaxRetry(3))
	if err != nil {
		return err
	}

	logger.Info("Enqueued server install task", zap.String("task_id", info.ID), zap.String("queue", info.Queue))
	return nil
}

// HandleInstallServerTask handles the execution of the install task in the worker
func HandleInstallServerTask(serverRepo domain.ServerRepository) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		var p TaskPayloadInstallServer
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
		}

		logger.Info("Worker processing server installation...", zap.String("server_id", p.ServerID))

		// Simulate external installation API call
		time.Sleep(5 * time.Second)

		server, err := serverRepo.GetByID(ctx, p.ServerID)
		if err != nil {
			return err
		}

		server.Status = "stopped" // Server installed and stopped, ready to boot
		err = serverRepo.Update(ctx, server)
		if err != nil {
			return err
		}

		logger.Info("Worker completed server installation!", zap.String("server_id", p.ServerID))
		return nil
	}
}
