import { useState, useCallback } from "react";
import { getRepoName } from "../github";
import { openOrFocusTab } from "../tabs";
import type { PullRequestItem, ReviewStatus } from "../types";

const PAGE_SIZE = 10;
const PRODUCTION_BRANCHES = new Set(["main", "master"]);

type MergeStatus = "ready" | "blocked" | "behind" | "pending";

function getMergeStatus(pr: PullRequestItem): { status: MergeStatus; reason: string } {
  const ciFailed = pr.check_status === "failure";
  const hasChangesRequested = (pr.changes_requested ?? 0) > 0;

  if (ciFailed && hasChangesRequested) return { status: "blocked", reason: "CI failed & changes requested" };
  if (ciFailed) return { status: "blocked", reason: "CI failed" };
  if (hasChangesRequested) return { status: "blocked", reason: "Changes requested" };

  const ciPassed = pr.check_status === "success";
  const hasApprovals = (pr.approvals ?? 0) > 0;

  if (ciPassed && hasApprovals && pr.behind) return { status: "behind", reason: "Branch needs update" };
  if (ciPassed && hasApprovals) return { status: "ready", reason: "Ready to merge" };
  if (pr.behind) return { status: "behind", reason: "Branch needs update" };

  if (!ciPassed && !hasApprovals) return { status: "pending", reason: "Pending CI & reviews" };
  if (!ciPassed) return { status: "pending", reason: "CI pending" };
  return { status: "pending", reason: "Awaiting reviews" };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const reviewLabels: Record<ReviewStatus, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  COMMENTED: "Commented",
  PENDING: "Pending review",
};

const reviewCssClass: Record<ReviewStatus, string> = {
  APPROVED: "review-badge--approved",
  CHANGES_REQUESTED: "review-badge--changes",
  COMMENTED: "review-badge--commented",
  PENDING: "review-badge--pending",
};

interface PRListProps {
  prs: PullRequestItem[];
  emptyMessage: string;
  showAuthor?: boolean;
  showChecks?: boolean;
  showMyReview?: boolean;
  showMergedBadge?: boolean;
  showBaseBranch?: boolean;
}

