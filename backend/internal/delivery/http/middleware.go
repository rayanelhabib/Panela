package http

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/panella/backend/internal/config"
	"github.com/panella/backend/pkg/response"
)

// AuthMiddleware intercepts requests to validate JWT authenticity
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Authorization header format must be: Bearer <token>")
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(cfg.JWT.Secret), nil
		})

		if err != nil || !token.Valid {
			response.JSON(c, http.StatusUnauthorized, false, "Unauthorized", nil, "Invalid or expired authorization token")
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			response.Unauthorized(c, "Invalid token claims")
			c.Abort()
			return
		}

		userID, _ := claims["sub"].(string)
		role, _ := claims["role"].(string)

		c.Set("userID", userID)
		c.Set("role", role)

		c.Next()
	}
}
