package http

import (
	"fmt"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/pkg/response"
	"github.com/panella/backend/pkg/upload"
)

// UserHandler structures dependency injections for User HTTP endpoints
type UserHandler struct {
	userUsecase domain.UserUsecase
}

// NewUserHandler creates a new user HTTP endpoints delivery handler
func NewUserHandler(u domain.UserUsecase) *UserHandler {
	return &UserHandler{
		userUsecase: u,
	}
}

// RegisterRequest defines body validation structure
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginRequest defines body validation structure
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Register registers a new user
func (h *UserHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.userUsecase.Register(c.Request.Context(), req.Username, req.Email, req.Password)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, user, "User registered successfully")
}

// Login validates user details and returns a JWT token
func (h *UserHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	token, err := h.userUsecase.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	response.OK(c, gin.H{"token": token}, "Login successful")
}

// Profile fetches authenticated user profile
func (h *UserHandler) Profile(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	user, err := h.userUsecase.GetProfile(c.Request.Context(), userID.(string))
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.OK(c, user, "Profile fetched successfully")
}

// UpdateProfileRequest defines body validation structure
type UpdateProfileRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
}

// UpdateProfile updates the public profile details
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.userUsecase.UpdateProfile(c.Request.Context(), userID.(string), req.Username, req.Email)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, user, "Profile updated successfully")
}

// UploadAvatar securely handles avatar file uploads using magic byte verification
func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		response.BadRequest(c, "Avatar file is required in form-data")
		return
	}

	// Validate file securely (max 2MB, strict magic bytes check)
	err = upload.ValidateImageFile(file, 2*1024*1024)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// Generate secure filename
	ext := filepath.Ext(file.Filename)
	newFileName := fmt.Sprintf("avatar_%s%s", userID.(string), ext)
	savePath := filepath.Join("uploads", "avatars", newFileName)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		response.InternalServerError(c, "Failed to save avatar image")
		return
	}

	avatarURL := fmt.Sprintf("/uploads/avatars/%s", newFileName)

	// Save avatar url to database
	_, err = h.userUsecase.UpdateAvatar(c.Request.Context(), userID.(string), avatarURL)
	if err != nil {
		response.InternalServerError(c, "Failed to persist avatar in database")
		return
	}

	response.OK(c, gin.H{"avatar_url": avatarURL}, "Avatar securely uploaded and verified")
}
