package domain

import "context"

// Allocation represents an IP and Port binding for a server
type Allocation struct {
	ID       string `json:"id" gorm:"primaryKey;type:uuid"`
	NodeID   string `json:"node_id" gorm:"not null"`
	IP       string `json:"ip" gorm:"not null"`
	Port     int    `json:"port" gorm:"not null"`
	ServerID *string `json:"server_id" gorm:"type:uuid;default:null"` // null if unassigned
}

type AllocationRepository interface {
	GetAvailablePort(ctx context.Context, nodeID string) (*Allocation, error)
	Assign(ctx context.Context, allocationID string, serverID string) error
	GetByServerID(ctx context.Context, serverID string) ([]*Allocation, error)
	Create(ctx context.Context, allocation *Allocation) error
}

type AllocationUsecase interface {
	AssignPortToServer(ctx context.Context, serverID string, nodeID string) (*Allocation, error)
	GetServerAllocations(ctx context.Context, serverID string) ([]*Allocation, error)
}
