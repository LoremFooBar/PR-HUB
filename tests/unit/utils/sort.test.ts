import { sortPRs } from "../../../src/utils/sort";
import type { PullRequestItem } from "../../../src/types";

function makePR(overrides: Partial<PullRequestItem> = {}): PullRequestItem {
  return {
    id: 1,
    number: 1,
    title: "Fix login bug",
    html_url: "https://github.com/owner/repo/pull/1",
    repository_url: "https://api.github.com/repos/owner/repo",
    created_at: "2024-01-01T00:00:00Z",
    comments: 0,
    ...overrides,
  };
}

describe("sortPRs", () => {
  const banana = makePR({ id: 1, title: "Banana", created_at: "2024-03-01T00:00:00Z" });
  const apple = makePR({ id: 2, title: "apple", created_at: "2024-02-01T00:00:00Z" });
  const cherry = makePR({ id: 3, title: "Cherry", created_at: "2024-01-01T00:00:00Z" });

  it("sorts by title, case-insensitive", () => {
    const result = sortPRs([banana, apple, cherry], "title");
    expect(result.map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("sorts by date, oldest first", () => {
    const result = sortPRs([banana, apple, cherry], "date");
    expect(result.map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it("sorts by title, then date as a tiebreaker", () => {
    const older = makePR({ id: 10, title: "Same", created_at: "2024-01-01T00:00:00Z" });
    const newer = makePR({ id: 11, title: "Same", created_at: "2024-06-01T00:00:00Z" });
    const result = sortPRs([newer, older], "title_date");
    expect(result.map((p) => p.id)).toEqual([10, 11]);
  });

  it("does not mutate the input array", () => {
    const input = [banana, apple, cherry];
    sortPRs(input, "title");
    expect(input.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("puts the PRs already reviewed by the user last, whatever the order", () => {
    const reviewed = makePR({ id: 1, title: "[PLA-1] first", reviewed_by_me: true });
    const fresh = makePR({ id: 2, title: "[PLA-9] second" });
    for (const order of ["ticket_date", "title", "title_date", "date"] as const) {
      expect(sortPRs([reviewed, fresh], order).map((p) => p.id)).toEqual([2, 1]);
    }
  });
});

describe("sortPRs, by ticket number then date", () => {
  const first = (a: Partial<PullRequestItem>, b: Partial<PullRequestItem>) =>
    sortPRs([makePR(a), makePR(b)], "ticket_date")[0].title;

  it("sorts ticket ids by number, not as text", () => {
    const titles = [
      "[PLA-1032] Integration health",
      "[PLA-190] Emit detection",
      "PLA-288 clusters tool",
      "[PLA-930] consumerv2",
    ];
    const result = sortPRs(
      titles.map((title, i) => makePR({ id: i, title })),
      "ticket_date"
    );
    expect(result.map((p) => p.title)).toEqual([
      "[PLA-190] Emit detection",
      "PLA-288 clusters tool",
      "[PLA-930] consumerv2",
      "[PLA-1032] Integration health",
    ]);
  });

  it("orders by project key before ticket number", () => {
    expect(first({ title: "[PLA-1] y" }, { title: "[ABC-9000] x" })).toBe("[ABC-9000] x");
    expect(first({ title: "pla-5 lower case key" }, { title: "[ABC-9000] x" })).toBe("[ABC-9000] x");
  });

  it("reads a ticket id behind non-alphanumeric characters", () => {
    expect(first({ title: "[PLA-10] late" }, { title: "  ([PLA-2] early" })).toBe("  ([PLA-2] early");
  });

  it("puts titles without a ticket id last", () => {
    expect(first({ title: "Apple pie" }, { title: "[PLA-1032] zebra" })).toBe("[PLA-1032] zebra");
    expect(first({ title: "fix: PLA-2 not at the start" }, { title: "[PLA-10] ticketed" })).toBe(
      "[PLA-10] ticketed"
    );
  });

  it("breaks a same-ticket tie by date, oldest first", () => {
    expect(
      first(
        { title: "[PLA-7] a newer follow-up", created_at: "2024-06-01T00:00:00Z" },
        { title: "[PLA-7] b older", created_at: "2024-01-01T00:00:00Z" }
      )
    ).toBe("[PLA-7] b older");
  });

  it("breaks a same-ticket, same-date tie by title", () => {
    expect(first({ title: "[PLA-7] banana" }, { title: "[PLA-7] apple" })).toBe("[PLA-7] apple");
  });

  it("orders PRs without a ticket id among themselves by date", () => {
    expect(
      first(
        { title: "Apple pie", created_at: "2024-06-01T00:00:00Z" },
        { title: "Zebra crossing", created_at: "2024-01-01T00:00:00Z" }
      )
    ).toBe("Zebra crossing");
  });
});
