├── cmd/                        # Main applications for this project
│   ├── api/                    # Main HTTP/REST API server entry point
│   │   └── main.go             
│   └── worker/                 # Background job processor (for async tasks like server installation, backups)
│       └── main.go
├── internal/                   # Private application and library code
│   ├── config/                 # Configuration loading (e.g., using Viper to read env vars or config.yml)
│   ├── domain/                 # Entities & Core Data Models (e.g., User, Server, Node, Allocation) + Interfaces
│   ├── usecase/                # Business Logic (e.g., ProvisionServer, SuspendUser, ResetPassword)
│   ├── repository/             # Data Access Implementations (e.g., PostgreSQL for data, Redis for caching)
│   ├── delivery/               # Handlers / Controllers
│   │   ├── http/               # REST API endpoints (used by the frontend dashboard)
│   │   ├── grpc/               # Fast internal communication (optional, good for panel-to-node communication)
│   │   └── websocket/          # Real-time console logs and server stats (vital for a hosting panel)
│   ├── infrastructure/         # External Adapters (renamed from 'platform' for clarity)
│   │   ├── daemon/             # Client to communicate with the remote agent/daemon on the host nodes
│   │   ├── docker/             # Direct Docker API integration (if the panel manages local docker directly)
│   │   ├── proxmox/            # Proxmox API integration (for VPS management)
│   │   └── queue/              # Message Queue implementation (RabbitMQ, Redis for async jobs)
│   └── middleware/             # HTTP middlewares (Auth, Logging, Rate Limiting, CORS)
├── pkg/                        # Reusable libraries that could potentially be used by other projects
│   ├── logger/                 # Structured logging utility
│   ├── jwt/                    # JWT token generation and validation
│   └── response/               # Standardized API JSON response helpers
├── migrations/                 # SQL database migration files (e.g., for golang-migrate or goose)
├── configs/                    # Default configuration templates (e.g., config.example.yml)
├── docker/                     # Dockerfiles and docker-compose files for local development (DB, Redis, etc.)
├── scripts/                    # Useful bash/powershell scripts for development
├── Makefile                    # Make targets for easy building, testing, and running
└── go.mod                      # Go module dependencies
