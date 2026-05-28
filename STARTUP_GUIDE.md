# Multimedia Manager Startup Guide

This guide covers everything you need to start the complete full-stack environment for **Multimedia Manager**, including the TanStack web application (Cloud Hub) and the background websocket service (Desktop Daemon).

## Prerequisites

Ensure you have the following installed:

- **Node.js**: (v18 or newer recommended, for general npm commands)
- **Bun**: (v1.0 or newer) - The backend daemon strictly requires Bun for the `bun:sqlite` and ultra-fast dependency resolution.

## 1. Cloud Hub (Web App & Backend Socket)

The `cloud-hub` directory contains both the TanStack Start frontend client and the backend websocket server (using `bun:sqlite` and standard WebSockets).

### Install Dependencies

Open a terminal inside the `cloud-hub` folder:

```bash
cd cloud-hub
npm install
```

### Start the Next-Gen Dev Servers

You can run both the local web portal (Frontend) and the local Socket server concurrently with a single wrapper command:

```bash
npm run dev
```

What this runs behind the scenes:

- `npm run dev:web`: Starts the TanStack Start SSR Vite server (React 19).
- `npm run dev:socket`: Starts the `server/socket.ts` bun backend file.

You can now access your web interface in your browser:

- **Web Portal:** `http://localhost:5173` (or `5174` if `5173` is busy).

## 2. Desktop Daemon (Background Client Process)

The `desktop-daemon` acts as the native endpoint running quietly on user machines.

### Install Dependencies

Open a **new** terminal inside the `desktop-daemon` folder:

```bash
cd desktop-daemon
bun install
```

### Run the Daemon

Start the desktop agent using Bun:

```bash
bun start
```

## Troubleshooting

- **Socket Cannot Connect**: If the Desktop Daemon fails to reach `http://localhost:4000/connect`, ensure you actually ran `npm run dev` in `cloud-hub` (since it spins up the websocket server).
- **SQLite Database Locked**: `bun:sqlite` places its lock files inside `cloud-hub/devices.sqlite`. Make sure it isn't opened by DB viewers continuously.
- **Vite Port Conflicts**: If port 5173 is occupied, Vite will assign the next open port (like 5174 or 5175). Keep an eye on Terminal logs to know which port your app is effectively on.
