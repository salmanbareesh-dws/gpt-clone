export default function Home() {
  return (
    <main className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <div className="logo-icon">AI</div>
        <h1>AI Assistant</h1>
        <p>Premium AI chat workspace powered by Next.js and PostgreSQL</p>
        <div className="stack" style={{ gap: "0.5rem" }}>
          <a className="btn" href="/login">
            Log in
          </a>
          <a className="btn secondary" href="/register">
            Create an account
          </a>
        </div>
      </div>
    </main>
  );
}
