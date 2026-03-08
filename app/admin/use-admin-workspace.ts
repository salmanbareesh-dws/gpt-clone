"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { importFromCodexFlow, importFromCodexSilentFlow, startCodexPopupOAuthFlow } from "./admin-codex-actions";
import { startBrowserOAuthFlow } from "./admin-browser-oauth";
import type {
  DeviceCode,
  OAuthStatus,
  OAuthStep,
  ProviderId,
} from "./types";

const emptyOAuthStatus: OAuthStatus = {
  connected: false,
  email: null,
  plan: null,
  expiresAt: null,
  models: [],
  defaultModel: "gpt-5-codex",
  providers: [],
};

export function useAdminWorkspace() {
  const [providerError, setProviderError] = useState("");
  const [oauth, setOauth] = useState<OAuthStatus>(emptyOAuthStatus);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [oauthStep, setOauthStep] = useState<OAuthStep>("idle");
  const [oauthError, setOauthError] = useState("");
  const [codexHomePath, setCodexHomePath] = useState("");
  const [newModel, setNewModel] = useState("");
  const [selectedDefault, setSelectedDefault] = useState("");

  const loadOAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/oauth");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as Partial<OAuthStatus>;
      const nextOauth: OAuthStatus = {
        ...emptyOAuthStatus,
        ...data,
        providers: data.providers ?? [],
      };

      setOauth(nextOauth);
      setSelectedDefault(nextOauth.defaultModel || "gpt-5-codex");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOAuth();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOAuth]);

  const openOAuthModal = useCallback(() => {
    setShowOAuthModal(true);
    setOauthStep("idle");
    setOauthError("");
  }, []);

  const closeOAuthModal = useCallback(() => {
    setShowOAuthModal(false);
  }, []);

  const importFromCodex = useCallback(async () => {
    await importFromCodexFlow({
      loadOAuth,
      setDeviceCode,
      setOauthError,
      setOauthStep,
      setShowOAuthModal,
    });
  }, [loadOAuth]);

  const importFromCodexSilent = useCallback(async () => {
    return importFromCodexSilentFlow({
      loadOAuth,
      setDeviceCode,
      setOauthError,
      setOauthStep,
      setShowOAuthModal,
    });
  }, [loadOAuth]);

  const startCodexPopupOAuth = useCallback(async () => {
    await startCodexPopupOAuthFlow({
      loadOAuth,
      setCodexHomePath,
      setDeviceCode,
      setOauthError,
      setOauthStep,
      setShowOAuthModal,
    });
  }, [loadOAuth]);

  const startBrowserOAuth = useCallback(async () => {
    await startBrowserOAuthFlow({
      importFromCodexSilent,
      loadOAuth,
      setDeviceCode,
      setOauthError,
      setOauthStep,
      setShowOAuthModal,
    });
  }, [importFromCodexSilent, loadOAuth]);

  const disconnectOAuth = useCallback(async () => {
    await fetch("/api/admin/oauth/disconnect", { method: "POST" });
    await loadOAuth();
  }, [loadOAuth]);

  const connectCliProvider = useCallback(
    async (providerId: ProviderId) => {
      if (providerId === "openai") {
        return;
      }

      setProviderError("");

      const response = await fetch("/api/admin/providers/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setProviderError(data.error || `Failed to connect ${providerId}`);
        return;
      }

      await loadOAuth();
    },
    [loadOAuth],
  );

  const disconnectCliProvider = useCallback(
    async (providerId: ProviderId) => {
      if (providerId === "openai") {
        return;
      }

      setProviderError("");

      const response = await fetch("/api/admin/providers/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setProviderError(data.error || `Failed to disconnect ${providerId}`);
        return;
      }

      await loadOAuth();
    },
    [loadOAuth],
  );

  const updateDefaultModel = useCallback(
    async (model: string) => {
      setSelectedDefault(model);
      await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultModel: model }),
      });
      await loadOAuth();
    },
    [loadOAuth],
  );

  const addModel = useCallback(async () => {
    if (!newModel.trim()) {
      return;
    }

    const updated = [...oauth.models, newModel.trim()];
    await fetch("/api/admin/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ models: updated }),
    });
    setNewModel("");
    await loadOAuth();
  }, [loadOAuth, newModel, oauth.models]);

  const removeModel = useCallback(
    async (model: string) => {
      const updated = oauth.models.filter((item) => item !== model);
      if (updated.length === 0) {
        return;
      }

      await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: updated }),
      });
      await loadOAuth();
    },
    [loadOAuth, oauth.models],
  );

  const cliProviders = useMemo(
    () => oauth.providers.filter((provider) => provider.id !== "openai"),
    [oauth.providers],
  );

  return {
    providerError,
    oauth,
    showOAuthModal,
    deviceCode,
    oauthStep,
    oauthError,
    codexHomePath,
    newModel,
    selectedDefault,
    cliProviders,
    setNewModel,
    setOauthStep,
    openOAuthModal,
    closeOAuthModal,
    importFromCodex,
    startCodexPopupOAuth,
    startBrowserOAuth,
    disconnectOAuth,
    connectCliProvider,
    disconnectCliProvider,
    updateDefaultModel,
    addModel,
    removeModel,
  };
}
