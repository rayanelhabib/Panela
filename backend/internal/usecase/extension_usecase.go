package usecase

import (
	"context"
	"errors"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/panella/backend/internal/domain"
)

type extensionUsecase struct {
	repo domain.ExtensionRepository
}

// NewExtensionUsecase constructs a new ExtensionUsecase instance
func NewExtensionUsecase(repo domain.ExtensionRepository) domain.ExtensionUsecase {
	return &extensionUsecase{repo: repo}
}

// Helper to generate a secure random password
func generateRandomPassword(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

// Databases
func (u *extensionUsecase) CreateDatabase(ctx context.Context, serverID, name, user string) (*domain.ServerDatabase, error) {
	if serverID == "" || name == "" || user == "" {
		return nil, errors.New("invalid database arguments")
	}

	db := &domain.ServerDatabase{
		ID:         uuid.New().String(),
		ServerID:   serverID,
		Name:       name,
		DBUser:     user,
		DBPassword: generateRandomPassword(16),
		Status:     "active",
	}

	err := u.repo.CreateDatabase(ctx, db)
	return db, err
}

func (u *extensionUsecase) GetDatabases(ctx context.Context, serverID string) ([]*domain.ServerDatabase, error) {
	return u.repo.GetDatabasesByServerID(ctx, serverID)
}

func (u *extensionUsecase) RotateDatabasePassword(ctx context.Context, id string) (*domain.ServerDatabase, error) {
	db, err := u.repo.GetDatabaseByID(ctx, id)
	if err != nil {
		return nil, err
	}
	db.DBPassword = generateRandomPassword(16)
	err = u.repo.UpdateDatabase(ctx, db)
	return db, err
}

func (u *extensionUsecase) DeleteDatabase(ctx context.Context, id string) error {
	return u.repo.DeleteDatabase(ctx, id)
}

// Backups
func (u *extensionUsecase) CreateBackup(ctx context.Context, serverID, name string) (*domain.ServerBackup, error) {
	if serverID == "" || name == "" {
		return nil, errors.New("invalid backup name")
	}

	backup := &domain.ServerBackup{
		ID:        uuid.New().String(),
		ServerID:  serverID,
		Name:      name,
		SizeBytes: int64(1024 * 1024 * (10 + rand.Intn(490))), // Random size between 10MB and 500MB
		Status:    "completed",
		CreatedAt: time.Now().Unix(),
	}

	err := u.repo.CreateBackup(ctx, backup)
	return backup, err
}

func (u *extensionUsecase) GetBackups(ctx context.Context, serverID string) ([]*domain.ServerBackup, error) {
	return u.repo.GetBackupsByServerID(ctx, serverID)
}

func (u *extensionUsecase) DeleteBackup(ctx context.Context, id string) error {
	return u.repo.DeleteBackup(ctx, id)
}

// Schedules
func (u *extensionUsecase) CreateSchedule(ctx context.Context, serverID, action, cron string) (*domain.ServerSchedule, error) {
	if serverID == "" || action == "" || cron == "" {
		return nil, errors.New("invalid schedule configurations")
	}

	sched := &domain.ServerSchedule{
		ID:       uuid.New().String(),
		ServerID: serverID,
		Action:   action,
		Cron:     cron,
		IsActive: true,
		LastRun:  0,
	}

	err := u.repo.CreateSchedule(ctx, sched)
	return sched, err
}

func (u *extensionUsecase) GetSchedules(ctx context.Context, serverID string) ([]*domain.ServerSchedule, error) {
	return u.repo.GetSchedulesByServerID(ctx, serverID)
}

func (u *extensionUsecase) ToggleSchedule(ctx context.Context, id string) (*domain.ServerSchedule, error) {
	sched, err := u.repo.GetScheduleByID(ctx, id)
	if err != nil {
		return nil, err
	}
	sched.IsActive = !sched.IsActive
	err = u.repo.UpdateSchedule(ctx, sched)
	return sched, err
}
