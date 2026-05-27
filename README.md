# Universal Media Controller

A remote media controller application that allows you to control your desktop media playback (play/pause, volume up/down, etc.) from a web-based mobile app via WebSockets.

## Prerequisites

- **Bun**: This project uses Bun as the package manager and runtime.
- **Node.js**: Compatible with modern Node.js environments.
- **Redis**: A running Redis server (default port 6379) is required for the pairing system.

## Project Structure

- `/cloud-hub`: The web application (TanStack Start + React) and the WebSocket signaling server (Socket.io).
- `/desktop-daemon`: The local daemon that runs on your computer to execute hardware media keys using `@nut-tree-fork/nut-js`.

## How to Start the Project

### 1. Start Redis

Make sure your local Redis server is up and running.

```bash
redis-server
```

### 2. Start the Cloud Hub (Web + Socket Server)

Open a terminal and navigate to the `cloud-hub` directory:

```bash
cd cloud-hub
bun install
bun run dev
```

_This will concurrently start the Vite (React frontend) dev server (typically on `http://localhost:5173` or `5175`) and the Socket.io backend server (on port `3002`)._

### 3. Start the Desktop Daemon

Open a new terminal window and navigate to the `desktop-daemon` directory:

```bash
cd desktop-daemon
bun install
bun run index.ts
```

_The daemon will print a 6-digit pairing PIN in the terminal._

### 4. Connect and Pair

1. Open your browser and navigate to the Cloud Hub URL (e.g., `http://localhost:5175`).
2. Log in with any username and password (handled by mocked JWT).
3. Navigate to the Pairing screen and enter the **6-digit PIN** displayed in the Desktop Daemon's terminal.
4. Once paired, use the on-screen controls to control your desktop media!
