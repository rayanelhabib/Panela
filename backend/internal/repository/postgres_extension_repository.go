package repository

import (
	"context"

	"github.com/panella/backend/internal/domain"
	"gorm.io/gorm"
)

type postgresExtensionRepo struct {
	db *gorm.DB
}

// NewPostgresExtensionRepository initializes a GORM extension repository
func NewPostgresExtensionRepository(db *gorm.DB) domain.ExtensionRepository {
	return &postgresExtensionRepo{db: db}
}

// Databases
func (r *postgresExtensionRepo) CreateDatabase(ctx context.Context, db *domain.ServerDatabase) error {
	return r.db.WithContext(ctx).Create(db).Error
}

func (r *postgresExtensionRepo) GetDatabasesByServerID(ctx context.Context, serverID string) ([]*domain.ServerDatabase, error) {
	var dbs []*domain.ServerDatabase
	err := r.db.WithContext(ctx).Where("server_id = ?", serverID).Find(&dbs).Error
	return dbs, err
}

func (r *postgresExtensionRepo) GetDatabaseByID(ctx context.Context, id string) (*domain.ServerDatabase, error) {
	var db domain.ServerDatabase
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&db).Error
	return &db, err
}

func (r *postgresExtensionRepo) DeleteDatabase(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.ServerDatabase{}).Error
}

func (r *postgresExtensionRepo) UpdateDatabase(ctx context.Context, db *domain.ServerDatabase) error {
	return r.db.WithContext(ctx).Save(db).Error
}

// Backups
func (r *postgresExtensionRepo) CreateBackup(ctx context.Context, backup *domain.ServerBackup) error {
	return r.db.WithContext(ctx).Create(backup).Error
}

func (r *postgresExtensionRepo) GetBackupsByServerID(ctx context.Context, serverID string) ([]*domain.ServerBackup, error) {
	var backups []*domain.ServerBackup
	err := r.db.WithContext(ctx).Where("server_id = ?", serverID).Find(&backups).Error
	return backups, err
}

func (r *postgresExtensionRepo) DeleteBackup(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.ServerBackup{}).Error
}

// Schedules
func (r *postgresExtensionRepo) CreateSchedule(ctx context.Context, sched *domain.ServerSchedule) error {
	return r.db.WithContext(ctx).Create(sched).Error
}

func (r *postgresExtensionRepo) GetSchedulesByServerID(ctx context.Context, serverID string) ([]*domain.ServerSchedule, error) {
	var schedules []*domain.ServerSchedule
	err := r.db.WithContext(ctx).Where("server_id = ?", serverID).Find(&schedules).Error
	return schedules, err
}

func (r *postgresExtensionRepo) GetScheduleByID(ctx context.Context, id string) (*domain.ServerSchedule, error) {
	var sched domain.ServerSchedule
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&sched).Error
	return &sched, err
}

func (r *postgresExtensionRepo) UpdateSchedule(ctx context.Context, sched *domain.ServerSchedule) error {
	return r.db.WithContext(ctx).Save(sched).Error
}
