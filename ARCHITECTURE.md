# Project Architecture and Stack

## Overview

The Universal Media Controller bridges a mobile-friendly web interface with local desktop hardware execution. It operates through three main components: a frontend UI, a backend signaling hub, and a desktop daemon.

## Tech Stack

### Cloud Hub (Frontend & Backend)

- **Framework**: [TanStack Start](https://tanstack.com/start) with React 18
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **WebSocket Server**: [Socket.io](https://socket.io/) (Runs independently on port `3002`)
- **Authentication**: JWT (JSON Web Tokens)
- **State/Caching**: [Redis](https://redis.io/) and `ioredis` (Used for generating, storing, and validating the 6-digit pairing PINs)
- **Package Manager / Runtime**: [Bun](https://bun.sh/)

### Desktop Daemon (Client)

- **Runtime**: Node.js / Bun
- **WebSocket Client**: `socket.io-client`
- **Hardware Integration**: [`@nut-tree-fork/nut-js`](https://nutjs.dev/) (Simulates native OS media key presses like Volume Up, Volume Down, Play, and Pause)

## Architectural Flow

### 1. System Initialization

1. The **Cloud Hub** launches two processes concurrently:
   - A Vite development server to serve the React PWA.
   - A Node/Bun Socket.io server to listen for WebSocket connections on port `3002`.
2. The **Desktop Daemon** boots up, connects to `ws://localhost:3002`, and requests a pairing PIN.
3. The server generates a unique **6-digit PIN**, associates it with the daemon's socket ID in Redis, and sends the PIN back for the user to see.

### 2. User Authentication & Pairing

1. A user visits the Cloud Hub PWA and signs in, receiving a mock **JWT Token**.
2. The user goes to the `/pair` route and enters the **6-digit PIN** displayed on the desktop daemon.
3. The Cloud Hub validates the PIN against Redis. If successful, it binds the user's JWT ID closely to the daemon's socket ID (or adds them to the same Socket.io Room).

### 3. Remote Control Execution

1. The paired user presses "Volume Up" on the React PWA.
2. The frontend uses `socket.io-client` to emit a `cmd:VolumeUp` event with their JWT auth token.
3. The Cloud Hub WebSocket server receives the command, validates the token, and relays the command to the user's dedicated room.
4. The Desktop Daemon receives the `cmd:VolumeUp` WebSocket event and leverages `@nut-tree-fork/nut-js` to programmatically trigger the system's native Media Volume Up key.

## Folder Structure

```text
multimedia-manager/
├── cloud-hub/
│   ├── src/                 # TanStack Start Route Files (Frontend)
│   │   ├── routes/          # pair.tsx, login.tsx, index.tsx
│   │   ├── router.tsx       # TanStack Router Configuration
│   │   └── routeTree.gen.ts # Auto-generated routes
│   ├── server/              # Backend Services
│   │   └── socket.ts        # Socket.io Server & Redis Routing Logic
│   ├── vite.config.ts       # Vite & Tanstack Configuration
│   └── package.json
│
└── desktop-daemon/
    ├── index.ts             # Daemon core logic (Nut.js & WS Client)
    └── package.json
```
