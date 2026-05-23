package usecase

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/panella/backend/internal/domain"
)

type fileManagerUsecase struct {
	baseDir string
}

func NewFileManagerUsecase() domain.FileManagerUsecase {
	// Base data dir inside workspace
	baseDir, _ := filepath.Abs("data/servers")
	return &fileManagerUsecase{baseDir: baseDir}
}

// secureJoin secures target path from traversal attacks
func (u *fileManagerUsecase) secureJoin(serverID string, relPath string) (string, error) {
	serverRoot := filepath.Join(u.baseDir, serverID)
	
	// Create folder if it doesn't exist
	if _, err := os.Stat(serverRoot); os.IsNotExist(err) {
		err := os.MkdirAll(serverRoot, 0755)
		if err != nil {
			return "", err
		}
		// Auto-initialize base files so there is ready-to-run content
		defaultJS := `// Panella Game Server Entry
console.log('Server started successfully!');

// Keep container alive for interactive shell console demo
setInterval(() => {
	const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
	console.log("[Runtime Info] Memory Heap Used: " + memUsage + " MB");
}, 10000);
`
		_ = os.WriteFile(filepath.Join(serverRoot, "index.js"), []byte(defaultJS), 0644)
		defaultJSON := `{
  "name": "panella-game-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}`
		_ = os.WriteFile(filepath.Join(serverRoot, "package.json"), []byte(defaultJSON), 0644)

		defaultMD := `# Panella Server Container
Welcome to your brutalist cloud server powered by clean architecture.
`
		_ = os.WriteFile(filepath.Join(serverRoot, "README.md"), []byte(defaultMD), 0644)
	}

	targetPath := filepath.Clean(filepath.Join(serverRoot, relPath))
	if !strings.HasPrefix(targetPath, serverRoot) {
		return "", errors.New("directory traversal attempt blocked")
	}
	return targetPath, nil
}

func (u *fileManagerUsecase) List(ctx context.Context, serverID string, relPath string) ([]*domain.FileItem, error) {
	dirPath, err := u.secureJoin(serverID, relPath)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var items []*domain.FileItem
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		name := entry.Name()
		ext := ""
		if !entry.IsDir() {
			ext = strings.ToLower(filepath.Ext(name))
			if len(ext) > 1 {
				ext = ext[1:] // remove the dot
			}
		}

		// Calculate size format
		sizeStr := "Folder"
		if !entry.IsDir() {
			sizeBytes := info.Size()
			if sizeBytes > 1024*1024 {
				sizeStr = fmt.Sprintf("%.2f MB", float64(sizeBytes)/(1024*1024))
			} else if sizeBytes > 1024 {
				sizeStr = fmt.Sprintf("%.1f KB", float64(sizeBytes)/1024)
			} else {
				sizeStr = fmt.Sprintf("%d B", sizeBytes)
			}
		}

		relItemPath := filepath.Join(relPath, name)
		relItemPath = strings.ReplaceAll(relItemPath, "\\", "/")

		items = append(items, &domain.FileItem{
			Name:       name,
			Path:       relItemPath,
			IsDir:      entry.IsDir(),
			Size:       sizeStr,
			ModifiedAt: info.ModTime().Unix(),
			Extension:  ext,
		})
	}

	// Always return empty slice instead of null
	if items == nil {
		items = []*domain.FileItem{}
	}
	return items, nil
}

func (u *fileManagerUsecase) GetContent(ctx context.Context, serverID string, relPath string) (string, error) {
	filePath, err := u.secureJoin(serverID, relPath)
	if err != nil {
		return "", err
	}

	contentBytes, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(contentBytes), nil
}

func (u *fileManagerUsecase) SaveContent(ctx context.Context, serverID string, relPath string, content string) error {
	filePath, err := u.secureJoin(serverID, relPath)
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, []byte(content), 0644)
}

func (u *fileManagerUsecase) CreateFolder(ctx context.Context, serverID string, relPath string) error {
	folderPath, err := u.secureJoin(serverID, relPath)
	if err != nil {
		return err
	}
	return os.MkdirAll(folderPath, 0755)
}

func (u *fileManagerUsecase) Delete(ctx context.Context, serverID string, relPath string) error {
	targetPath, err := u.secureJoin(serverID, relPath)
	if err != nil {
		return err
	}
	return os.RemoveAll(targetPath)
}

func (u *fileManagerUsecase) Rename(ctx context.Context, serverID string, oldRelPath string, newRelPath string) error {
	oldPath, err := u.secureJoin(serverID, oldRelPath)
	if err != nil {
		return err
	}
	newPath, err := u.secureJoin(serverID, newRelPath)
	if err != nil {
		return err
	}
	return os.Rename(oldPath, newPath)
}

func (u *fileManagerUsecase) SaveUploadedFile(ctx context.Context, serverID string, targetRelPath string, filename string, fileReader io.Reader) error {
	targetDir, err := u.secureJoin(serverID, targetRelPath)
	if err != nil {
		return err
	}

	targetFilePath := filepath.Join(targetDir, filename)
	
	// Create folder structure if it doesn't exist
	_ = os.MkdirAll(filepath.Dir(targetFilePath), 0755)

	out, err := os.Create(targetFilePath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, fileReader)
	return err
}

func (u *fileManagerUsecase) ExtractZip(ctx context.Context, serverID string, zipRelPath string) error {
	zipPath, err := u.secureJoin(serverID, zipRelPath)
	if err != nil {
		return err
	}

	destDir := filepath.Dir(zipPath)

	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		// Prevent Zip Slip vulnerability
		fPath := filepath.Clean(filepath.Join(destDir, f.Name))
		if !strings.HasPrefix(fPath, filepath.Join(u.baseDir, serverID)) {
			return errors.New("zip extraction path traversal attempt")
		}

		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(fPath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fPath), os.ModePerm); err != nil {
			return err
		}

		dstFile, err := os.OpenFile(fPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		srcFile, err := f.Open()
		if err != nil {
			dstFile.Close()
			return err
		}

		_, err = io.Copy(dstFile, srcFile)
		dstFile.Close()
		srcFile.Close()
		if err != nil {
			return err
		}
	}
	return nil
}
