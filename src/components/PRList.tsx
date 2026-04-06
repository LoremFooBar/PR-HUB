import { getRepoName } from "../github";
import { openOrFocusTab } from "../tabs";
import type { PullRequestItem, MergeStatus } from "../types";
import { PRODUCTION_BRANCHES, reviewLabels, reviewCssClass } from "../constants";
import { getMergeStatus } from "../utils/merge-status";
import { timeAgo } from "../utils/time";
import { usePRList } from "../hooks/usePRList";
import { CheckIcon, BranchIcon, LinkIcon, MergeIcon, CodeIcon, WarningIcon } from "./Icons";

interface PRListProps {
  prs: PullRequestItem[];
  emptyMessage: string;
  showAuthor?: boolean;
  showChecks?: boolean;
  showMyReview?: boolean;
  showMergedBadge?: boolean;
  showBaseBranch?: boolean;
}

const MERGE_STATUS_CHAR: Record<MergeStatus, string> = {
  ready: "\u2713",
  blocked: "\u2717",
  behind: "\u2191",
  pending: "\u25CF",
};

function BranchCopyButton({ id, copiedId, onClick }: {
  id: string;
  copiedId: string | null;
  onClick: () => void;
}) {
  const isCopied = copiedId === id;
  return (
    <button
      className={`pr-copy-btn${isCopied ? " pr-copy-btn--copied" : ""}`}
      data-tooltip={isCopied ? "Copied!" : "Copy branch"}
      onClick={onClick}
    >
      {isCopied ? <CheckIcon /> : <BranchIcon />}
    </button>
  );
}

function UrlCopyButton({ id, copiedId, onClick }: {
  id: string;
  copiedId: string | null;
  onClick: () => void;
}) {
  const isCopied = copiedId === id;
  return (
    <button
      className={`pr-copy-btn${isCopied ? " pr-copy-btn--copied" : ""}`}
      data-tooltip={isCopied ? "Copied!" : "Copy URL"}
      onClick={onClick}
    >
      {isCopied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
}

function BaseBranchBadge({ baseRef, isProd, showBranch }: {
  baseRef?: string;
  isProd: boolean;
  showBranch?: boolean;
}) {
  if (showBranch && baseRef) {
    return (
      <>
        <span className="pr-meta-sep">&rarr;</span>
        <span className={`pr-base-ref${isProd ? " pr-base-ref--prod" : ""}`}>
          {isProd && <CodeIcon size={10} className="pr-prod-icon" />}
          {baseRef}
        </span>
      </>
    );
  }

  if (!showBranch && isProd) {
    return (
      <span className="pr-base-ref pr-base-ref--prod">
        <WarningIcon size={10} className="pr-prod-icon" />
        {baseRef}
      </span>
    );
  }

  return null;
}

function PRItemBadge({ mergeStatus, showMergedBadge }: {
  mergeStatus: ReturnType<typeof getMergeStatus> | null;
  showMergedBadge?: boolean;
}) {
  return (
    <>
      {mergeStatus && (
        <span className={`check-badge check-badge--${mergeStatus.status}`} title={mergeStatus.reason}>
          {MERGE_STATUS_CHAR[mergeStatus.status]}
        </span>
      )}
      {showMergedBadge && (
        <span className="check-badge check-badge--merged" title="Merged">
          <MergeIcon size={12} />
        </span>
      )}
    </>
  );
}

export default function PRList({ prs, emptyMessage, showAuthor, showChecks, showMyReview, showMergedBadge, showBaseBranch }: PRListProps) {
  const { visiblePRs, remainingCount, copiedId, copyToClipboard, showMore } = usePRList(prs);

  if (prs.length === 0) {
    return <p className="muted-text">{emptyMessage}</p>;
  }

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
                <a href={pr.html_url} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openOrFocusTab(pr.html_url); }} className="link">
                  {pr.title}
                </a>

                <div className="pr-meta">
                  <span className="pr-repo">{getRepoName(pr.repository_url)}</span>
                  <BaseBranchBadge baseRef={pr.base_ref} isProd={isProd} showBranch={showBaseBranch} />
                  {pr.created_at && <span className="pr-date">{timeAgo(pr.created_at)}</span>}
                </div>

                {showChecks && (
                  <div className="pr-meta pr-stats">
                    {(pr.comments ?? 0) > 0 && <span className="pr-stat" title="Comments">💬 {pr.comments}</span>}
                    {(pr.approvals ?? 0) > 0 && <span className="pr-stat pr-stat--success" title="Approvals">✓ {pr.approvals}</span>}
                    {(pr.changes_requested ?? 0) > 0 && <span className="pr-stat pr-stat--danger" title="Changes requested">✗ {pr.changes_requested}</span>}
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

              <div className="pr-item-hover-actions">
                {pr.head_ref && (
                  <BranchCopyButton id={`branch-${pr.id}`} copiedId={copiedId} onClick={() => copyToClipboard(pr.head_ref!, `branch-${pr.id}`)} />
                )}
                <UrlCopyButton id={`url-${pr.id}`} copiedId={copiedId} onClick={() => copyToClipboard(pr.html_url, `url-${pr.id}`)} />
              </div>

              <PRItemBadge mergeStatus={mergeStatus} showMergedBadge={showMergedBadge} />
            </li>
          );
        })}
      </ul>
      {remainingCount > 0 && (
        <button className="btn-show-more" onClick={showMore}>
          Show more ({remainingCount} remaining)
        </button>
      )}
    </>
  );
}
