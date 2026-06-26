import { useState } from "react";

interface SettingsProps {
  org: string;
  onSave(org: string): void;
  onCancel(): void;
}

export default function Settings({ org, onSave, onCancel }: SettingsProps) {
  const [orgInput, setOrgInput] = useState(org);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(orgInput);
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
