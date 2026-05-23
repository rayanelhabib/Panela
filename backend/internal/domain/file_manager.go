package domain

import (
	"context"
	"io"
)

type FileItem struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	IsDir      bool   `json:"is_dir"`
	Size       string `json:"size"`
	ModifiedAt int64  `json:"modified_at"`
	Extension  string `json:"extension"`
}

type FileManagerUsecase interface {
	List(ctx context.Context, serverID string, relPath string) ([]*FileItem, error)
	GetContent(ctx context.Context, serverID string, relPath string) (string, error)
	SaveContent(ctx context.Context, serverID string, relPath string, content string) error
	CreateFolder(ctx context.Context, serverID string, relPath string) error
	Delete(ctx context.Context, serverID string, relPath string) error
	Rename(ctx context.Context, serverID string, oldRelPath string, newRelPath string) error
	SaveUploadedFile(ctx context.Context, serverID string, targetRelPath string, filename string, fileReader io.Reader) error
	ExtractZip(ctx context.Context, serverID string, zipRelPath string) error
}
