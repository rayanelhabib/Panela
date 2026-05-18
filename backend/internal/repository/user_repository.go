package repository

import (
	"context"
	"errors"
	"sync"

	"github.com/panella/backend/internal/domain"
)

type userRepo struct {
	mu    sync.RWMutex
	users map[string]*domain.User
}

// NewUserRepository creates a new in-memory user repository
func NewUserRepository() domain.UserRepository {
	return &userRepo{
		users: make(map[string]*domain.User),
	}
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, ok := r.users[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (r *userRepo) Create(ctx context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if already exists
	for _, u := range r.users {
		if u.Email == user.Email {
			return errors.New("user already exists with this email")
		}
	}

	r.users[user.ID] = user
	return nil
}
