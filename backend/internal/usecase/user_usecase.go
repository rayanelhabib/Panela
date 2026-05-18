package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/panella/backend/internal/config"
	"github.com/panella/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type userUsecase struct {
	userRepo domain.UserRepository
	cfg      *config.Config
}

// NewUserUsecase creates a new instance of UserUsecase
func NewUserUsecase(userRepo domain.UserRepository, cfg *config.Config) domain.UserUsecase {
	return &userUsecase{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (u *userUsecase) Register(ctx context.Context, username, email, password string) (*domain.User, error) {
	if email == "" || password == "" || username == "" {
		return nil, errors.New("invalid registration details")
	}

	// Hash the password securely with bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to encrypt password")
	}

	user := &domain.User{
		ID:       uuid.New().String(),
		Email:    email,
		Password: string(hashedPassword),
		Username: username,
		Role:     "client",
	}

	err = u.userRepo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (u *userUsecase) Login(ctx context.Context, email, password string) (string, error) {
	user, err := u.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	// Verify hashed password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	// Generate JWT Token
	claims := jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(time.Hour * time.Duration(u.cfg.JWT.ExpireHours)).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(u.cfg.JWT.Secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (u *userUsecase) GetProfile(ctx context.Context, id string) (*domain.User, error) {
	return u.userRepo.GetByID(ctx, id)
}
