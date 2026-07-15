import { useState } from "react";
import { GROUP_COLORS, type GroupColor, type StrayTabAction } from "../storage";

interface SettingsProps {
  org: string;
  strayTabAction: StrayTabAction;
  groupColor: GroupColor;
  autoSync: boolean;
  onSave(org: string, strayTabAction: StrayTabAction, groupColor: GroupColor, autoSync: boolean): void;
  onCancel(): void;
}

export default function Settings({ org, strayTabAction, groupColor, autoSync, onSave, onCancel }: SettingsProps) {
  const [orgInput, setOrgInput] = useState(org);
  const [strayInput, setStrayInput] = useState<StrayTabAction>(strayTabAction);
  const [colorInput, setColorInput] = useState<GroupColor>(groupColor);
  const [autoSyncInput, setAutoSyncInput] = useState(autoSync);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(orgInput, strayInput, colorInput, autoSyncInput);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h2 className="login-heading">Settings</h2>
      <p className="login-description">
        Scope PRs to a single organization. Enter an org login (e.g. <b>my-org</b>),
        or leave it blank to show PRs from everywhere.
      </p>
      <label htmlFor="org-input" className="settings-label">Organization</label>
      <input
        id="org-input"
        type="text"
        placeholder="org login (optional)"
        value={orgInput}
        onChange={(e) => setOrgInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        className="input"
        autoFocus
      />
      <label className="settings-label">Automatic tab group sync</label>
      <label className="settings-checkbox">
        <input
          type="checkbox"
          checked={autoSyncInput}
          onChange={(e) => setAutoSyncInput(e.target.checked)}
        />
        Build and keep the "My PRs" group in sync on each background refresh
      </label>
      <label className="settings-label">Stray tabs in the PR group</label>
      <p className="settings-hint">
        A stray tab is one in the "My PRs" group you navigated to a non-PR page.
        Syncing never closes it — choose what happens instead.
      </p>
      <div className="settings-radio-group">
        <label className="settings-radio">
          <input
            type="radio"
            name="stray-tab-action"
            checked={strayInput === "ungroup"}
            onChange={() => setStrayInput("ungroup")}
          />
          Move it out of the group
        </label>
        <label className="settings-radio">
          <input
            type="radio"
            name="stray-tab-action"
            checked={strayInput === "keep"}
            onChange={() => setStrayInput("keep")}
          />
          Leave it in the group
        </label>
      </div>
      <label className="settings-label">Tab group color</label>
      <div className="settings-color-row" role="radiogroup" aria-label="Tab group color">
        {GROUP_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={colorInput === color}
            title={color}
            className={
              "settings-color-swatch swatch-" + color + (colorInput === color ? " selected" : "")
            }
            onClick={() => setColorInput(color)}
          />
        ))}
      </div>
      <div className="settings-actions">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} disabled={saving} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
