package repository

import (
	"context"

	"github.com/panella/backend/internal/domain"
	"gorm.io/gorm"
)

type postgresNotificationRepo struct {
	db *gorm.DB
}

func NewPostgresNotificationRepository(db *gorm.DB) domain.NotificationRepository {
	return &postgresNotificationRepo{db: db}
}

func (r *postgresNotificationRepo) Create(ctx context.Context, notif *domain.Notification) error {
	return r.db.WithContext(ctx).Create(notif).Error
}

func (r *postgresNotificationRepo) GetAll(ctx context.Context) ([]*domain.Notification, error) {
	var notifs []*domain.Notification
	err := r.db.WithContext(ctx).Order("created_at desc").Limit(30).Find(&notifs).Error
	if err != nil {
		return nil, err
	}
	return notifs, nil
}

func (r *postgresNotificationRepo) MarkAllRead(ctx context.Context) error {
	return r.db.WithContext(ctx).Model(&domain.Notification{}).Where("read = ?", false).Update("read", true).Error
}
