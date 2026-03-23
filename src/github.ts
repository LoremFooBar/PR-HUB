import type { GitHubUser, PullRequestItem, CheckStatus, ReviewStatus } from "./types";
import { getRepoName } from "./utils/repo";
import { oneWeekAgo, oneMonthAgo } from "./utils/time";

export type { GitHubUser, PullRequestItem, CheckStatus, ReviewStatus };
export { getRepoName };

interface SearchResponse {
  items: PullRequestItem[];
}

interface PRDetail {
  head: { sha: string; ref: string };
  base: { ref: string };
  comments: number;
  review_comments: number;
  mergeable_state?: string;
}

interface Review {
  state: string;
  user: { login: string };
}

interface CombinedStatus {
  state: string;
  total_count: number;
}

const API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
}

export async function validateToken(token: string): Promise<GitHubUser> {
  const res = await fetch(`${API}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error("Invalid token");
  return res.json();
}

async function searchPRs(token: string, query: string): Promise<PullRequestItem[]> {
  const encodedQuery = encodeURIComponent(query);
  const res = await fetch(`${API}/search/issues?q=${encodedQuery}&per_page=100`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`Search failed: ${query}`);
  const data: SearchResponse = await res.json();
  return data.items;
}

async function enrichPR(
  token: string,
  pr: PullRequestItem,
): Promise<PullRequestItem> {
  const repo = getRepoName(pr.repository_url);

  try {
    const [prRes, reviewsRes] = await Promise.all([
      fetch(`${API}/repos/${repo}/pulls/${pr.number}`, { headers: headers(token) }),
      fetch(`${API}/repos/${repo}/pulls/${pr.number}/reviews?per_page=100`, { headers: headers(token) }),
    ]);

    let approvalCount = 0;
    let changesRequestedCount = 0;
    if (reviewsRes.ok) {
      const reviews: Review[] = await reviewsRes.json();
      const latest = new Map<string, string>();
      for (const review of reviews) {
        if (review.state === "APPROVED" || review.state === "CHANGES_REQUESTED") {
          latest.set(review.user.login, review.state);
        }
      }
      for (const state of latest.values()) {
        if (state === "APPROVED") approvalCount++;
        else if (state === "CHANGES_REQUESTED") changesRequestedCount++;
      }
    }

    let totalComments = pr.comments ?? 0;
    let commitSha = "";
    let baseRef = "";
    let headRef = "";
    let behind = false;
    if (prRes.ok) {
      const detail: PRDetail = await prRes.json();
      totalComments += detail.review_comments ?? 0;
      commitSha = detail.head.sha;
      baseRef = detail.base.ref;
      headRef = detail.head.ref;
      behind = detail.mergeable_state === "behind";
    }

    let checkStatus: CheckStatus = "pending";
    if (commitSha) {
      const [statusRes, checksRes] = await Promise.all([
        fetch(`${API}/repos/${repo}/commits/${commitSha}/status`, { headers: headers(token) }),
        fetch(`${API}/repos/${repo}/commits/${commitSha}/check-runs`, { headers: headers(token) }),
      ]);

      let commitState = "pending";
      let commitCount = 0;
      if (statusRes.ok) {
        const status: CombinedStatus = await statusRes.json();
        commitState = status.state;
        commitCount = status.total_count;
      }

      let checkRunsConclusion: CheckStatus = "pending";
      let checkRunsCount = 0;
      if (checksRes.ok) {
        const checks: { total_count: number; check_runs: { conclusion: string | null; status: string }[] } =
          await checksRes.json();
        checkRunsCount = checks.total_count;
        if (checks.total_count > 0) {
          const hasFailure = checks.check_runs.some(
            (run) => run.conclusion === "failure" || run.conclusion === "timed_out" || run.conclusion === "cancelled",
          );
          const allComplete = checks.check_runs.every((run) => run.status === "completed");
          if (hasFailure) checkRunsConclusion = "failure";
          else if (allComplete) checkRunsConclusion = "success";
        }
      }

      const noCI = commitCount === 0 && checkRunsCount === 0;
      if (noCI) {
        checkStatus = "success";
      } else if (commitState === "failure" || commitState === "error" || checkRunsConclusion === "failure") {
        checkStatus = "failure";
      } else if (commitState === "pending" || checkRunsConclusion === "pending") {
        checkStatus = "pending";
      } else {
        checkStatus = "success";
      }
    }

    return { ...pr, comments: totalComments, check_status: checkStatus, approvals: approvalCount, changes_requested: changesRequestedCount, base_ref: baseRef || undefined, head_ref: headRef || undefined, behind };
  } catch {
    return pr;
  }
}

async function enrichReviewPR(
  token: string,
  pr: PullRequestItem,
  username: string,
): Promise<PullRequestItem> {
  const repo = getRepoName(pr.repository_url);
  try {
    const res = await fetch(
      `${API}/repos/${repo}/pulls/${pr.number}/reviews?per_page=100`,
      { headers: headers(token) },
    );
    if (!res.ok) return { ...pr, my_review_status: "PENDING" };
    const reviews: Review[] = await res.json();
    let myStatus: ReviewStatus = "PENDING";
    for (const review of reviews) {
      if (review.user.login === username && (review.state === "APPROVED" || review.state === "CHANGES_REQUESTED" || review.state === "COMMENTED")) {
        myStatus = review.state as ReviewStatus;
      }
    }
    return { ...pr, my_review_status: myStatus };
  } catch {
    return { ...pr, my_review_status: "PENDING" };
  }
}

export async function fetchAuthoredPRs(
  token: string,
  username: string,
): Promise<PullRequestItem[]> {
  const authored = await searchPRs(token, `type:pr author:${username} is:open`);
  return Promise.all(authored.map((pr) => enrichPR(token, pr)));
}

export async function fetchReviewPRs(
  token: string,
  username: string,
): Promise<PullRequestItem[]> {
  const since = oneMonthAgo();
  const [pendingReviews, reviewedByMe] = await Promise.all([
    searchPRs(token, `type:pr review-requested:${username} is:open created:>${since}`),
    searchPRs(token, `type:pr reviewed-by:${username} is:open created:>${since}`),
  ]);

  const seen = new Set<number>();
  const allReviews: PullRequestItem[] = [];
  for (const pr of [...pendingReviews, ...reviewedByMe]) {
    if (!seen.has(pr.id)) {
      seen.add(pr.id);
      allReviews.push(pr);
    }
  }

  return Promise.all(allReviews.map((pr) => enrichReviewPR(token, pr, username)));
}

async function fetchBaseRef(
  token: string,
  pr: PullRequestItem,
): Promise<PullRequestItem> {
  const repo = getRepoName(pr.repository_url);
  try {
    const res = await fetch(`${API}/repos/${repo}/pulls/${pr.number}`, { headers: headers(token) });
    if (res.ok) {
      const detail: PRDetail = await res.json();
      return { ...pr, base_ref: detail.base.ref, head_ref: detail.head.ref };
    }
  } catch { /* fall through */ }
  return pr;
}

export async function fetchMergedPRs(
  token: string,
  username: string,
): Promise<PullRequestItem[]> {
  const mergedSince = oneWeekAgo();
  const merged = await searchPRs(token, `type:pr author:${username} is:merged merged:>${mergedSince}`);
  return Promise.all(merged.map((pr) => fetchBaseRef(token, pr)));
}
