package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response represents a standard HTTP response structure
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

// JSON sends a formatted JSON response
func JSON(c *gin.Context, statusCode int, success bool, message string, data interface{}, err interface{}) {
	c.JSON(statusCode, Response{
		Success: success,
		Message: message,
		Data:    data,
		Error:   err,
	})
}

// OK sends 200 OK standard response
func OK(c *gin.Context, data interface{}, message string) {
	JSON(c, http.StatusOK, true, message, data, nil)
}

// Created sends 201 Created standard response
func Created(c *gin.Context, data interface{}, message string) {
	JSON(c, http.StatusCreated, true, message, data, nil)
}

// BadRequest sends 400 Bad Request standard error
func BadRequest(c *gin.Context, err string) {
	JSON(c, http.StatusBadRequest, false, "Bad Request", nil, err)
}

// InternalServerError sends 500 Internal Server Error standard error
func InternalServerError(c *gin.Context, err string) {
	JSON(c, http.StatusInternalServerError, false, "Internal Server Error", nil, err)
}

// Unauthorized sends 401 Unauthorized standard error
func Unauthorized(c *gin.Context, err string) {
	JSON(c, http.StatusUnauthorized, false, "Unauthorized", nil, err)
}

// NotFound sends 404 Not Found standard error
func NotFound(c *gin.Context, err string) {
	JSON(c, http.StatusNotFound, false, "Not Found", nil, err)
}
