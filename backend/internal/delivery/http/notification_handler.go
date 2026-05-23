package http

import (
	"github.com/gin-gonic/gin"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/pkg/response"
)

type NotificationHandler struct {
	usecase domain.NotificationUsecase
}

func NewNotificationHandler(u domain.NotificationUsecase) *NotificationHandler {
	return &NotificationHandler{usecase: u}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	notifs, err := h.usecase.GetActive(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, notifs, "Notifications retrieved successfully")
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	err := h.usecase.ClearAll(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, nil, "All notifications marked as read")
}
