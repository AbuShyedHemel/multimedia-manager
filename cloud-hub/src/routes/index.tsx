import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { io, Socket } from "socket.io-client";
import {
  Play,
  Speaker,
  Volume2,
  Smartphone,
  Unlink,
  Tv,
  Loader2,
} from "lucide-react";

// Server Functions
const getHostDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const Redis = (await import("ioredis")).default;
  const redis = new Redis();
  const pin = await redis.get("global:daemon:pin");
  const daemonId = await redis.get("global:daemon:id");
  return { pin, daemonId };
});

const validatePinFn = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string }) => data)
  .handler(async ({ data }) => {
    const Redis = (await import("ioredis")).default;
    const redis = new Redis();
    const daemonId = await redis.get(`pin:${data.pin}`);
    if (daemonId) return { success: true, daemonId };
    throw new Error("Invalid PIN");
  });

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [pinInput, setPinInput] = useState("");
  const [daemonId, setDaemonId] = useState<string | null>(null);
  const [hostPin, setHostPin] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [mounted, setMounted] = useState(false);

  const getHostData = useServerFn(getHostDataFn);
  const validatePin = useServerFn(validatePinFn);

  useEffect(() => {
    setMounted(true);
    const isMobile = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent);
    const isLocalHostIP =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const local = isLocalHostIP || !isMobile;

    setIsLocalhost(local);

    const savedDaemon = localStorage.getItem("daemonId");
    if (savedDaemon) setDaemonId(savedDaemon);

    if (local) {
      getHostData().then((data) => {
        if (data.pin) setHostPin(data.pin);
        if (data.daemonId) {
          setDaemonId(data.daemonId);
          localStorage.setItem("daemonId", data.daemonId);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!daemonId && !isLocalhost) return;

    const socketUrl = `http://${window.location.hostname}:3002`;
    const newSocket = io(socketUrl, { auth: { type: "web" } });

    newSocket.on("connect", () => {
      console.log("Connected to Socket Server");
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [daemonId, isLocalhost]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await validatePin({ data: { pin: pinInput } });
      if (res.success && res.daemonId) {
        localStorage.setItem("daemonId", res.daemonId);
        setDaemonId(res.daemonId);
      }
    } catch (e) {
      alert("Invalid PIN. Please check the computer display.");
    }
  };

  const disconnect = () => {
    localStorage.removeItem("daemonId");
    setDaemonId(null);
  };

  const sendCommand = (cmd: string) => {
    if (socket && daemonId) {
      socket.emit(cmd, { daemonId });
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!daemonId && !isLocalhost) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 text-slate-100 p-4 font-sans sm:px-6">
        <div className="w-full max-w-sm p-6 sm:p-8 space-y-6 text-center rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col justify-center">
          <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
            <Smartphone className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Connect</h1>
          <p className="text-slate-400 text-sm">
            Enter the 6-digit PIN shown on your computer.
          </p>
          <form onSubmit={handlePair} className="space-y-5">
            <input
              type="tel"
              placeholder="000000"
              className="w-full px-2 py-4 text-center text-4xl sm:text-5xl tracking-[0.3em] sm:tracking-[0.5em] border border-slate-700 rounded-2xl bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-800 font-mono shadow-inner"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />
            <button
              type="submit"
              className="w-full px-4 py-4 sm:py-5 font-bold text-lg text-white bg-blue-600 rounded-2xl hover:bg-blue-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              Link Device
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center flex-grow min-h-[100dvh] bg-slate-950 text-slate-100 px-4 py-6 sm:p-8 font-sans">
      <div className="w-full max-w-md mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between mb-6 px-1 mt-2">
          <div className="flex items-center gap-3">
            <Tv className="w-7 h-7 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight">Media Hub</h1>
          </div>
          {!isLocalhost && (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 active:bg-red-500/30 text-red-300 transition-colors text-sm font-medium"
            >
              <Unlink className="w-4 h-4" />
              Disconnect
            </button>
          )}
        </div>

        {isLocalhost && hostPin && (
          <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-800/30 text-center shadow-2xl relative overflow-hidden shrink-0 mt-4 sm:mt-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
            <p className="text-blue-300 text-sm font-bold uppercase tracking-[0.2em] mb-3">
              Your Code
            </p>
            <p className="text-5xl sm:text-6xl font-mono font-black tracking-[0.2em] text-white my-3 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
              {hostPin}
            </p>
            <p className="text-slate-400 text-sm mt-4 flex items-center justify-center gap-2 bg-slate-950/50 block w-max mx-auto px-4 py-2 rounded-full border border-slate-800/50">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Open on phone to link
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:gap-5 flex-grow content-center mt-6">
          <button
            onClick={() => sendCommand("cmd:play_pause")}
            style={{ touchAction: "manipulation" }}
            className="col-span-2 py-10 sm:py-12 flex flex-col items-center justify-center gap-4 bg-slate-900 rounded-[2rem] border border-slate-800 hover:bg-slate-800 active:bg-blue-900/30 active:border-blue-500/50 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
              <Play className="w-10 h-10 ml-2" />
            </div>
            <span className="font-bold text-xl tracking-wide">
              Play / Pause
            </span>
          </button>

          <button
            onClick={() => sendCommand("cmd:volume_down")}
            style={{ touchAction: "manipulation" }}
            className="py-8 sm:py-10 flex flex-col items-center justify-center gap-3 bg-slate-900 rounded-[2rem] border border-slate-800 hover:bg-slate-800 active:bg-slate-800/80 active:scale-[0.98] transition-all shadow-lg"
          >
            <Speaker className="w-10 h-10 text-slate-300" />
            <span className="font-semibold text-lg text-slate-300 mt-2">
              Vol Down
            </span>
          </button>

          <button
            onClick={() => sendCommand("cmd:volume_up")}
            style={{ touchAction: "manipulation" }}
            className="py-8 sm:py-10 flex flex-col items-center justify-center gap-3 bg-slate-900 rounded-[2rem] border border-slate-800 hover:bg-slate-800 active:bg-slate-800/80 active:scale-[0.98] transition-all shadow-lg"
          >
            <Volume2 className="w-10 h-10 text-slate-300" />
            <span className="font-semibold text-lg text-slate-300 mt-2">
              Vol Up
            </span>
          </button>
        </div>

        <div className="mt-8 text-center pb-6">
          <p className="text-sm font-medium text-slate-500 flex items-center justify-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
            </span>
            System connected perfectly
          </p>
        </div>
      </div>
    </div>
  );
}
