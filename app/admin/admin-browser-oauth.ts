import type { Dispatch, SetStateAction } from "react";
import type { DeviceCode, OAuthStep } from "./types";

type BrowserOAuthSetters = {
  setOauthError: Dispatch<SetStateAction<string>>;
  setOauthStep: Dispatch<SetStateAction<OAuthStep>>;
  setShowOAuthModal: Dispatch<SetStateAction<boolean>>;
};

type PollBrowserOAuthOptions = BrowserOAuthSetters & {
  config: { clientId: string; tokenUrl: string };
  code: string;
  interval: number;
  loadOAuth: () => Promise<void>;
};

type StartBrowserOAuthOptions = BrowserOAuthSetters & {
  importFromCodexSilent: () => Promise<boolean>;
  loadOAuth: () => Promise<void>;
  setDeviceCode: Dispatch<SetStateAction<DeviceCode | null>>;
};

function pollBrowserOAuthFlow({
  code,
  config,
  interval,
  loadOAuth,
  setOauthError,
  setOauthStep,
  setShowOAuthModal,
}: PollBrowserOAuthOptions) {
  const timer = window.setInterval(async () => {
    try {
      const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: config.clientId,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: code,
        }),
      });

      if (response.ok) {
        window.clearInterval(timer);
        const tokens = await response.json();

        const saveResponse = await fetch("/api/admin/oauth/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "tokens", tokens }),
        });

        if (!saveResponse.ok) {
          const data = await saveResponse.json();
          throw new Error(data.error || "Failed to save tokens");
        }

        setOauthStep("success");
        await loadOAuth();
        window.setTimeout(() => {
          setShowOAuthModal(false);
          setOauthStep("idle");
        }, 2000);
        return;
      }

      const body = await response.json().catch(() => ({}));
      const error = (body as Record<string, string>).error;

      if (error !== "authorization_pending" && error !== "slow_down") {
        window.clearInterval(timer);
        setOauthError(
          (body as Record<string, string>).error_description ||
            error ||
            "Authorization failed",
        );
        setOauthStep("error");
      }
    } catch (err) {
      window.clearInterval(timer);
      setOauthError(err instanceof Error ? err.message : "Network error");
      setOauthStep("error");
    }
  }, interval * 1000);

  window.setTimeout(() => window.clearInterval(timer), 15 * 60 * 1000);
}

export async function startBrowserOAuthFlow({
  importFromCodexSilent,
  loadOAuth,
  setDeviceCode,
  setOauthError,
  setOauthStep,
  setShowOAuthModal,
}: StartBrowserOAuthOptions) {
  setOauthStep("loading");
  setOauthError("");

  try {
    const configResponse = await fetch("/api/admin/oauth/config");
    const config = await configResponse.json();

    const deviceCodeResponse = await fetch(config.deviceCodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        scope: config.scopes,
        audience: config.audience,
      }),
    });

    if (!deviceCodeResponse.ok) {
      throw new Error(`Device code request failed (${deviceCodeResponse.status})`);
    }

    const deviceCodeData = (await deviceCodeResponse.json()) as DeviceCode;
    setDeviceCode(deviceCodeData);
    setOauthStep("waiting");

    window.open(
      deviceCodeData.verification_uri_complete || deviceCodeData.verification_uri,
      "_blank",
      "width=500,height=700",
    );

    pollBrowserOAuthFlow({
      config,
      code: deviceCodeData.device_code,
      interval: deviceCodeData.interval || 5,
      loadOAuth,
      setOauthError,
      setOauthStep,
      setShowOAuthModal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";

    if (message.toLowerCase().includes("failed to fetch")) {
      const imported = await importFromCodexSilent();
      if (imported) {
        return;
      }

      setOauthError(
        "Browser mode is blocked on this environment (CORS/Cloudflare). Run 'python scripts/codex_login.py --device-auth' in terminal, then click 'Import from Codex CLI'.",
      );
      setOauthStep("error");
      return;
    }

    setOauthError(message);
    setOauthStep("error");
  }
}
