<div align="center">
  <h1>🚀 Panella Backend</h1>
  <p><strong>A Next-Generation, Enterprise-Grade Server Hosting Panel (Built with Passion & Clean Architecture)</strong></p>
</div>

---

## 👋 Hey there! Welcome to Panella

If you've ever looked at how complex server hosting panels (for game servers, VPS, or Docker nodes) are built, you know that keeping the code maintainable is an absolute nightmare. That's exactly why I built **Panella**. 

Instead of going with a standard, messy MVC framework where everything is tangled together, I decided from day one to build this entirely in **Go** using strict **Clean (Hexagonal) Architecture**. The result? An incredibly fast, rock-solid backend that handles massive traffic, background jobs, and real-time streaming without breaking a sweat.

This README isn't just a list of commands—it's a deep dive into how and why Panella works the way it does.

---

## 🧠 The Philosophy: Clean Architecture

Before writing a single line of code, the architecture was set in stone. The golden rule here is simple: **Dependencies always point inwards.**

1. **Domain (The Core)**: This is the heart of Panella. It contains our structs (like `User` and `Server`) and interface contracts. It knows absolutely nothing about databases or HTTP.
2. **Usecases (The Brains)**: This is where the business logic lives. When you say "Create a Server," the Usecase orchestrates the checks, the database calls, and the background tasks.
3. **Repository (Data Access)** & **Delivery (HTTP API)**: These are the outer layers. They just implement the contracts defined in the Domain. 

Because of this, if we ever want to swap out our database or our HTTP framework, we only change the outer layers. The core logic remains untouched!

---

## ✨ How the Magic Happens (Key Features & Engineering)

I've pushed this backend from a simple proof-of-concept to a production-ready beast. Here are the major systems driving Panella:

### 🐘 PostgreSQL & GORM
Initially, the project used an in-memory map to store data, but we've completely migrated to **PostgreSQL**.
- I'm using **GORM** to handle the heavy lifting.
- **Auto-Migration:** You don't have to write manual SQL scripts. When the API starts, it reads the Go structs and automatically creates or updates the necessary tables in PostgreSQL.
- Everything is heavily typed with UUIDs as primary keys.

### 🚦 Smart Port Allocation
A game server can't exist without a unique port (like `25565`). 
- When a new server is requested, the `AllocationUsecase` kicks in.
- It scans the database for available, unassigned ports on the target Node.
- It instantly assigns and locks the port so no two servers ever end up fighting for the same IP/Port combo.

### ⚡ Redis & Background Workers (Asynq)
When a user clicks "Install Server," downloading a huge Docker image can take 5 to 10 minutes. We can't freeze the API for that long!
- I integrated **Asynq** (built on top of Redis) to handle queues.
- The API instantly returns a success message to the user, but behind the scenes, it serializes the task into JSON and throws it into a Redis queue.
- A completely separate **Worker** process listens to Redis, catches the task, and simulates the heavy installation process without blocking the main web server.

### 🔌 Real-Time WebSockets
What's a server panel without a live console? 
- I used `gorilla/websocket` to upgrade standard HTTP requests into persistent, two-way WebSocket connections.
- The backend streams live server logs, RAM, and CPU usage directly to the frontend. (Right now, it's a simulated ticker, but it's architected to pipe data straight from the Docker Daemon).

### 🛑 Graceful Shutdowns
If you ever need to restart the backend to apply an update, Panella won't violently cut off a user in the middle of a request. It listens to OS signals (`SIGINT`), stops accepting new requests, finishes whatever it's currently doing (giving it up to 5 seconds), and then shuts down cleanly.

---

## 🛠️ The Tech Stack

- **Language:** Go (1.21+) - Because we need raw speed and concurrency.
- **HTTP Framework:** Gin - For ultra-fast routing.
- **Database:** PostgreSQL (with GORM).
- **Queues:** Redis (with Asynq).
- **Logging:** Uber Zap - For clean, structured, enterprise-grade logs.
- **Config:** Viper - For reading environments without hardcoding credentials.

---

## 🚀 Getting Started

Want to spin this up on your own machine? It's pretty straightforward.

### What you need:
- **Go 1.21+** installed.
- **PostgreSQL** and **Redis** running (using Docker for these is the easiest way).

### Step-by-Step:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/rayanelhabib/Panela.git
   cd Panela
   ```

2. **Set up your config:**
   Open up `configs/config.yaml` and make sure your PostgreSQL and Redis credentials match your local setup.

3. **Start the API:**
   ```bash
   go run cmd/api/main.go
   ```
   *(Watch the terminal—you'll see GORM automatically migrating your database tables and seeding the initial ports!)*

4. **Start the Background Worker:**
   Open a second terminal window and start the worker that handles the Redis queue:
   ```bash
   go run cmd/worker/main.go
   ```

---

## 🔍 Bonus: Codebase Search Tool

Because the Clean Architecture splits things up into many files, I wrote a quick Python script to help you find your way around.

If you want to find exactly where a function (like `CreateServer`) is used, just run:
```bash
python3 search_keyword.py
```
It will prompt you for a keyword and instantly show you every file and line number where it appears.

---

## 🤝 Want to contribute?
I'd love your help! Just remember the golden rule: respect the architecture. Keep the business logic in `usecase/`, keep the database queries in `repository/`, and keep the routing in `delivery/`.

## 📝 License
MIT License. Feel free to use this code to build something awesome.
