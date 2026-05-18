package domain

import "context"

// Server entity model
type Server struct {
	ID        string  `json:"id" gorm:"primaryKey;type:uuid"`
	Name      string  `json:"name" gorm:"not null"`
	OwnerID   string  `json:"owner_id" gorm:"type:uuid;not null"`
	NodeID    string  `json:"node_id" gorm:"not null"`
	Status    string  `json:"status" gorm:"not null;default:'installing'"`       // starting, running, stopped, installing
	CPU       float64 `json:"cpu_limit" gorm:"not null"`    // CPU Core allocation
	Memory    int64   `json:"memory_limit" gorm:"not null"` // RAM in MB
	Disk      int64   `json:"disk_limit" gorm:"not null"`   // Disk storage in MB
}

// ServerRepository defines the persistence contract for Servers
type ServerRepository interface {
	GetByID(ctx context.Context, id string) (*Server, error)
	GetByOwnerID(ctx context.Context, ownerID string) ([]*Server, error)
	Create(ctx context.Context, server *Server) error
	Update(ctx context.Context, server *Server) error
	Delete(ctx context.Context, id string) error
}

// ServerUsecase defines the business logic contract for Servers
type ServerUsecase interface {
	CreateServer(ctx context.Context, name, ownerID string, cpu float64, memory, disk int64) (*Server, error)
	GetServer(ctx context.Context, id, requesterID string) (*Server, error)
	GetUserServers(ctx context.Context, userID string) ([]*Server, error)
	StartServer(ctx context.Context, id, requesterID string) error
	StopServer(ctx context.Context, id, requesterID string) error
}
