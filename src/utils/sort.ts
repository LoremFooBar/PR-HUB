import type { PullRequestItem } from "../types";

// How the tabs in the "My PRs" group are ordered. All ascending:
// "title" — alphabetical by title.
// "title_date" — alphabetical by title, oldest first as a tiebreaker.
// "date" — oldest first by creation date.
export type TabSortOrder = "title" | "title_date" | "date";

function byTitle(a: PullRequestItem, b: PullRequestItem): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function byDate(a: PullRequestItem, b: PullRequestItem): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function sortPRsForTabGroup(
  prs: PullRequestItem[],
  order: TabSortOrder
): PullRequestItem[] {
  const sorted = [...prs];
  switch (order) {
    case "date":
      return sorted.sort(byDate);
    case "title_date":
      return sorted.sort((a, b) => byTitle(a, b) || byDate(a, b));
    case "title":
    default:
      return sorted.sort(byTitle);
  }
}
