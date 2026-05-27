import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

const loginFn = createServerFn({ method: "POST" })
  .validator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { username, password } = data;
    if (username && password) {
      const user = { id: username, name: username };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
      return { token };
    }
    throw new Error("Invalid credentials");
  });

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const executeLogin = useServerFn(loginFn);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await executeLogin({ data: { username, password } });
      if (result.token) {
        localStorage.setItem("jwt", result.token);
        window.location.href = "/";
      }
    } catch (e) {
      alert("Login failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-sm p-6 space-y-4 rounded-lg shadow-md bg-card">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full px-3 py-2 border rounded-md"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-3 py-2 border rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