export default function PRList({ prs, emptyMessage, showAuthor, showChecks, showMyReview, showMergedBadge, showBaseBranch }: PRListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  if (prs.length === 0) {
    return <p className="muted-text">{emptyMessage}</p>;
  }

  const visiblePRs = prs.slice(0, visible);
  const remainingCount = prs.length - visible;

  return (
    <>
      <ul className="pr-list">
        {visiblePRs.map((pr) => {
          const mergeStatus = showChecks ? getMergeStatus(pr) : null;
          const isProd = pr.base_ref ? PRODUCTION_BRANCHES.has(pr.base_ref) : false;

          return (
            <li
              key={pr.id}
              className={
                "pr-item"
                + (showChecks || showMergedBadge ? " pr-item--with-badge" : "")
                + (mergeStatus ? ` pr-item--${mergeStatus.status}` : "")
              }
              onClick={(e) => {
                if ((e.target as HTMLElement).closest(".pr-item-hover-actions")) return;
                openOrFocusTab(pr.html_url);
              }}
            >
              <div className="pr-item-content">
                <a
                  href={pr.html_url}
                  onClick={(e) => {
                    e.preventDefault();
                    openOrFocusTab(pr.html_url);
                  }}
                  className="link"
                >
                  {pr.title}
                </a>

                <div className="pr-meta">
                  <span className="pr-repo">{getRepoName(pr.repository_url)}</span>
                  {showBaseBranch && pr.base_ref && (
                    <>
                      <span className="pr-meta-sep">&rarr;</span>
                      <span className={`pr-base-ref${isProd ? " pr-base-ref--prod" : ""}`}>
                        {isProd && (
                          <svg className="pr-prod-icon" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Zm4.03 4.22a.75.75 0 0 1 0 1.06L4.56 8l1.22 1.22a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.75-1.75a.75.75 0 0 1 0-1.06l1.75-1.75a.75.75 0 0 1 1.06 0Zm4.44-1.06a.75.75 0 0 1 1.06 0l1.75 1.75a.75.75 0 0 1 0 1.06l-1.75 1.75a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L11.44 8l-1.22-1.22a.75.75 0 0 1 0-1.06Zm-2.72-.78a.75.75 0 0 1 .53.92l-1.5 5.5a.75.75 0 1 1-1.44-.39l1.5-5.5a.75.75 0 0 1 .91-.53Z" />
                          </svg>
                        )}
                        {pr.base_ref}
                      </span>
                    </>
                  )}
                  {!showBaseBranch && isProd && (
                    <>
                      <span className="pr-base-ref pr-base-ref--prod">
                        <svg className="pr-prod-icon" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8.22 1.754a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.25-5.25a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0Z" />
                        </svg>
                        {pr.base_ref}
                      </span>
                    </>
                  )}
                  {pr.created_at && (
                    <span className="pr-date">{timeAgo(pr.created_at)}</span>
                  )}
                </div>

                {showChecks && (
                  <div className="pr-meta pr-stats">
                    {(pr.comments ?? 0) > 0 && (
                      <span className="pr-stat" title="Comments">
                        💬 {pr.comments}
                      </span>
                    )}
                    {(pr.approvals ?? 0) > 0 && (
                      <span className="pr-stat pr-stat--success" title="Approvals">
                        ✓ {pr.approvals}
                      </span>
                    )}
                    {(pr.changes_requested ?? 0) > 0 && (
                      <span className="pr-stat pr-stat--danger" title="Changes requested">
                        ✗ {pr.changes_requested}
                      </span>
                    )}
                  </div>
                )}

                {showAuthor && (
                  <div className="pr-meta-row">
                    {pr.user && (
                      <span className="pr-author">
                        <img src={pr.user.avatar_url} alt={pr.user.login} className="pr-author-avatar" />
                        {pr.user.login}
                      </span>
                    )}
                    {showMyReview && pr.my_review_status && (
                      <span className={`review-badge ${reviewCssClass[pr.my_review_status]}`}>
                        {reviewLabels[pr.my_review_status]}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Hover-reveal copy actions */}
              <div className="pr-item-hover-actions">
                {pr.head_ref && (
                  <button
                    className={`pr-copy-btn${copiedId === `branch-${pr.id}` ? " pr-copy-btn--copied" : ""}`}
                    data-tooltip={copiedId === `branch-${pr.id}` ? "Copied!" : "Copy branch"}
                    onClick={() => copyToClipboard(pr.head_ref!, `branch-${pr.id}`)}
                  >
                    {copiedId === `branch-${pr.id}` ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.75 2.5a.75.75 0 0 1 .75.75v0a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1-.75-.75v0a.75.75 0 0 1 .75-.75Zm-7.252.47a.75.75 0 0 1 1.06.024L6.5 4.005l.942-1.01a.75.75 0 0 1 1.098 1.022l-1.468 1.576a.75.75 0 0 1-1.098 0L4.506 4.017a.75.75 0 0 1 .024-1.06Z" />
                        <path d="M1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25V1.75C0 .784.784 0 1.75 0ZM1.5 1.75v12.5c0 .138.112.25.25.25H6.5v-15H1.75a.25.25 0 0 0-.25.25ZM8 15h6.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H8Z" />
                      </svg>
                    )}
                  </button>
                )}
                <button
                  className={`pr-copy-btn${copiedId === `url-${pr.id}` ? " pr-copy-btn--copied" : ""}`}
                  data-tooltip={copiedId === `url-${pr.id}` ? "Copied!" : "Copy URL"}
                  onClick={() => copyToClipboard(pr.html_url, `url-${pr.id}`)}
                >
                  {copiedId === `url-${pr.id}` ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z" />
                    </svg>
                  )}
                </button>
              </div>

              {mergeStatus && (
                <span
                  className={`check-badge check-badge--${mergeStatus.status}`}
                  title={mergeStatus.reason}
                >
                  {mergeStatus.status === "ready" ? "\u2713" : mergeStatus.status === "blocked" ? "\u2717" : mergeStatus.status === "behind" ? "\u2191" : "\u25CF"}
                </span>
              )}
              {showMergedBadge && (
                <span className="check-badge check-badge--merged" title="Merged">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8-8a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.25 4a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                  </svg>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {remainingCount > 0 && (
        <button
          className="btn-show-more"
          onClick={() => setVisible((prev) => prev + PAGE_SIZE)}
        >
          Show more ({remainingCount} remaining)
        </button>
      )}
    </>
  );
}
