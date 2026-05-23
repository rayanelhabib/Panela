package domain

import "context"

// User entity model
type User struct {
	ID       string  `json:"id" gorm:"primaryKey;type:uuid"`
	Email    string  `json:"email" gorm:"uniqueIndex;not null"`
	Password string  `json:"-" gorm:"not null"`
	Username string  `json:"username" gorm:"not null"`
	Role     string  `json:"role" gorm:"not null;default:'client'"` // admin, client
	Avatar   *string `json:"avatar"`                                // URL to uploaded avatar
}

// UserRepository defines the persistence contract for Users
type UserRepository interface {
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
}

// UserUsecase defines the business logic contract for Users
type UserUsecase interface {
	Register(ctx context.Context, username, email, password string) (*User, error)
	Login(ctx context.Context, email, password string) (string, error) // Returns token string
	GetProfile(ctx context.Context, id string) (*User, error)
	UpdateProfile(ctx context.Context, id, username, email string) (*User, error)
	UpdateAvatar(ctx context.Context, id, avatarURL string) (*User, error)
}
