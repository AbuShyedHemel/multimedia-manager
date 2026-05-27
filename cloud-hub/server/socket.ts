import { Server } from "socket.io";
import { default as Redis } from "ioredis";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis();
const io = new Server({
  cors: {
    origin: "*",
  },
});

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id, "User:", socket.data.user?.id);

  const userId = socket.data.user?.id;
  if (userId) {
    socket.join(`room_${userId}`);
    console.log(`Socket ${socket.id} joined room_${userId}`);
  }

  socket.on("cmd:play_pause", () => {
    console.log("Relaying cmd:play_pause to room");
    // Broadcast to others in the room (the desktop daemon)
    socket.to(`room_${userId}`).emit("cmd:play_pause");
  });

  socket.on("cmd:volume_up", () => {
    console.log("Relaying cmd:volume_up to room");
    socket.to(`room_${userId}`).emit("cmd:volume_up");
  });

  socket.on("cmd:volume_down", () => {
    console.log("Relaying cmd:volume_down to room");
    socket.to(`room_${userId}`).emit("cmd:volume_down");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

io.listen(3002);
console.log("Socket.IO server running on port 3002");
