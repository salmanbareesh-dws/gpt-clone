import type { Dispatch, SetStateAction } from "react";
import type { DeviceCode, OAuthStep } from "./types";

type OAuthUiSetters = {
  setDeviceCode: Dispatch<SetStateAction<DeviceCode | null>>;
  setOauthError: Dispatch<SetStateAction<string>>;
  setOauthStep: Dispatch<SetStateAction<OAuthStep>>;
  setShowOAuthModal: Dispatch<SetStateAction<boolean>>;
};

type CodexFlowOptions = OAuthUiSetters & {
  loadOAuth: () => Promise<void>;
};

type PopupCodexFlowOptions = CodexFlowOptions & {
  setCodexHomePath: Dispatch<SetStateAction<string>>;
};

export async function importFromCodexFlow({
  loadOAuth,
  setOauthError,
  setOauthStep,
  setShowOAuthModal,
}: CodexFlowOptions) {
  setOauthStep("loading");
  setOauthError("");

  try {
    const response = await fetch("/api/admin/oauth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "import" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Import failed");
    }

    setOauthStep("success");
    await loadOAuth();
    window.setTimeout(() => {
      setShowOAuthModal(false);
      setOauthStep("idle");
    }, 2000);
  } catch (err) {
    setOauthError(err instanceof Error ? err.message : "Import failed");
    setOauthStep("error");
  }
}

export async function importFromCodexSilentFlow({
  loadOAuth,
  setOauthStep,
  setShowOAuthModal,
}: CodexFlowOptions): Promise<boolean> {
  try {
    const response = await fetch("/api/admin/oauth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "import" }),
    });

    if (!response.ok) {
      return false;
    }

    setOauthStep("success");
    await loadOAuth();
    window.setTimeout(() => {
      setShowOAuthModal(false);
      setOauthStep("idle");
    }, 2000);
    return true;
  } catch {
    return false;
  }
}

export async function startCodexPopupOAuthFlow({
  loadOAuth,
  setCodexHomePath,
  setDeviceCode,
  setOauthError,
  setOauthStep,
  setShowOAuthModal,
}: PopupCodexFlowOptions) {
  setOauthStep("loading");
  setOauthError("");
  setDeviceCode(null);

  const popup = window.open(
    "https://auth.openai.com/codex/device",
    "_blank",
    "width=520,height=760",
  );

  if (!popup) {
    setOauthError(
      "Popup was blocked by the browser. Please allow popups for localhost and try again.",
    );
    setOauthStep("error");
    return;
  }

  try {
    const startResponse = await fetch("/api/admin/oauth/codex/start", {
      method: "POST",
    });
    const startData = await startResponse.json();

    if (!startResponse.ok || !startData.sessionId) {
      throw new Error(startData.error || "Failed to start Codex login");
    }

    if (startData.codexHome) {
      setCodexHomePath(startData.codexHome);
    }

    setOauthStep("waiting");

    const pollTimer = window.setInterval(async () => {
      try {
        const statusResponse = await fetch(
          `/api/admin/oauth/codex/status?sessionId=${encodeURIComponent(startData.sessionId)}`,
        );
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          window.clearInterval(pollTimer);
          setOauthError(statusData.error || "Login status failed");
          setOauthStep("error");
          popup.close();
          return;
        }

        if (statusData.userCode || statusData.verificationUri) {
          setDeviceCode({
            device_code: startData.sessionId,
            user_code: statusData.userCode || "",
            verification_uri:
              statusData.verificationUri || "https://auth.openai.com/codex/device",
            verification_uri_complete:
              statusData.verificationUri || "https://auth.openai.com/codex/device",
            expires_in: 900,
            interval: 5,
          });

          if (!popup.closed && statusData.verificationUri) {
            popup.location.href = statusData.verificationUri;
          }
        }

        if (statusData.status === "authorized") {
          window.clearInterval(pollTimer);
          setOauthStep("success");
          await loadOAuth();
          popup.close();
          window.setTimeout(() => {
            setShowOAuthModal(false);
            setOauthStep("idle");
          }, 1500);
          return;
        }

        if (statusData.status === "error") {
          window.clearInterval(pollTimer);
          setOauthError(statusData.error || "Codex login failed");
          setOauthStep("error");
          popup.close();
        }
      } catch (err) {
        window.clearInterval(pollTimer);
        setOauthError(err instanceof Error ? err.message : "Polling failed");
        setOauthStep("error");
        popup.close();
      }
    }, 1500);

    window.setTimeout(() => window.clearInterval(pollTimer), 20 * 60 * 1000);
  } catch (err) {
    popup.close();
    setOauthError(err instanceof Error ? err.message : "Failed to start login");
    setOauthStep("error");
  }
}
