import { Server } from "socket.io";
import { default as Redis } from "ioredis";

const redis = new Redis();
const io = new Server({
  cors: {
    origin: "*",
  },
});

io.on("connection", async (socket) => {
  const type = socket.handshake.auth?.type;

  if (type === "daemon") {
    console.log("Daemon connected:", socket.id);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`pin:${pin}`, socket.id, "EX", 3600);
    await redis.set(`global:daemon:pin`, pin, "EX", 3600);
    await redis.set(`global:daemon:id`, socket.id, "EX", 3600);
    
    socket.emit("registered", { pin });
    socket.join(`daemon_${socket.id}`);

    socket.on("disconnect", async () => {
      console.log("Daemon disconnected:", socket.id);
      await redis.del(`pin:${pin}`);
      await redis.del(`global:daemon:pin`);
      await redis.del(`global:daemon:id`);
    });
    return;
  }

  console.log("Remote Client connected:", socket.id);

  socket.on("cmd:play_pause", (data) => {
    if(data?.daemonId) io.to(`daemon_${data.daemonId}`).emit("cmd:play_pause");
  });

  socket.on("cmd:volume_up", (data) => {
    if(data?.daemonId) io.to(`daemon_${data.daemonId}`).emit("cmd:volume_up");
  });

  socket.on("cmd:volume_down", (data) => {
    if(data?.daemonId) io.to(`daemon_${data.daemonId}`).emit("cmd:volume_down");
  });
});

io.listen(3002);
console.log("Socket.IO server running on port 3002");
