package domain

import "context"

// ServerDatabase entity model
type ServerDatabase struct {
	ID         string `json:"id" gorm:"primaryKey;type:uuid"`
	ServerID   string `json:"server_id" gorm:"type:uuid;not null"`
	Name       string `json:"name" gorm:"not null"`
	DBUser     string `json:"db_user" gorm:"not null"`
	DBPassword string `json:"db_password" gorm:"not null"`
	Status     string `json:"status" gorm:"not null;default:'active'"`
}

// ServerBackup entity model
type ServerBackup struct {
	ID        string `json:"id" gorm:"primaryKey;type:uuid"`
	ServerID  string `json:"server_id" gorm:"type:uuid;not null"`
	Name      string `json:"name" gorm:"not null"`
	SizeBytes int64  `json:"size_bytes" gorm:"not null"`
	Status    string `json:"status" gorm:"not null;default:'completed'"` // pending, completed, restoring
	CreatedAt int64  `json:"created_at" gorm:"not null"`
}

// ServerSchedule entity model
type ServerSchedule struct {
	ID       string `json:"id" gorm:"primaryKey;type:uuid"`
	ServerID string `json:"server_id" gorm:"type:uuid;not null"`
	Action   string `json:"action" gorm:"not null"` // start, stop, restart, backup
	Cron     string `json:"cron" gorm:"not null"`
	IsActive bool   `json:"is_active" gorm:"not null;default:true"`
	LastRun  int64  `json:"last_run"`
}

// ExtensionRepository defines the persistence contract for extension structures
type ExtensionRepository interface {
	// Databases
	CreateDatabase(ctx context.Context, db *ServerDatabase) error
	GetDatabasesByServerID(ctx context.Context, serverID string) ([]*ServerDatabase, error)
	GetDatabaseByID(ctx context.Context, id string) (*ServerDatabase, error)
	DeleteDatabase(ctx context.Context, id string) error
	UpdateDatabase(ctx context.Context, db *ServerDatabase) error

	// Backups
	CreateBackup(ctx context.Context, backup *ServerBackup) error
	GetBackupsByServerID(ctx context.Context, serverID string) ([]*ServerBackup, error)
	DeleteBackup(ctx context.Context, id string) error

	// Schedules
	CreateSchedule(ctx context.Context, sched *ServerSchedule) error
	GetSchedulesByServerID(ctx context.Context, serverID string) ([]*ServerSchedule, error)
	GetScheduleByID(ctx context.Context, id string) (*ServerSchedule, error)
	UpdateSchedule(ctx context.Context, sched *ServerSchedule) error
}

// ExtensionUsecase defines the business logic contract for extensions
type ExtensionUsecase interface {
	CreateDatabase(ctx context.Context, serverID, name, user string) (*ServerDatabase, error)
	GetDatabases(ctx context.Context, serverID string) ([]*ServerDatabase, error)
	RotateDatabasePassword(ctx context.Context, id string) (*ServerDatabase, error)
	DeleteDatabase(ctx context.Context, id string) error

	CreateBackup(ctx context.Context, serverID, name string) (*ServerBackup, error)
	GetBackups(ctx context.Context, serverID string) ([]*ServerBackup, error)
	DeleteBackup(ctx context.Context, id string) error

	CreateSchedule(ctx context.Context, serverID, action, cron string) (*ServerSchedule, error)
	GetSchedules(ctx context.Context, serverID string) ([]*ServerSchedule, error)
	ToggleSchedule(ctx context.Context, id string) (*ServerSchedule, error)
}
