package usecase

import (
	"context"
	"errors"


	"github.com/hibiken/asynq"
	"github.com/google/uuid"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/internal/infrastructure/daemon"
	"github.com/panella/backend/internal/infrastructure/queue"
	"github.com/panella/backend/pkg/logger"
	"go.uber.org/zap"
)

type serverUsecase struct {
	serverRepo   domain.ServerRepository
	allocUsecase domain.AllocationUsecase
	asynqClient  *asynq.Client
	daemonClient daemon.DaemonClient
}

// NewServerUsecase creates a new instance of ServerUsecase
func NewServerUsecase(serverRepo domain.ServerRepository, allocUsecase domain.AllocationUsecase, asynqClient *asynq.Client, daemonClient daemon.DaemonClient) domain.ServerUsecase {
	return &serverUsecase{
		serverRepo:   serverRepo,
		allocUsecase: allocUsecase,
		asynqClient:  asynqClient,
		daemonClient: daemonClient,
	}
}

func (u *serverUsecase) CreateServer(ctx context.Context, name, ownerID string, cpu float64, memory, disk int64) (*domain.Server, error) {
	if name == "" || ownerID == "" {
		return nil, errors.New("invalid server arguments")
	}

	server := &domain.Server{
		ID:          uuid.New().String(),
		Name:        name,
		OwnerID:     ownerID,
		NodeID:      "node-1", // default local node identifier
		Status:      "installing",
		CPU:         cpu,
		Memory:      memory,
		Disk:        disk,
	}

	err := u.serverRepo.Create(ctx, server)
	if err != nil {
		return nil, err
	}

	// Try to assign a port
	_, err = u.allocUsecase.AssignPortToServer(ctx, server.ID, server.NodeID)
	if err != nil {
		logger.Warn("Failed to assign port immediately", zap.Error(err), zap.String("server_id", server.ID))
	}

	// Dispatch background task via Redis Queue (Asynq)
	err = queue.EnqueueInstallServer(u.asynqClient, server.ID)
	if err != nil {
		logger.Error("Failed to enqueue install task", zap.Error(err))
	}

	return server, nil
}

func (u *serverUsecase) GetServer(ctx context.Context, id, requesterID string) (*domain.Server, error) {
	server, err := u.serverRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	if server.OwnerID != requesterID {
		return nil, errors.New("forbidden: you do not own this server")
	}
	
	return server, nil
}

func (u *serverUsecase) GetUserServers(ctx context.Context, userID string) ([]*domain.Server, error) {
	return u.serverRepo.GetByOwnerID(ctx, userID)
}

func (u *serverUsecase) StartServer(ctx context.Context, id, requesterID string) error {
	server, err := u.GetServer(ctx, id, requesterID)
	if err != nil {
		return err
	}

	if server.Status == "running" {
		return errors.New("server is already running")
	}

	server.Status = "starting"
	_ = u.serverRepo.Update(ctx, server)

	// Call remote daemon
	err = u.daemonClient.StartServer(ctx, server.NodeID, server.ID)
	if err != nil {
		logger.Error("Failed to send start command to daemon", zap.Error(err))
		return errors.New("daemon communication failed")
	}

	server.Status = "running"
	return u.serverRepo.Update(ctx, server)
}

func (u *serverUsecase) StopServer(ctx context.Context, id, requesterID string) error {
	server, err := u.GetServer(ctx, id, requesterID)
	if err != nil {
		return err
	}

	if server.Status == "stopped" {
		return errors.New("server is already stopped")
	}

	err = u.daemonClient.StopServer(ctx, server.NodeID, server.ID)
	if err != nil {
		logger.Error("Failed to send stop command to daemon", zap.Error(err))
		return errors.New("daemon communication failed")
	}

	server.Status = "stopped"
	return u.serverRepo.Update(ctx, server)
}
