import type { OAuthStatus, ProviderStatus } from "../types";

type WorkspaceConnectionSectionProps = {
  oauth: OAuthStatus;
  cliProviders: ProviderStatus[];
  providerError: string;
  onOpenOAuthModal: () => void;
  onDisconnectOAuth: () => void;
  onConnectCliProvider: (providerId: ProviderStatus["id"]) => void;
  onDisconnectCliProvider: (providerId: ProviderStatus["id"]) => void;
};

export function WorkspaceConnectionSection({
  oauth,
  cliProviders,
  providerError,
  onOpenOAuthModal,
  onDisconnectOAuth,
  onConnectCliProvider,
  onDisconnectCliProvider,
}: WorkspaceConnectionSectionProps) {
  return (
    <>
      <div className={`oauth-card ${oauth.connected ? "connected" : "disconnected"}`}>
        <div className="oauth-status">
          <span className={`oauth-dot ${oauth.connected ? "on" : "off"}`} />
          <strong>{oauth.connected ? "Workspace connected" : "Workspace not connected"}</strong>
        </div>
        {oauth.connected ? (
          <div className="oauth-details">
            <span>{oauth.email}</span>
            <span>{oauth.plan?.toUpperCase()} plan</span>
            {oauth.expiresAt ? (
              <span>Token expires {new Date(oauth.expiresAt).toLocaleString()}</span>
            ) : null}
          </div>
        ) : (
          <div className="oauth-details">
            <span>
              Connect your ChatGPT account once; all approved users will share this
              connection.
            </span>
          </div>
        )}
        <div className="oauth-actions">
          {oauth.connected ? (
            <>
              <button className="btn small" onClick={onOpenOAuthModal}>
                Reconnect
              </button>
              <button className="btn small danger" onClick={onDisconnectOAuth}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn small" onClick={onOpenOAuthModal}>
              Connect workspace
            </button>
          )}
        </div>
      </div>

      <div className="model-settings" style={{ marginTop: "1rem" }}>
        <h2 className="section-title">CLI provider connections</h2>
        <p className="meta" style={{ marginBottom: "0.75rem" }}>
          Gemini, Claude Code, and Qwen Code use local CLI OAuth state from this machine.
        </p>
        {providerError ? <p className="error-text">{providerError}</p> : null}
        <div className="stack" style={{ gap: "0.75rem" }}>
          {cliProviders.map((provider) => (
            <div key={provider.id} className="oauth-card" style={{ padding: "1rem" }}>
              <div
                className="oauth-status"
                style={{ alignItems: "flex-start", justifyContent: "space-between" }}
              >
                <div>
                  <strong>{provider.label}</strong>
                  <div className="oauth-details" style={{ marginTop: "0.35rem" }}>
                    <span>{provider.installed ? "CLI installed" : "CLI missing"}</span>
                    <span>{provider.connected ? "OAuth ready" : "Login required"}</span>
                    <span>{provider.enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="oauth-details" style={{ marginTop: "0.35rem" }}>
                    {provider.email ? <span>{provider.email}</span> : null}
                    {provider.plan ? <span>{provider.plan}</span> : null}
                    {provider.expiresAt ? (
                      <span>Expires {new Date(provider.expiresAt).toLocaleString()}</span>
                    ) : null}
                  </div>
                  {provider.note ? (
                    <p className="meta" style={{ marginTop: "0.5rem" }}>
                      {provider.note}
                    </p>
                  ) : null}
                  {provider.command ? (
                    <p className="meta">
                      Command: <code>{provider.command}</code>
                    </p>
                  ) : null}
                </div>
                <div className="oauth-actions">
                  {provider.enabled ? (
                    <button
                      className="btn small danger"
                      onClick={() => onDisconnectCliProvider(provider.id)}
                    >
                      Disable
                    </button>
                  ) : (
                    <button className="btn small" onClick={() => onConnectCliProvider(provider.id)}>
                      Enable
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
