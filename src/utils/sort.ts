import type { PullRequestItem } from "../types";

// How PRs are ordered, both in the panel list and in the "My PRs" tab group.
// All ascending:
// "ticket_date" — by ticket id, then oldest first.
// "title" — alphabetical by title.
// "title_date" — alphabetical by title, oldest first as a tiebreaker.
// "date" — oldest first by creation date.
export type PRSortOrder = "ticket_date" | "title" | "title_date" | "date";

// A ticket id such as `PLA-1032` at the start of the title, possibly behind
// non-alphanumeric characters such as an opening square bracket.
const TICKET_PATTERN = /^[^A-Za-z0-9]*([A-Za-z]{2,10})-(\d+)\b/;

interface TicketId {
  key: string;
  number: number;
}

function parseTicketId(title: string): TicketId | null {
  const match = TICKET_PATTERN.exec(title);
  return match ? { key: match[1], number: Number(match[2]) } : null;
}

// Ticketed PRs first, by project key and then by ticket number as a number —
// string order would put PLA-1032 before PLA-190. Ties (same ticket id, or
// neither title carrying one) are left to the caller's next key.
function byTicket(a: PullRequestItem, b: PullRequestItem): number {
  const ticketA = parseTicketId(a.title);
  const ticketB = parseTicketId(b.title);
  if (!ticketA || !ticketB) return ticketA ? -1 : ticketB ? 1 : 0;
  return (
    ticketA.key.localeCompare(ticketB.key, undefined, { sensitivity: "base" }) ||
    ticketA.number - ticketB.number
  );
}

function byTitle(a: PullRequestItem, b: PullRequestItem): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function byDate(a: PullRequestItem, b: PullRequestItem): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

// PRs already reviewed by the user come after the fresh review requests, in
// every order. Only the Reviews tab sets the flag, so this is inert elsewhere.
function byReviewed(a: PullRequestItem, b: PullRequestItem): number {
  return Number(a.reviewed_by_me ?? false) - Number(b.reviewed_by_me ?? false);
}

type Comparator = (a: PullRequestItem, b: PullRequestItem) => number;

function comparatorFor(order: PRSortOrder): Comparator {
  switch (order) {
    case "date":
      return byDate;
    case "title":
      return byTitle;
    case "title_date":
      return (a, b) => byTitle(a, b) || byDate(a, b);
    case "ticket_date":
    default:
      return (a, b) => byTicket(a, b) || byDate(a, b) || byTitle(a, b);
  }
}

export function sortPRs(prs: PullRequestItem[], order: PRSortOrder): PullRequestItem[] {
  const then = comparatorFor(order);
  return [...prs].sort((a, b) => byReviewed(a, b) || then(a, b));
}
