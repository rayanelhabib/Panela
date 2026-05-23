package usecase

import (
	"context"

	"github.com/panella/backend/internal/domain"
)

type allocationUsecase struct {
	allocRepo domain.AllocationRepository
}

// NewAllocationUsecase creates a new instance of AllocationUsecase
func NewAllocationUsecase(allocRepo domain.AllocationRepository) domain.AllocationUsecase {
	return &allocationUsecase{
		allocRepo: allocRepo,
	}
}

func (u *allocationUsecase) AssignPortToServer(ctx context.Context, serverID string, nodeID string) (*domain.Allocation, error) {
	// Find available port
	alloc, err := u.allocRepo.GetAvailablePort(ctx, nodeID)
	if err != nil {
		return nil, err
	}

	// Assign it
	err = u.allocRepo.Assign(ctx, alloc.ID, serverID)
	if err != nil {
		return nil, err
	}

	alloc.ServerID = &serverID
	return alloc, nil
}

func (u *allocationUsecase) GetServerAllocations(ctx context.Context, serverID string) ([]*domain.Allocation, error) {
	return u.allocRepo.GetByServerID(ctx, serverID)
}

func (u *allocationUsecase) ReleaseServerAllocations(ctx context.Context, serverID string) error {
	return u.allocRepo.ReleaseAllByServerID(ctx, serverID)
}
