import { io } from "socket.io-client";
import { keyboard, Key } from "@nut-tree-fork/nut-js";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

dotenv.config();

const CLOUD_HUB_URL = process.env.CLOUD_HUB_URL || "http://localhost:3002";

console.log("Connecting to Cloud Hub at:", CLOUD_HUB_URL);

const socket = io(CLOUD_HUB_URL, {
  auth: {
    type: "daemon",
  },
});

socket.on("connect", () => {
  console.log("Connected to Cloud Hub with ID:", socket.id);
  // Send an initial status report once connected
  setTimeout(() => {
    reportStatus().catch(() => {});
  }, 300);
  // Also start periodic status reporting every 2s
  const interval = setInterval(() => {
    reportStatus().catch(() => {});
  }, 2000);

  socket.on("disconnect", () => {
    clearInterval(interval);
  });
});

socket.on("registered", (data: { pin: string }) => {
  console.log("\n==================================");
  console.log(`📡 DAEMON PIN: ${data.pin}`);
  console.log("Enter this PIN on your Cloud Hub web interface to pair.");
  console.log("==================================\n");
});

socket.on("disconnect", () => {
  console.log("Disconnected from Cloud Hub. Connection lost.");
});

socket.on("cmd:play_pause", async () => {
  console.log("▶️  Received cmd:play_pause - Toggling media...");
  try {
    // Prefer controlling a running player directly via AppleScript to avoid
    // triggering the system Play key which may auto-launch Music when no
    // player is running.
    const player = await getPlayerInfo();
    if (player && player.app) {
      console.log(`Toggling play/pause via ${player.app}`);
      await runAppleScript(`tell application "${player.app}" to playpause`);
    } else {
      console.log(
        "No media player detected. Skipping system Play key to avoid launching Music.",
      );
    }

    await reportStatus();
  } catch (error) {
    console.error("Failed to execute media command:", error);
  }
});

socket.on("cmd:volume_up", async () => {
  console.log("🔊 Received cmd:volume_up - Increasing volume...");
  try {
    await keyboard.type(Key.AudioVolUp);
    await reportStatus();
  } catch (error) {
    console.error(error);
  }
});

socket.on("cmd:volume_down", async () => {
  console.log("🔉 Received cmd:volume_down - Decreasing volume...");
  try {
    await keyboard.type(Key.AudioVolDown);
    await reportStatus();
  } catch (error) {
    console.error(error);
  }
});

socket.on("cmd:seek_forward", async () => {
  console.log("⏩ Received cmd:seek_forward - Seeking forward 30s");
  try {
    await seekBy(30);
    await reportStatus();
  } catch (err) {
    console.error("seek_forward failed:", err);
  }
});

socket.on("cmd:seek_backward", async () => {
  console.log("⏪ Received cmd:seek_backward - Seeking backward 30s");
  try {
    await seekBy(-30);
    await reportStatus();
  } catch (err) {
    console.error("seek_backward failed:", err);
  }
});

socket.on("cmd:request_status", async () => {
  console.log("Received cmd:request_status - sending status");
  try {
    await reportStatus();
  } catch (e) {
    console.error("request_status failed:", e);
  }
});

async function runAppleScript(script: string) {
  try {
    const { stdout } = await execp(
      `osascript -e '${script.replace(/'/g, "\\'")}'`,
    );
    return stdout.trim();
  } catch (e) {
    return null;
  }
}

async function getSystemVolume(): Promise<number | null> {
  const out = await runAppleScript("output volume of (get volume settings)");
  if (!out) return null;
  const v = parseInt(out, 10);
  return Number.isNaN(v) ? null : v;
}

async function getPlayerInfo() {
  // Try Music, then Spotify — but check the app is running first
  const players = [
    {
      app: "Music",
      stateCmd: "player state as string",
      posCmd: "player position",
    },
    {
      app: "Spotify",
      stateCmd: "player state as string",
      posCmd: "player position",
    },
  ];

  for (const p of players) {
    // Check if the application is running to avoid launching it unintentionally
    const isRunning = await runAppleScript(`application "${p.app}" is running`);
    if (isRunning !== "true") continue;

    const state = await runAppleScript(
      `tell application "${p.app}" to ${p.stateCmd}`,
    );
    if (state && state.length > 0) {
      const posOut = await runAppleScript(
        `tell application "${p.app}" to ${p.posCmd}`,
      );
      const position = posOut ? parseFloat(posOut) : null;
      return { app: p.app, state: state.toLowerCase(), position };
    }
  }

  // No known player is running
  return { app: null, state: null, position: null };
}

async function seekBy(seconds: number) {
  // Try Music
  const musicCheck = await runAppleScript('application "Music" is running');
  if (musicCheck === "true") {
    await runAppleScript(
      `tell application \"Music\" to set player position to (player position + ${seconds})`,
    );
    return;
  }
  const spotifyCheck = await runAppleScript('application "Spotify" is running');
  if (spotifyCheck === "true") {
    await runAppleScript(
      `tell application \"Spotify\" to set player position to (player position + ${seconds})`,
    );
    return;
  }
}

async function reportStatus() {
  const volume = await getSystemVolume();
  const player = await getPlayerInfo();
  const payload: any = {};
  if (typeof volume === "number") payload.volume = volume;
  if (player && player.state) payload.playing = player.state === "playing";
  if (player && typeof player.position === "number")
    payload.position = player.position;
  console.log("daemon reportStatus ->", payload);
  socket.emit("status:update", payload);
}
