package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/panella/backend/internal/domain"
	"github.com/panella/backend/pkg/response"
)

type FileManagerHandler struct {
	usecase      domain.FileManagerUsecase
	notifUsecase domain.NotificationUsecase
}

func NewFileManagerHandler(u domain.FileManagerUsecase, n domain.NotificationUsecase) *FileManagerHandler {
	return &FileManagerHandler{usecase: u, notifUsecase: n}
}

func (h *FileManagerHandler) ListFiles(c *gin.Context) {
	serverID := c.Param("id")
	path := c.Query("path")

	items, err := h.usecase.List(c.Request.Context(), serverID, path)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	response.OK(c, items, "Files listed successfully")
}

func (h *FileManagerHandler) GetFileContent(c *gin.Context) {
	serverID := c.Param("id")
	path := c.Query("path")

	content, err := h.usecase.GetContent(c.Request.Context(), serverID, path)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "File read successfully",
		"data":    content,
	})
}

type SaveFileRequest struct {
	Path    string `json:"path" binding:"required"`
	Content string `json:"content"`
}

func (h *FileManagerHandler) SaveFileContent(c *gin.Context) {
	serverID := c.Param("id")
	var req SaveFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	err := h.usecase.SaveContent(c.Request.Context(), serverID, req.Path, req.Content)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	_, _ = h.notifUsecase.Add(c.Request.Context(), "File "+req.Path+" saved successfully on server "+serverID, "success")
	response.OK(c, nil, "File content saved successfully")
}

type CreateFolderRequest struct {
	Path string `json:"path" binding:"required"`
}

func (h *FileManagerHandler) CreateFolder(c *gin.Context) {
	serverID := c.Param("id")
	var req CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	err := h.usecase.CreateFolder(c.Request.Context(), serverID, req.Path)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	_, _ = h.notifUsecase.Add(c.Request.Context(), "Created directory "+req.Path+" on server "+serverID, "success")
	response.OK(c, nil, "Directory created successfully")
}

func (h *FileManagerHandler) DeleteFile(c *gin.Context) {
	serverID := c.Param("id")
	path := c.Query("path")

	err := h.usecase.Delete(c.Request.Context(), serverID, path)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	_, _ = h.notifUsecase.Add(c.Request.Context(), "Deleted "+path+" on server "+serverID, "warning")
	response.OK(c, nil, "File or folder deleted successfully")
}

type RenameFileRequest struct {
	OldPath string `json:"old_path" binding:"required"`
	NewPath string `json:"new_path" binding:"required"`
}

func (h *FileManagerHandler) RenameFile(c *gin.Context) {
	serverID := c.Param("id")
	var req RenameFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	err := h.usecase.Rename(c.Request.Context(), serverID, req.OldPath, req.NewPath)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, nil, "File or folder renamed successfully")
}

func (h *FileManagerHandler) UploadFile(c *gin.Context) {
	serverID := c.Param("id")
	targetPath := c.PostForm("path")

	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "No file uploaded")
		return
	}

	fileReader, err := file.Open()
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}
	defer fileReader.Close()

	err = h.usecase.SaveUploadedFile(c.Request.Context(), serverID, targetPath, file.Filename, fileReader)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	_, _ = h.notifUsecase.Add(c.Request.Context(), "Uploaded file "+file.Filename+" to server "+serverID, "success")
	response.OK(c, nil, "File uploaded successfully")
}

type UnarchiveFileRequest struct {
	Path string `json:"path" binding:"required"`
}

func (h *FileManagerHandler) UnarchiveFile(c *gin.Context) {
	serverID := c.Param("id")
	var req UnarchiveFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	err := h.usecase.ExtractZip(c.Request.Context(), serverID, req.Path)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	_, _ = h.notifUsecase.Add(c.Request.Context(), "Successfully unarchived ZIP payload "+req.Path+" on server "+serverID, "success")
	response.OK(c, nil, "ZIP archive unarchived successfully")
}
