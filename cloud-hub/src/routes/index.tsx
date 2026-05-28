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
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastStatusAt, setLastStatusAt] = useState<number | null>(null);
  const [lastStatusPayload, setLastStatusPayload] = useState<any>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean | null>(null);
  const [position, setPosition] = useState<number | null>(null);
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

  // Always connect the socket on mount so remote controllers (phones)
  // can receive status updates even before pairing. Command emission
  // remains gated by `daemonId`.
  useEffect(() => {
    const socketUrl = `http://${window.location.hostname}:3002`;
    const newSocket = io(socketUrl, { auth: { type: "web" } });

    newSocket.on("connect", () => {
      console.log("Connected to Socket Server");
      setSocketConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setSocketConnected(false);
    });

    newSocket.on(
      "status:update",
      (data: { volume?: number; playing?: boolean; position?: number }) => {
        console.log("socket status:update received", data);
        if (typeof data.volume === "number") setVolume(Math.round(data.volume));
        if (typeof data.playing === "boolean") setIsPlaying(data.playing);
        if (typeof data.position === "number")
          setPosition(Math.round(data.position));
        setLastStatusAt(Date.now());
        setLastStatusPayload(data);
      },
    );

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-1 mt-2">
          <div className="flex items-center gap-3">
            <Tv className="w-7 h-7 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight">Media Hub</h1>
          </div>

          <div className="flex flex-col items-end text-sm text-slate-400">
            <div>
              {typeof isPlaying === "boolean"
                ? isPlaying
                  ? "Playing"
                  : "Paused"
                : "Status: —"}
            </div>
            <div>
              {typeof volume === "number" ? `Vol: ${volume}%` : "Vol: —"}
            </div>
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

        {/* Host PIN (when present) */}
        {isLocalhost && hostPin && (
          <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-800/30 text-center shadow-2xl relative overflow-hidden shrink-0 mt-4 sm:mt-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
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

        {/* Device list for desktop when daemon present */}
        {isLocalhost && daemonId ? (
          <div className="space-y-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h2 className="text-lg font-semibold">Connected Devices</h2>
              <ul className="mt-3 divide-y divide-slate-800">
                <li className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">This Laptop</div>
                    <div className="text-xs text-slate-400">Paired device</div>
                  </div>
                  <div className="text-sm text-slate-300">ID: {daemonId}</div>
                </li>
              </ul>
            </div>

            {typeof volume !== "number" && typeof isPlaying !== "boolean" ? (
              <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-800 text-amber-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-amber-100">
                      Status unavailable
                    </div>
                    <div className="text-xs text-amber-200 mt-1">
                      The desktop daemon may not be reporting status. Ensure the
                      daemon is running and has required macOS permissions
                      (Accessibility / Automation).
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => sendCommand("cmd:request_status")}
                      className="px-3 py-2 rounded bg-amber-600 text-xs font-medium"
                    >
                      Refresh status
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                Controllers are available on paired devices (phone/tablet).
              </div>
            )}
          </div>
        ) : (
          /* Mobile/remote controllers */
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

            <div className="col-span-2 flex items-center justify-between gap-4 mt-4">
              <button
                onClick={() => sendCommand("cmd:seek_backward")}
                className="w-1/2 py-3 bg-slate-900 rounded-xl border border-slate-800 hover:bg-slate-800"
              >
                « 30s
              </button>
              <button
                onClick={() => sendCommand("cmd:seek_forward")}
                className="w-1/2 py-3 bg-slate-900 rounded-xl border border-slate-800 hover:bg-slate-800"
              >
                30s »
              </button>
            </div>

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
        )}

        <div className="mt-8 text-center pb-6">
          <div className="text-sm font-medium text-slate-500 flex flex-col items-center justify-center gap-2">
            <p className="flex items-center gap-3">
              <span className={`relative flex h-3 w-3 ${socketConnected ? '': 'opacity-40'}`}>
                {socketConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-600"></span>
                )}
              </span>
              {socketConnected ? 'Socket connected' : 'Socket disconnected'}
            </p>
            {lastStatusAt ? (
              <p className="text-xs text-slate-400">Last status: {Math.max(0, Math.round((Date.now() - lastStatusAt) / 1000))}s ago</p>
            ) : (
              <p className="text-xs text-amber-300">No status received yet</p>
            )}
            {lastStatusPayload && (
              <pre className="text-xs text-slate-500 mt-2">{JSON.stringify(lastStatusPayload)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
