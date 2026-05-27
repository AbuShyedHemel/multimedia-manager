# Universal Media Controller - Bun & TanStack Blueprint

## 1. System Architecture (Optimized)

By leveraging TanStack Start, we can merge the web hosting and the cloud relay into a single full-stack application, simplifying the architecture into two main pieces:

* **The Cloud Hub (Bun + TanStack Start):** Hosted on the public internet. It serves the React PWA, provides API endpoints for JWT authentication and Redis PIN generation, and runs the Socket.io server to route real-time commands.
* **Desktop Daemon (Bun/Node + nut.js):** A lightweight background process running locally on your target machine. It connects to the Cloud Hub via Secure WebSockets (`wss://`), authenticates, and executes whitelisted media commands on the OS.

## 2. The Tech Stack

* **Runtime & Package Manager:** Bun (blazing fast startup and dependency installation).
* **Full-Stack Framework:** TanStack Start (handles SSR, client routing, and backend API routes).
* **Frontend UI:** React.js, Tailwind CSS, `shadcn/ui` (for accessible, premium components like buttons, dialogs, and toast notifications).
* **Real-time Engine:** Socket.io (integrated into the TanStack Start backend).
* **Database & Caching:** MongoDB/MySQL (Auth) + Redis (5-minute TTL pairing PINs).
* **Desktop Automation:** `@nut-tree/nut-js`.

## 3. Execution Plan: Step-by-Step

### Phase 1: The Cloud Hub (Backend & Routing)
1.  Initialize the project using Bun: `bun create @tanstack/react-start my-media-controller`.
2.  Set up API routes within TanStack Start (`/api/auth/login`, `/api/pair/generate`).
3.  Integrate Redis logic in the backend route to generate 6-digit PINs mapped to user IDs with a 300-second TTL.
4.  Attach a Socket.io instance to the underlying Bun/Vite development server (and eventually the production server) to handle incoming WebSocket connections and validate JWTs upon connection.

### Phase 2: The Desktop Daemon
1.  Initialize a separate directory for the daemon using Bun (`bun init`).
2.  Install `socket.io-client` and `@nut-tree/nut-js`.
3.  Implement the WebSocket connection logic, ensuring it passes the JWT token in the auth payload.
4.  Set up the **Whitelist Execution Engine**. Map specific strings (`'cmd:play_pause'`) to `nut.js` hardware triggers. Handle reconnection logic natively.

### Phase 3: The Mobile PWA (Frontend)
1.  Initialize Tailwind CSS and configure `shadcn/ui` in the TanStack Start project.
2.  Build the UI components:
    * **Login Screen:** Using `shadcn/ui` Form and Input components.
    * **Pairing Screen:** Using `shadcn/ui` Input-OTP (One Time Password) component for entering the 6-digit PIN.
    * **Remote Control:** A dark-mode optimized layout with massive, easily tappable media buttons.
3.  Configure the `manifest.json` and a Service Worker to enable PWA installation on iOS/Android.

### Phase 4: The Secure Handshake
1.  User views the generated PIN on their Desktop Daemon terminal/UI.
2.  User inputs the PIN into the Mobile PWA using the `shadcn/ui` OTP component.
3.  The PWA sends the PIN via an API route. If Redis validates it, the server drops the user's mobile socket and desktop socket into a private Socket.io room (`room_<user_id>`).
4.  Button presses on the PWA emit events that the server `.broadcast.to(room)` routes exclusively to the desktop daemon.

## 4. Deployment Strategy

* **Cloud Hub (Dockerized):** Write a `Dockerfile` utilizing the official `oven/bun` image. Run the TanStack Start production build (`bun run build` -> `bun run start`).
* **Infrastructure:** Deploy via Docker Compose on a VPS alongside your Redis container. Use an Nginx or Traefik reverse proxy to handle SSL termination (HTTPS/WSS).
* **Daemon Distribution:** Run locally via `pm2` or Bun's native process manager, or package it into an executable for distribution.
