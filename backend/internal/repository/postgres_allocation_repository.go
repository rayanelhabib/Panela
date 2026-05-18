package repository

import (
	"context"
	"errors"

	"github.com/panella/backend/internal/domain"
	"gorm.io/gorm"
)

type postgresAllocationRepo struct {
	db *gorm.DB
}

// NewPostgresAllocationRepository creates a new postgres-backed allocation repository
func NewPostgresAllocationRepository(db *gorm.DB) domain.AllocationRepository {
	return &postgresAllocationRepo{
		db: db,
	}
}

func (r *postgresAllocationRepo) GetAvailablePort(ctx context.Context, nodeID string) (*domain.Allocation, error) {
	var alloc domain.Allocation
	err := r.db.WithContext(ctx).
		Where("node_id = ? AND server_id IS NULL", nodeID).
		First(&alloc).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("no available ports on this node")
		}
		return nil, err
	}
	return &alloc, nil
}

func (r *postgresAllocationRepo) Assign(ctx context.Context, allocationID string, serverID string) error {
	return r.db.WithContext(ctx).
		Model(&domain.Allocation{}).
		Where("id = ?", allocationID).
		Update("server_id", serverID).Error
}

func (r *postgresAllocationRepo) GetByServerID(ctx context.Context, serverID string) ([]*domain.Allocation, error) {
	var allocs []*domain.Allocation
	err := r.db.WithContext(ctx).Where("server_id = ?", serverID).Find(&allocs).Error
	if err != nil {
		return nil, err
	}
	return allocs, nil
}

func (r *postgresAllocationRepo) Create(ctx context.Context, allocation *domain.Allocation) error {
	return r.db.WithContext(ctx).Create(allocation).Error
}
