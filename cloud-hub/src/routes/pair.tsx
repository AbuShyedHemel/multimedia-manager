import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { default as Redis } from "ioredis";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

const validatePairFn = createServerFn({ method: "POST" })
  .validator((data: { pin: string; token: string }) => data)
  .handler(async ({ data }) => {
    let user;
    try {
      user = jwt.verify(data.token, JWT_SECRET) as any;
    } catch {
      throw new Error("Invalid token");
    }

    const redis = new Redis();
    const daemonId = await redis.get(`pin:${data.pin}`);
    if (daemonId) {
      await redis.set(`user:${user.id}:daemon`, daemonId);
      await redis.del(`pin:${data.pin}`);
      return { success: true, daemonId };
    }

    throw new Error("Invalid PIN");
  });

export const Route = createFileRoute("/pair")({
  component: Pair,
});

function Pair() {
  const [pin, setPin] = useState("");
  const executeValidate = useServerFn(validatePairFn);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await executeValidate({
        data: { pin, token: localStorage.getItem("jwt") || "" },
      });
      if (result.success) {
        alert("Successfully paired!");
        window.location.href = "/";
      }
    } catch (err) {
      alert("Invalid PIN or expired");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-sm p-6 space-y-4 text-center rounded-lg shadow-md bg-card">
        <h1 className="text-2xl font-bold">Pairing</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit PIN shown on your desktop daemon.
        </p>
        <form onSubmit={handlePair} className="space-y-4">
          <input
            type="text"
            placeholder="000000"
            className="w-full px-3 py-2 text-center text-4xl tracking-[0.5em] border rounded-md"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Submit PIN
          </button>
        </form>
      </div>
    </div>
  );
}
