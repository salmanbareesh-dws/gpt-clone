import { formatModelLabel } from "@/lib/provider-models";
import type { OAuthStatus } from "../types";

type ModelSettingsSectionProps = {
  oauth: OAuthStatus;
  selectedDefault: string;
  newModel: string;
  onUpdateDefaultModel: (model: string) => void;
  onNewModelChange: (value: string) => void;
  onAddModel: () => void;
  onRemoveModel: (model: string) => void;
};

export function ModelSettingsSection({
  oauth,
  selectedDefault,
  newModel,
  onUpdateDefaultModel,
  onNewModelChange,
  onAddModel,
  onRemoveModel,
}: ModelSettingsSectionProps) {
  return (
    <div className="model-settings">
      <h2 className="section-title">Model settings</h2>
      <div className="model-default">
        <label>Default Model</label>
        <select
          className="select"
          value={selectedDefault}
          onChange={(event) => onUpdateDefaultModel(event.target.value)}
        >
          {oauth.models.map((model) => (
            <option key={model} value={model}>
              {formatModelLabel(model)}
            </option>
          ))}
        </select>
      </div>
      <div className="model-list">
        <label>Available Models</label>
        <div className="model-chips">
          {oauth.models.map((model) => (
            <span
              key={model}
              className={`model-chip ${model === selectedDefault ? "default" : ""}`}
            >
              {formatModelLabel(model)}
              {oauth.models.length > 1 ? (
                <button
                  className="chip-remove"
                  onClick={() => onRemoveModel(model)}
                  title="Remove"
                >
                  Remove
                </button>
              ) : null}
            </span>
          ))}
        </div>
        <div className="row" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            className="input"
            type="text"
            placeholder="Add model (e.g. gemini:gemini-2.5-pro)"
            value={newModel}
            onChange={(event) => onNewModelChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddModel();
              }
            }}
            style={{ flex: 1 }}
          />
          <button className="btn small" onClick={onAddModel}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
