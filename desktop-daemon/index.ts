import { io } from "socket.io-client";
import { keyboard, Key } from "@nut-tree-fork/nut-js";
import dotenv from "dotenv";

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
    await keyboard.type(Key.AudioPlay);
  } catch (error) {
    console.error("Failed to execute media command:", error);
  }
});

socket.on("cmd:volume_up", async () => {
  console.log("🔊 Received cmd:volume_up - Increasing volume...");
  try {
    await keyboard.type(Key.AudioVolUp);
  } catch (error) {
    console.error(error);
  }
});

socket.on("cmd:volume_down", async () => {
  console.log("🔉 Received cmd:volume_down - Decreasing volume...");
  try {
    await keyboard.type(Key.AudioVolDown);
  } catch (error) {
    console.error(error);
  }
});
