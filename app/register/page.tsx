"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      return;
    }

    // Registration successful — redirect to pending approval page
    router.push("/pending");
  }

  return (
    <main className="container">
      <form className="card stack" onSubmit={onSubmit}>
        <div className="logo-icon">AI</div>
        <h1 className="text-center">Create your account</h1>
        <p className="text-center">Sign up to start using AI Assistant</p>
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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="text-center muted">
          Already have an account?{" "}
          <a className="link" href="/login">Log in</a>
        </p>
      </form>
    </main>
  );
}
