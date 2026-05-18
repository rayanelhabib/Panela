package config

import (
	"github.com/spf13/viper"
)

// Config holds all configuration parameters
type Config struct {
	App      AppConfig      `mapstructure:"app"`
	Database DatabaseConfig `mapstructure:"database"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Docker   DockerConfig   `mapstructure:"docker"`
}

// AppConfig defines application metadata
type AppConfig struct {
	Name string `mapstructure:"name"`
	Env  string `mapstructure:"env"`
	Port int    `mapstructure:"port"`
}

// DatabaseConfig defines database details
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
}

// JWTConfig defines JWT parameters
type JWTConfig struct {
	Secret      string `mapstructure:"secret"`
	ExpireHours int    `mapstructure:"expire_hours"`
}

// DockerConfig defines local docker configurations
type DockerConfig struct {
	Host string `mapstructure:"host"`
}

// LoadConfig reads configurations from yaml file or environment variables
func LoadConfig(path string) (*Config, error) {
	viper.AddConfigPath(path)
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, err
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}
