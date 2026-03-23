import { useState } from "react";
import type { GitHubUser, PullRequestItem, Tab } from "../types";
import { openOrFocusTab } from "../tabs";
import PRList from "./PRList";
import { PRListSkeleton } from "./Skeleton";
import { ReloadIcon } from "./Icons";

interface DashboardProps {
  user: GitHubUser;
  assigned: PullRequestItem[];
  reviews: PullRequestItem[];
  merged: PullRequestItem[];
  isLoadingPRs: boolean;
  error: string;
  onLogout(): void;
  onReload(currentTab: Tab): void;
  onTabChange(tab: Tab): void;
}

export default function Dashboard({ user, assigned, reviews, merged, isLoadingPRs, error, onLogout, onReload, onTabChange }: DashboardProps) {
  const [tab, setTab] = useState<Tab>("assigned");

  const pendingReviews = reviews.filter((pr) => pr.my_review_status === "PENDING");
  const reviewedPRs = reviews.filter((pr) => pr.my_review_status && pr.my_review_status !== "PENDING");

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
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="tab-bar">
          {(["assigned", "reviews", "merged"] as Tab[]).map((tabKey) => {
            const count =
              tabKey === "assigned" ? assigned.length
              : tabKey === "reviews" ? reviews.length
              : merged.length;
            const name =
              tabKey === "assigned" ? "My PRs"
              : tabKey === "reviews" ? "Reviews"
              : "Merged";
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
        ) : tab === "reviews" ? (
          <>
            <h3 className="section-heading">Pending review ({pendingReviews.length})</h3>
            <PRList
              prs={pendingReviews}
              emptyMessage="No pending reviews."
              showAuthor
              showMyReview
            />
            {reviewedPRs.length > 0 && (
              <>
                <h3 className="section-heading section-heading--spaced">Reviewed ({reviewedPRs.length})</h3>
                <PRList
                  prs={reviewedPRs}
                  emptyMessage=""
                  showAuthor
                  showMyReview
                />
              </>
            )}
          </>
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
