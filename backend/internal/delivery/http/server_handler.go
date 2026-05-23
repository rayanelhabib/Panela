package http

import (
	"github.com/gin-gonic/gin"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/pkg/response"
)

// ServerHandler structures dependency injections for Server HTTP endpoints
type ServerHandler struct {
	serverUsecase domain.ServerUsecase
}

// NewServerHandler creates a new server HTTP endpoints delivery handler
func NewServerHandler(s domain.ServerUsecase) *ServerHandler {
	return &ServerHandler{
		serverUsecase: s,
	}
}

// CreateServerRequest defines body validation structure
type CreateServerRequest struct {
	Name   string  `json:"name" binding:"required,min=3,max=64"`
	CPU    float64 `json:"cpu_limit" binding:"required,min=0.5"`
	Memory int64   `json:"memory_limit" binding:"required,min=128"` // in MB
	Disk   int64   `json:"disk_limit" binding:"required,min=1024"`  // in MB
}

// Create initializes game server or VPS creation
func (h *ServerHandler) Create(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	var req CreateServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	server, err := h.serverUsecase.CreateServer(c.Request.Context(), req.Name, userID.(string), req.CPU, req.Memory, req.Disk)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, server, "Server creation initialized")
}

// Get fetches detailed information of a single server
func (h *ServerHandler) Get(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Server ID parameter is required")
		return
	}

	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	server, err := h.serverUsecase.GetServer(c.Request.Context(), id, userID.(string))
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.OK(c, server, "Server details fetched successfully")
}

// ListMy lists servers owned by the authenticated user
func (h *ServerHandler) ListMy(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	servers, err := h.serverUsecase.GetUserServers(c.Request.Context(), userID.(string))
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, servers, "User servers fetched successfully")
}

// Start dispatches a command to boot the VM/Container
func (h *ServerHandler) Start(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Server ID parameter is required")
		return
	}

	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	err := h.serverUsecase.StartServer(c.Request.Context(), id, userID.(string))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, nil, "Server process start initialized")
}

// Stop dispatches a command to shut down the VM/Container
func (h *ServerHandler) Stop(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Server ID parameter is required")
		return
	}

	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	err := h.serverUsecase.StopServer(c.Request.Context(), id, userID.(string))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, nil, "Server stopped successfully")
}

// Delete deprovisions and completely terminates a game server or VPS
func (h *ServerHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Server ID parameter is required")
		return
	}

	userID, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "Invalid token context")
		return
	}

	err := h.serverUsecase.DeleteServer(c.Request.Context(), id, userID.(string))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, nil, "Server successfully deprovisioned")
}
