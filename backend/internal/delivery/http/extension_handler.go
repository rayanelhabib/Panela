package http

import (
	"github.com/gin-gonic/gin"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/pkg/response"
)

// ExtensionHandler handles requests for Databases, Backups, and Schedules
type ExtensionHandler struct {
	usecase domain.ExtensionUsecase
}

// NewExtensionHandler constructs a new ExtensionHandler
func NewExtensionHandler(u domain.ExtensionUsecase) *ExtensionHandler {
	return &ExtensionHandler{usecase: u}
}

// Databases Requests
type CreateDBRequest struct {
	Name string `json:"name" binding:"required"`
	User string `json:"db_user" binding:"required"`
}

func (h *ExtensionHandler) CreateDatabase(c *gin.Context) {
	serverID := c.Param("id")
	var req CreateDBRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	db, err := h.usecase.CreateDatabase(c.Request.Context(), serverID, req.Name, req.User)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, db, "Database created successfully")
}

func (h *ExtensionHandler) ListDatabases(c *gin.Context) {
	serverID := c.Param("id")
	dbs, err := h.usecase.GetDatabases(c.Request.Context(), serverID)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, dbs, "Databases fetched successfully")
}

func (h *ExtensionHandler) RotatePassword(c *gin.Context) {
	dbID := c.Param("db_id")
	db, err := h.usecase.RotateDatabasePassword(c.Request.Context(), dbID)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, db, "Database password rotated successfully")
}

func (h *ExtensionHandler) DeleteDatabase(c *gin.Context) {
	dbID := c.Param("db_id")
	err := h.usecase.DeleteDatabase(c.Request.Context(), dbID)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, nil, "Database deleted successfully")
}

// Backups Requests
type CreateBackupRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *ExtensionHandler) CreateBackup(c *gin.Context) {
	serverID := c.Param("id")
	var req CreateBackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	backup, err := h.usecase.CreateBackup(c.Request.Context(), serverID, req.Name)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, backup, "Backup created successfully")
}

func (h *ExtensionHandler) ListBackups(c *gin.Context) {
	serverID := c.Param("id")
	backups, err := h.usecase.GetBackups(c.Request.Context(), serverID)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, backups, "Backups fetched successfully")
}

func (h *ExtensionHandler) DeleteBackup(c *gin.Context) {
	backupID := c.Param("backup_id")
	err := h.usecase.DeleteBackup(c.Request.Context(), backupID)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, nil, "Backup deleted successfully")
}

// Schedules Requests
type CreateScheduleRequest struct {
	Action string `json:"action" binding:"required"`
	Cron   string `json:"cron" binding:"required"`
}

func (h *ExtensionHandler) CreateSchedule(c *gin.Context) {
	serverID := c.Param("id")
	var req CreateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	sched, err := h.usecase.CreateSchedule(c.Request.Context(), serverID, req.Action, req.Cron)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, sched, "Schedule created successfully")
}

func (h *ExtensionHandler) ListSchedules(c *gin.Context) {
	serverID := c.Param("id")
	schedules, err := h.usecase.GetSchedules(c.Request.Context(), serverID)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, schedules, "Schedules fetched successfully")
}

func (h *ExtensionHandler) ToggleSchedule(c *gin.Context) {
	schedID := c.Param("sched_id")
	sched, err := h.usecase.ToggleSchedule(c.Request.Context(), schedID)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, sched, "Schedule status toggled successfully")
}
