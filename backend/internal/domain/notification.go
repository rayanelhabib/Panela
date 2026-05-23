package domain

import "context"

type Notification struct {
	ID        string `json:"id" gorm:"primaryKey;type:uuid"`
	Message   string `json:"message" gorm:"not null"`
	Type      string `json:"type" gorm:"not null"` // info, success, warning, error
	CreatedAt int64  `json:"created_at" gorm:"not null"`
	Read      bool   `json:"read" gorm:"default:false"`
}

type NotificationRepository interface {
	Create(ctx context.Context, notif *Notification) error
	GetAll(ctx context.Context) ([]*Notification, error)
	MarkAllRead(ctx context.Context) error
}

type NotificationUsecase interface {
	Add(ctx context.Context, message string, notifType string) (*Notification, error)
	GetActive(ctx context.Context) ([]*Notification, error)
	ClearAll(ctx context.Context) error
}
