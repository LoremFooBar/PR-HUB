import { useMemo, useState } from "react";
import type { GitHubUser, Tab } from "../types";
import { ALL_TABS } from "../constants";
import { openOrFocusTab, syncPRTabGroup } from "../tabs";
import type { TabData } from "../hooks/useApp";
import { filterPRs } from "../utils/search";
import PRList, { type PRListProps } from "./PRList";
import SearchBar from "./SearchBar";
import { PRListSkeleton } from "./Skeleton";
import { OpenTabsIcon, ReloadIcon, SettingsIcon } from "./Icons";

interface DashboardProps {
  user: GitHubUser;
  prs: TabData;
  isLoadingPRs: boolean;
  error: string;
  onLogout(): void;
  onReload(currentTab: Tab): void;
  onTabChange(tab: Tab): void;
  onOpenSettings(): void;
}

// Per-tab presentation: label, empty state, and which PRList columns apply.
const TAB_VIEW: Record<Tab, { name: string; empty: string; list: Omit<PRListProps, "prs" | "emptyMessage"> }> = {
  assigned: {
    name: "My PRs",
    empty: "No open PRs assigned to you.",
    list: { showChecks: true, showBaseBranch: true, showDraftTag: true },
  },
  review: {
    name: "Reviews",
    empty: "No PRs are waiting on your review.",
    list: { showChecks: true, showBaseBranch: true, showAuthor: true, showReviewedTag: true, showDraftTag: true },
  },
  merged: {
    name: "Merged",
    empty: "No PRs merged in the last week.",
    list: { showMergedBadge: true, showBaseBranch: true },
  },
};

export default function Dashboard({ user, prs, isLoadingPRs, error, onLogout, onReload, onTabChange, onOpenSettings }: DashboardProps) {
  const [tab, setTab] = useState<Tab>("assigned");
  // One shared filter query, applied to whichever tab is active. Kept across
  // tab switches but not persisted, so it resets when the panel reopens.
  const [query, setQuery] = useState("");

  const view = TAB_VIEW[tab];
  const activeList = prs[tab];
  const filtered = useMemo(() => filterPRs(activeList, query), [activeList, query]);
  const showSearch = !isLoadingPRs && !error && activeList.length > 0;
  const emptyMessage = query ? `No PRs match "${query}".` : view.empty;

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
              onClick={() => syncPRTabGroup(prs.assigned)}
              className="reload-btn"
              disabled={prs.assigned.length === 0}
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
          {ALL_TABS.map((tabKey) => {
            const count = prs[tabKey].length;
            const { name } = TAB_VIEW[tabKey];
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
        ) : (
          <PRList prs={filtered} emptyMessage={emptyMessage} {...view.list} />
        )}
      </div>
    </div>
  );
}
