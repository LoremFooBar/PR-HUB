// Sub-pages (/files, /commits), query strings and fragments all collapse to the
// canonical PR URL, so a link anywhere on a page can be matched against the
// html_url values stored in the cache.
const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;

export function normalizePRUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname.replace(/^www\./, "") !== "github.com") return null;
  const match = PR_PATH.exec(parsed.pathname);
  if (!match) return null;
  const [, owner, repo, number] = match;
  return `https://github.com/${owner}/${repo}/pull/${number}`;
}
