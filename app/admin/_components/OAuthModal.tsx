import type { MouseEvent } from "react";
import type { DeviceCode, OAuthStep } from "../types";

type OAuthModalProps = {
  open: boolean;
  step: OAuthStep;
  deviceCode: DeviceCode | null;
  codexHomePath: string;
  error: string;
  onClose: () => void;
  onReset: () => void;
  onImportFromCodex: () => void;
  onStartCodexPopupOAuth: () => void;
  onStartBrowserOAuth: () => void;
};

export function OAuthModal({
  open,
  step,
  deviceCode,
  codexHomePath,
  error,
  onClose,
  onReset,
  onImportFromCodex,
  onStartCodexPopupOAuth,
  onStartBrowserOAuth,
}: OAuthModalProps) {
  if (!open) {
    return null;
  }

  function handleOverlayClick() {
    if (step !== "waiting") {
      onClose();
    }
  }

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={stopPropagation}>
        <div className="modal-header">
          <h2>Connect workspace</h2>
          <button className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {step === "idle" ? (
            <div className="oauth-methods">
              <p className="modal-desc">
                Choose how to connect your ChatGPT account. This is a one-time admin
                setup and stays active for all users until you disconnect.
              </p>

              <button
                className="btn oauth-method-btn"
                style={{ width: "100%", marginBottom: "0.75rem" }}
                onClick={onImportFromCodex}
              >
                Import from Codex CLI
                <span className="method-hint">Fastest - uses existing Codex login</span>
              </button>

              <button
                className="btn oauth-method-btn"
                style={{ width: "100%", marginBottom: "0.75rem" }}
                onClick={onStartCodexPopupOAuth}
              >
                Login with Codex popup
                <span className="method-hint">
                  Best for switching to a different account each time
                </span>
              </button>

              <button
                className="btn secondary oauth-method-btn"
                style={{ width: "100%" }}
                onClick={onStartBrowserOAuth}
              >
                Connect via browser
                <span className="method-hint">
                  May be blocked on localhost; auto-falls back to import
                </span>
              </button>
            </div>
          ) : null}

          {step === "loading" ? (
            <div className="oauth-loading">
              <div className="spinner" />
              <p>Connecting...</p>
            </div>
          ) : null}

          {step === "waiting" && deviceCode ? (
            <div className="oauth-waiting">
              <p className="modal-desc">
                A browser window has been opened. Enter this code when prompted:
              </p>
              <div className="device-code">{deviceCode.user_code || "Loading code..."}</div>
              {codexHomePath ? (
                <p className="modal-hint">Tokens are stored in: {codexHomePath}</p>
              ) : null}
              <p className="modal-hint">
                If the browser didn&apos;t open,{" "}
                <a
                  href={deviceCode.verification_uri_complete || deviceCode.verification_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  click here
                </a>
              </p>
              <div className="oauth-polling">
                <div className="spinner small" />
                <span>Waiting for authorization...</span>
              </div>
            </div>
          ) : null}

          {step === "success" ? (
            <div className="oauth-success">
              <div className="success-icon">OK</div>
              <p>Workspace connected successfully.</p>
            </div>
          ) : null}

          {step === "error" ? (
            <div className="oauth-error-state">
              <p className="error-text">{error}</p>
              <button className="btn" style={{ width: "100%", marginTop: "1rem" }} onClick={onReset}>
                Try Again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
