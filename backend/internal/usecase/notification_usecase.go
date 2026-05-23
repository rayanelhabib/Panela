package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/panella/backend/internal/domain"
)

type notificationUsecase struct {
	repo domain.NotificationRepository
}

func NewNotificationUsecase(r domain.NotificationRepository) domain.NotificationUsecase {
	return &notificationUsecase{repo: r}
}

func (u *notificationUsecase) Add(ctx context.Context, message string, notifType string) (*domain.Notification, error) {
	notif := &domain.Notification{
		ID:        uuid.New().String(),
		Message:   message,
		Type:      notifType,
		CreatedAt: time.Now().Unix(),
		Read:      false,
	}

	err := u.repo.Create(ctx, notif)
	if err != nil {
		return nil, err
	}
	return notif, nil
}

func (u *notificationUsecase) GetActive(ctx context.Context) ([]*domain.Notification, error) {
	return u.repo.GetAll(ctx)
}

func (u *notificationUsecase) ClearAll(ctx context.Context) error {
	return u.repo.MarkAllRead(ctx)
}
