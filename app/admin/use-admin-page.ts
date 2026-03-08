"use client";

import { useAdminUsers } from "./use-admin-users";
import { useAdminWorkspace } from "./use-admin-workspace";

export function useAdminPage() {
  const users = useAdminUsers();
  const workspace = useAdminWorkspace();

  return {
    ...users,
    ...workspace,
  };
}
