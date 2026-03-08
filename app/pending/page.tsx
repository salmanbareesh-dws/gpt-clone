"use client";

export default function PendingPage() {
  return (
    <main className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <div className="logo-icon">⏳</div>
        <h1>Account Pending</h1>
        <p>
          Your registration was successful! Your account is awaiting admin
          approval. You&apos;ll be able to log in once an administrator approves
          your account.
        </p>
        <a className="btn secondary" href="/login">
          Back to Login
        </a>
      </div>
    </main>
  );
}
