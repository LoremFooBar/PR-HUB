import { sortPRsForTabGroup } from "../../../src/utils/sort";
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

describe("sortPRsForTabGroup", () => {
  const banana = makePR({ id: 1, title: "Banana", created_at: "2024-03-01T00:00:00Z" });
  const apple = makePR({ id: 2, title: "apple", created_at: "2024-02-01T00:00:00Z" });
  const cherry = makePR({ id: 3, title: "Cherry", created_at: "2024-01-01T00:00:00Z" });

  it("sorts by title, case-insensitive", () => {
    const result = sortPRsForTabGroup([banana, apple, cherry], "title");
    expect(result.map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("sorts by date, oldest first", () => {
    const result = sortPRsForTabGroup([banana, apple, cherry], "date");
    expect(result.map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it("sorts by title, then date as a tiebreaker", () => {
    const older = makePR({ id: 10, title: "Same", created_at: "2024-01-01T00:00:00Z" });
    const newer = makePR({ id: 11, title: "Same", created_at: "2024-06-01T00:00:00Z" });
    const result = sortPRsForTabGroup([newer, older], "title_date");
    expect(result.map((p) => p.id)).toEqual([10, 11]);
  });

  it("does not mutate the input array", () => {
    const input = [banana, apple, cherry];
    sortPRsForTabGroup(input, "title");
    expect(input.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});
