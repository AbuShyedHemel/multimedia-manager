import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const newSocket = io("http://localhost:3002", {
      auth: { token },
    });

    newSocket.on("connect", () => {
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const sendCommand = (cmd: string) => {
    if (socket) {
      socket.emit(cmd);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-neutral-900 text-white">
      <div className="w-full max-w-sm flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">Universal Remote</h1>
        <div
          className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <button
          onClick={() => sendCommand("cmd:play_pause")}
          className="col-span-2 py-12 bg-neutral-800 rounded-2xl active:bg-neutral-700 transition flex items-center justify-center border border-neutral-700 shadow-xl"
        >
          <span className="text-2xl font-semibold">Play / Pause</span>
        </button>

        <button
          onClick={() => sendCommand("cmd:volume_down")}
          className="py-10 bg-neutral-800 rounded-2xl active:bg-neutral-700 transition space-y-2 border border-neutral-700"
        >
          <span className="text-2xl block">-</span>
          <span className="text-sm text-neutral-400">Vol Down</span>
        </button>

        <button
          onClick={() => sendCommand("cmd:volume_up")}
          className="py-10 bg-neutral-800 rounded-2xl active:bg-neutral-700 transition space-y-2 border border-neutral-700"
        >
          <span className="text-2xl block">+</span>
          <span className="text-sm text-neutral-400">Vol Up</span>
        </button>
      </div>

      <div className="mt-8">
        <a href="/pair" className="text-sm text-blue-400 underline">
          Pair new device
        </a>
      </div>
    </div>
  );
}
