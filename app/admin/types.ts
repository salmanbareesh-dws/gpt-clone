export type UserRole = "ADMIN" | "USER";

export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

export type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  _count: { chats: number };
};

export type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type ProviderId = "openai" | "gemini" | "claude-code" | "qwen-code";

export type ProviderStatus = {
  id: ProviderId;
  label: string;
  connected: boolean;
  enabled: boolean;
  installed: boolean;
  email: string | null;
  plan: string | null;
  expiresAt: string | null;
  command: string | null;
  note: string | null;
  models: string[];
};

export type OAuthStatus = {
  connected: boolean;
  email: string | null;
  plan: string | null;
  expiresAt: string | null;
  models: string[];
  defaultModel: string;
  providers: ProviderStatus[];
};

export type DeviceCode = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
};

export type OAuthStep = "idle" | "loading" | "waiting" | "success" | "error";
