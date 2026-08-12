import { useState } from "react";
import { GROUP_COLORS, type AppSettings, type PRSortOrder } from "../storage";

const SORT_ORDERS: { value: PRSortOrder; label: string }[] = [
  { value: "ticket_date", label: "By ticket number, then date" },
  { value: "title", label: "By title" },
  { value: "title_date", label: "By title, then date" },
  { value: "date", label: "By date" },
];

interface SettingsProps {
  settings: AppSettings;
  onSave(settings: AppSettings): void;
  onCancel(): void;
}

export default function Settings({ settings, onSave, onCancel }: SettingsProps) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
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
        value={draft.org}
        onChange={(e) => update("org", e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        className="input"
        autoFocus
      />
      <label className="settings-label">Automatic tab group sync</label>
      <label className="settings-checkbox">
        <input
          type="checkbox"
          checked={draft.autoSync}
          onChange={(e) => update("autoSync", e.target.checked)}
        />
        Build and keep the "My PRs" group in sync on each background refresh
      </label>
      <label className="settings-label">Hover preview on PR links</label>
      <label className="settings-checkbox">
        <input
          type="checkbox"
          checked={draft.linkPreview}
          onChange={(e) => update("linkPreview", e.target.checked)}
        />
        Preview cached PRs when hovering their links outside github.com
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
            checked={draft.strayTabAction === "ungroup"}
            onChange={() => update("strayTabAction", "ungroup")}
          />
          Move it out of the group
        </label>
        <label className="settings-radio">
          <input
            type="radio"
            name="stray-tab-action"
            checked={draft.strayTabAction === "keep"}
            onChange={() => update("strayTabAction", "keep")}
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
            aria-checked={draft.groupColor === color}
            title={color}
            className={
              "settings-color-swatch swatch-" + color + (draft.groupColor === color ? " selected" : "")
            }
            onClick={() => update("groupColor", color)}
          />
        ))}
      </div>
      <label className="settings-label">PR order</label>
      <p className="settings-hint">
        Applies to the list in this panel and to the tabs in the "My PRs" group.
        A ticket number is one at the start of the PR title, such as ABC-1234.
      </p>
      <div className="settings-radio-group">
        {SORT_ORDERS.map(({ value, label }) => (
          <label key={value} className="settings-radio">
            <input
              type="radio"
              name="pr-sort-order"
              checked={draft.prSortOrder === value}
              onChange={() => update("prSortOrder", value)}
            />
            {label}
          </label>
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
