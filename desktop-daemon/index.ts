import { io } from "socket.io-client";
import { keyboard, Key } from "@nut-tree-fork/nut-js";
import dotenv from "dotenv";

dotenv.config();

const CLOUD_HUB_URL = process.env.CLOUD_HUB_URL || "http://localhost:3002";
const JWT_TOKEN = process.env.JWT_TOKEN || "your-jwt-token";

console.log("Connecting to Cloud Hub at:", CLOUD_HUB_URL);

// Need to pass token for authentication
const socket = io(CLOUD_HUB_URL, {
  auth: {
    token: JWT_TOKEN,
  },
});

socket.on("connect", () => {
  console.log("Connected to Cloud Hub with ID:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from Cloud Hub.");
});

socket.on("cmd:play_pause", async () => {
  console.log("Received cmd:play_pause - Toggling media...");
  try {
    await keyboard.type(Key.AudioPlay);
  } catch (error) {
    console.error("Failed to execute media command:", error);
  }
});

socket.on("cmd:volume_up", async () => {
  console.log("Received cmd:volume_up");
  try {
    await keyboard.type(Key.AudioVolUp);
  } catch (error) {
    console.error(error);
  }
});

socket.on("cmd:volume_down", async () => {
  console.log("Received cmd:volume_down");
  try {
    await keyboard.type(Key.AudioVolDown);
  } catch (error) {
    console.error(error);
  }
});
