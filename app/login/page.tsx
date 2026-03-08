"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }

    router.push("/chat");
  }

  return (
    <main className="container">
      <form className="card stack" onSubmit={onSubmit}>
        <div className="logo-icon">AI</div>
        <h1 className="text-center">Welcome back</h1>
        <p className="text-center">Log in to continue to AI Assistant</p>
        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Continue"}
        </button>
        <p className="text-center muted">
          Don&apos;t have an account?{" "}
          <a className="link" href="/register">Sign up</a>
        </p>
      </form>
    </main>
  );
}
