import { useMemo, useState } from "react";
import type { GitHubUser, PullRequestItem, Tab } from "../types";
import { openOrFocusTab, syncPRTabGroup } from "../tabs";
import { filterPRs } from "../utils/search";
import PRList from "./PRList";
import SearchBar from "./SearchBar";
import { PRListSkeleton } from "./Skeleton";
import { OpenTabsIcon, ReloadIcon, SettingsIcon } from "./Icons";

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
  // One shared filter query, applied to whichever tab is active. Kept across
  // tab switches but not persisted, so it resets when the panel reopens.
  const [query, setQuery] = useState("");

  const activeList = tab === "assigned" ? assigned : merged;
  const filtered = useMemo(() => filterPRs(activeList, query), [activeList, query]);
  const showSearch = !isLoadingPRs && !error && activeList.length > 0;
  const emptyMessage = query
    ? `No PRs match "${query}".`
    : tab === "assigned"
      ? "No open PRs assigned to you."
      : "No PRs merged in the last week.";

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
            <button
              onClick={() => syncPRTabGroup(assigned)}
              className="reload-btn"
              disabled={assigned.length === 0}
              title="Open my open PRs in a tab group (Ctrl/Cmd+Shift+Y)"
            >
              <OpenTabsIcon />
            </button>
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

        {showSearch && (
          <SearchBar
            value={query}
            onChange={setQuery}
            resultCount={filtered.length}
            totalCount={activeList.length}
          />
        )}
      </div>

      <div className="dashboard-scroll">
        {isLoadingPRs ? (
          <PRListSkeleton />
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : tab === "assigned" ? (
          <PRList
            prs={filtered}
            emptyMessage={emptyMessage}
            showChecks
            showBaseBranch
          />
        ) : (
          <PRList
            prs={filtered}
            emptyMessage={emptyMessage}
            showMergedBadge
            showBaseBranch
          />
        )}
      </div>
    </div>
  );
}
