package logger

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// Initialize initializes the global structured logger
func Initialize(env string) {
	var config zap.Config

	if env == "production" {
		config = zap.NewProductionConfig()
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	var err error
	Log, err = config.Build(zap.AddCallerSkip(1))
	if err != nil {
		panic("failed to initialize logger: " + err.Error())
	}
}

// Info logs messages at Info level
func Info(message string, fields ...zap.Field) {
	if Log == nil {
		Initialize("development")
	}
	Log.Info(message, fields...)
}

// Error logs messages at Error level
func Error(message string, fields ...zap.Field) {
	if Log == nil {
		Initialize("development")
	}
	Log.Error(message, fields...)
}

// Fatal logs messages at Fatal level and calls os.Exit(1)
func Fatal(message string, fields ...zap.Field) {
	if Log == nil {
		Initialize("development")
	}
	Log.Fatal(message, fields...)
	os.Exit(1)
}

// Warn logs messages at Warn level
func Warn(message string, fields ...zap.Field) {
	if Log == nil {
		Initialize("development")
	}
	Log.Warn(message, fields...)
}

// Debug logs messages at Debug level
func Debug(message string, fields ...zap.Field) {
	if Log == nil {
		Initialize("development")
	}
	Log.Debug(message, fields...)
}
