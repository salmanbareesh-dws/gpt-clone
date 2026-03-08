"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEventHandler } from "react";
import { useRouter } from "next/navigation";
import type { Stats, UserRole, UserRow, UserStatus } from "./types";

const emptyStats: Stats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

export function useAdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    const me = await fetch("/api/auth/me");
    if (!me.ok) {
      router.push("/login");
      return;
    }

    const meData = await me.json();
    if (meData.user.role !== "ADMIN") {
      router.push("/chat");
      return;
    }

    const response = await fetch("/api/users");
    if (!response.ok) {
      setError("Cannot load users");
      return;
    }

    const data = await response.json();
    setUsers(data.users ?? []);
    setStats(data.stats ?? emptyStats);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const updateStatus = useCallback(
    async (userId: string, status: Exclude<UserStatus, "PENDING">) => {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await loadUsers();
      }
    },
    [loadUsers],
  );

  const createUser = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();
      setError("");

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Cannot create user");
        return;
      }

      setEmail("");
      setPassword("");
      setRole("USER");
      await loadUsers();
    },
    [email, loadUsers, password, role],
  );

  const pendingUsers = useMemo(
    () => users.filter((user) => user.status === "PENDING"),
    [users],
  );

  return {
    users,
    stats,
    email,
    password,
    role,
    error,
    pendingUsers,
    setEmail,
    setPassword,
    setRole,
    updateStatus,
    createUser,
  };
}
