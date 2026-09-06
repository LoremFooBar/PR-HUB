import type { PullRequestItem } from "../types";
import { getRepoName } from "./repo";

// Everything a PR can be matched against: title, repo, both branch names, author.
function haystack(pr: PullRequestItem): string {
  return [pr.title, getRepoName(pr.repository_url), pr.head_ref, pr.base_ref, pr.user?.login]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const HASH_NUMBER = /^#(\d+)$/;
const BARE_NUMBER = /^\d+$/;

// A "#215" token is an explicit PR-number search and never falls back to text,
// so it can pick out one PR even when the digits also appear in some title.
// A bare "215" matches either, since a ticket id fragment and a PR number look
// the same when typed.
function matchesToken(pr: PullRequestItem, text: string, token: string): boolean {
  const hashed = HASH_NUMBER.exec(token);
  if (hashed) return pr.number === Number(hashed[1]);
  if (BARE_NUMBER.test(token) && pr.number === Number(token)) return true;
  return text.includes(token);
}

// Token-AND match: every whitespace-separated token must match the PR, by
// substring over its searchable text or by PR number (case-insensitive). Empty
// query = no filtering, and returns the input array unchanged to keep its
// identity stable (callers rely on this for pagination reset).
export function filterPRs(prs: PullRequestItem[], query: string): PullRequestItem[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return prs;
  return prs.filter((pr) => {
    const text = haystack(pr);
    return tokens.every((token) => matchesToken(pr, text, token));
  });
}
