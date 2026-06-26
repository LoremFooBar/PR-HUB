import { useState } from "react";
import type { GitHubUser, PullRequestItem, Tab } from "../types";
import { openOrFocusTab } from "../tabs";
import PRList from "./PRList";
import { PRListSkeleton } from "./Skeleton";
import { ReloadIcon, SettingsIcon } from "./Icons";

interface DashboardProps {
  user: GitHubUser;
  assigned: PullRequestItem[];
  merged: PullRequestItem[];
  isLoadingPRs: boolean;
  error: string;
  onLogout(): void;
  onReload(currentTab: Tab): void;
  onTabChange(tab: Tab): void;
  onOpenSettings(): void;
}

export default function Dashboard({ user, assigned, merged, isLoadingPRs, error, onLogout, onReload, onTabChange, onOpenSettings }: DashboardProps) {
  const [tab, setTab] = useState<Tab>("assigned");

  return (
    <div className="dashboard">
      <div className="dashboard-fixed">
        <div className="header">
          <a
            href={`https://github.com/${user.login}`}
            onClick={(e) => {
              e.preventDefault();
              openOrFocusTab(`https://github.com/${user.login}`);
            }}
            className="header-profile"
          >
            <img src={user.avatar_url} alt={user.login} className="avatar" />
            <span className="header-username">{user.login}</span>
          </a>
          <div className="header-actions">
            <button onClick={() => onReload(tab)} className="reload-btn" disabled={isLoadingPRs} title="Reload">
              <ReloadIcon />
            </button>
            <button onClick={onOpenSettings} className="reload-btn" title="Settings">
              <SettingsIcon />
            </button>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="tab-bar">
          {(["assigned", "merged"] as Tab[]).map((tabKey) => {
            const count = tabKey === "assigned" ? assigned.length : merged.length;
            const name = tabKey === "assigned" ? "My PRs" : "Merged";
            const label = count > 0 ? `${name} (${count})` : name;
            return (
              <button
                key={tabKey}
                onClick={() => { setTab(tabKey); onTabChange(tabKey); }}
                className={`tab-button${tab === tabKey ? " tab-button--active" : ""}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="dashboard-scroll">
        {isLoadingPRs ? (
          <PRListSkeleton />
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : tab === "assigned" ? (
          <PRList
            prs={assigned}
            emptyMessage="No open PRs assigned to you."
            showChecks
            showBaseBranch
          />
        ) : (
          <PRList
            prs={merged}
            emptyMessage="No PRs merged in the last week."
            showMergedBadge
            showBaseBranch
          />
        )}
      </div>
    </div>
  );
}
