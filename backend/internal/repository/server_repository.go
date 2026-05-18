package repository

import (
	"context"
	"errors"
	"sync"

	"github.com/panella/backend/internal/domain"
)

type serverRepo struct {
	mu      sync.RWMutex
	servers map[string]*domain.Server
}

// NewServerRepository creates a new in-memory server repository
func NewServerRepository() domain.ServerRepository {
	return &serverRepo{
		servers: make(map[string]*domain.Server),
	}
}

func (r *serverRepo) GetByID(ctx context.Context, id string) (*domain.Server, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	server, ok := r.servers[id]
	if !ok {
		return nil, errors.New("server not found")
	}
	return server, nil
}

func (r *serverRepo) GetByOwnerID(ctx context.Context, ownerID string) ([]*domain.Server, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Server
	for _, server := range r.servers {
		if server.OwnerID == ownerID {
			result = append(result, server)
		}
	}
	return result, nil
}

func (r *serverRepo) Create(ctx context.Context, server *domain.Server) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.servers[server.ID] = server
	return nil
}

func (r *serverRepo) Update(ctx context.Context, server *domain.Server) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.servers[server.ID]; !ok {
		return errors.New("server not found")
	}

	r.servers[server.ID] = server
	return nil
}

func (r *serverRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.servers[id]; !ok {
		return errors.New("server not found")
	}

	delete(r.servers, id)
	return nil
}
