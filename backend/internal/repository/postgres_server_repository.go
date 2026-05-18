package repository

import (
	"context"
	"errors"

	"github.com/panella/backend/internal/domain"
	"gorm.io/gorm"
)

type postgresServerRepo struct {
	db *gorm.DB
}

// NewPostgresServerRepository creates a new postgres-backed server repository
func NewPostgresServerRepository(db *gorm.DB) domain.ServerRepository {
	return &postgresServerRepo{
		db: db,
	}
}

func (r *postgresServerRepo) GetByID(ctx context.Context, id string) (*domain.Server, error) {
	var server domain.Server
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&server).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("server not found")
		}
		return nil, err
	}
	return &server, nil
}

func (r *postgresServerRepo) GetByOwnerID(ctx context.Context, ownerID string) ([]*domain.Server, error) {
	var servers []*domain.Server
	err := r.db.WithContext(ctx).Where("owner_id = ?", ownerID).Find(&servers).Error
	if err != nil {
		return nil, err
	}
	return servers, nil
}

func (r *postgresServerRepo) Create(ctx context.Context, server *domain.Server) error {
	return r.db.WithContext(ctx).Create(server).Error
}

func (r *postgresServerRepo) Update(ctx context.Context, server *domain.Server) error {
	// Updates all fields
	return r.db.WithContext(ctx).Save(server).Error
}

func (r *postgresServerRepo) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Server{}).Error
}
