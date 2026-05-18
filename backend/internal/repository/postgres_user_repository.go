package repository

import (
	"context"
	"errors"

	"github.com/panella/backend/internal/domain"
	"gorm.io/gorm"
)

type postgresUserRepo struct {
	db *gorm.DB
}

// NewPostgresUserRepository creates a new postgres-backed user repository
func NewPostgresUserRepository(db *gorm.DB) domain.UserRepository {
	return &postgresUserRepo{
		db: db,
	}
}

func (r *postgresUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresUserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresUserRepo) Create(ctx context.Context, user *domain.User) error {
	err := r.db.WithContext(ctx).Create(user).Error
	if err != nil {
		// A simple check for unique violation in GORM
		return err // In production, wrap postgres unique constraint errors explicitly
	}
	return nil
}
