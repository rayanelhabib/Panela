<div align="center">
  <h1>=> Panela Game Server Hosting Panel</h1>
  <p>An enterprise-grade, highly scalable backend architecture for game server hosting and management, built with Go (Golang) using Clean Architecture principles.</p>

  <img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</div>

<br />

## 📖 Overview

**Panela** is a robust backend system designed to manage, deploy, and monitor game servers (like Minecraft, CS:GO, etc.) across distributed host nodes. Inspired by industry standards like Pterodactyl, Panela provides a seamless REST API for frontend integration and utilizes asynchronous background workers to handle heavy infrastructure tasks without blocking the main application thread.

The project is structured using pure **Clean Architecture**, ensuring that business logic is completely decoupled from the database, web frameworks, and external APIs.

## ✨ Key Technical Features

- **Asynchronous Task Queue (Redis + Asynq)**: Heavy operations like "Server Installation" are offloaded to background workers via Redis queues, ensuring the API remains lightning-fast and fault-tolerant.
- **Real-Time Console (WebSockets)**: Utilizes `gorilla/websocket` to stream real-time server telemetry and terminal logs bidirectionally between the user and the Daemon.
- **Dynamic Port Allocation**: Intelligent port locking system assigning unique IP/Port combinations across different Node hosts securely.
- **Daemon Orchestration**: Built-in HTTP client adapter to communicate with isolated Docker-based Daemons on physical nodes (START, STOP, RESTART commands).
- **ORM & Migrations**: Fully integrated **GORM** with PostgreSQL, including automatic schema migrations and connection pooling.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Core Language** | Go (Golang) |
| **HTTP Framework** | Gin Web Framework |
| **Database** | PostgreSQL |
| **ORM** | GORM |
| **Message Broker / Queue** | Redis + Asynq |
| **Real-Time Comm.** | Gorilla WebSockets |

## 📂 Architecture (Clean Architecture)

```text
panela/
├── cmd/
│   ├── api/          # Entry point for the REST API & WebSockets
│   └── worker/       # Entry point for the Background Task Consumer
├── internal/
│   ├── domain/       # Core Business Entities (Server, User, Allocation)
│   ├── usecase/      # Application Logic (ServerUsecase, AllocationUsecase)
│   ├── repository/   # Data Access Layer (PostgreSQL Implementations)
│   ├── delivery/     # Controllers (HTTP Handlers & WebSocket upgraders)
│   └── infrastructure/ # External Services (Redis Queue, Daemon HTTP Client)
└── pkg/              # Shared utilities (Logger, DB Connections)
```
=> Getting Started
Prerequisites
Go 1.20+
PostgreSQL
Redis Server
Installation
Clone the repository:

bash
git clone https://github.com/rayanelhabib/Panela.git
cd Panela
Configure Environment: Update your config.yaml with your PostgreSQL and Redis credentials.

Start the API Server:

bash
go run cmd/api/main.go
Note: GORM will automatically migrate the database schema upon startup.

Start the Background Worker: In a separate terminal, start the Asynq worker to process server installations:

bash
go run cmd/worker/main.go
-> Project Goals
This project was developed to demonstrate my capability to design and implement highly concurrent, scalable backend systems suitable for cloud infrastructure and SaaS products. It specifically showcases my readiness for an Ausbildung as a Fachinformatiker für Anwendungsentwicklung in Germany, highlighting my understanding of enterprise software patterns.

Developed with Go & Clean Architecture by Rayan.
