import type { FormEventHandler } from "react";
import type { UserRole, UserRow } from "../types";

type UserManagementSectionProps = {
  users: UserRow[];
  pendingUsers: UserRow[];
  email: string;
  password: string;
  role: UserRole;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: UserRole) => void;
  onCreateUser: FormEventHandler<HTMLFormElement>;
  onUpdateStatus: (userId: string, status: "APPROVED" | "REJECTED") => void;
};

export function UserManagementSection({
  users,
  pendingUsers,
  email,
  password,
  role,
  error,
  onEmailChange,
  onPasswordChange,
  onRoleChange,
  onCreateUser,
  onUpdateStatus,
}: UserManagementSectionProps) {
  return (
    <>
      {pendingUsers.length > 0 ? (
        <>
          <h2 className="section-title">Pending approvals ({pendingUsers.length})</h2>
          <div className="stack" style={{ gap: "0.5rem", marginBottom: "1.5rem" }}>
            {pendingUsers.map((user) => (
              <div key={user.id} className="user-row">
                <div>
                  <div className="email">{user.email}</div>
                  <div className="meta">
                    Registered {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="row" style={{ gap: "0.5rem" }}>
                  <button className="btn small" onClick={() => onUpdateStatus(user.id, "APPROVED")}>
                    Approve
                  </button>
                  <button
                    className="btn small danger"
                    onClick={() => onUpdateStatus(user.id, "REJECTED")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
          <hr className="divider" />
        </>
      ) : null}

      <h2 className="section-title">Create user</h2>
      <form className="stack" onSubmit={onCreateUser} style={{ marginBottom: "1.5rem" }}>
        <div className="row" style={{ gap: "0.5rem" }}>
          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            required
            style={{ flex: 2 }}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            required
            style={{ flex: 1 }}
          />
          <select
            className="select"
            value={role}
            onChange={(event) => onRoleChange(event.target.value as UserRole)}
            style={{ flex: 0, minWidth: 100 }}
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button className="btn" type="submit">
            Create account
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </form>

      <hr className="divider" />

      <h2 className="section-title">All users</h2>
      <div className="stack" style={{ gap: "0.5rem" }}>
        {users.map((user) => (
          <div key={user.id} className="user-row">
            <div>
              <div className="email">{user.email}</div>
              <div className="meta">
                {user._count.chats} chats - {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
              <span className={`badge ${user.status.toLowerCase()}`}>{user.status}</span>
              <span className={`badge ${user.role === "ADMIN" ? "admin" : "user"}`}>
                {user.role}
              </span>
              {user.role !== "ADMIN" && user.status !== "APPROVED" ? (
                <button
                  className="btn ghost small"
                  onClick={() => onUpdateStatus(user.id, "APPROVED")}
                  title="Approve"
                >
                  Approve
                </button>
              ) : null}
              {user.role !== "ADMIN" && user.status !== "REJECTED" ? (
                <button
                  className="btn ghost small"
                  onClick={() => onUpdateStatus(user.id, "REJECTED")}
                  title="Reject"
                >
                  Reject
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
