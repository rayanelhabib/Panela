package upload

import (
	"errors"
	"mime/multipart"
	"net/http"
)

var (
	ErrFileTooLarge = errors.New("file size exceeds the maximum limit")
	ErrInvalidType  = errors.New("invalid file type, only images are allowed")
)

// ValidateImageFile strictly checks if an uploaded file is a valid image
// It reads the magic bytes and does not rely on the file extension
func ValidateImageFile(fileHeader *multipart.FileHeader, maxSize int64) error {
	if fileHeader.Size > maxSize {
		return ErrFileTooLarge
	}

	file, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer file.Close()

	// Read first 512 bytes for magic bytes sniffing
	buffer := make([]byte, 512)
	_, err = file.Read(buffer)
	if err != nil {
		return err
	}

	// Reset file pointer back to start
	_, err = file.Seek(0, 0)
	if err != nil {
		return err
	}

	// Detect content type
	contentType := http.DetectContentType(buffer)
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		return ErrInvalidType
	}

	return nil
}
