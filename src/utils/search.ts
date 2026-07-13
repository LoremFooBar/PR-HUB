import type { PullRequestItem } from "../types";
import { getRepoName } from "./repo";

// Everything a PR can be matched against: title, repo, both branch names, author.
function haystack(pr: PullRequestItem): string {
  return [pr.title, getRepoName(pr.repository_url), pr.head_ref, pr.base_ref, pr.user?.login]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// Token-AND substring match: every whitespace-separated token must appear
// somewhere in the PR's searchable text (case-insensitive). Empty query =
// no filtering, and returns the input array unchanged to keep its identity
// stable (callers rely on this for pagination reset).
export function filterPRs(prs: PullRequestItem[], query: string): PullRequestItem[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return prs;
  return prs.filter((pr) => {
    const text = haystack(pr);
    return tokens.every((token) => text.includes(token));
  });
}
