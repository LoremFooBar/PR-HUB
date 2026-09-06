import { filterPRs } from "../../../src/utils/search";
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

describe("filterPRs", () => {
  const prs = [
    makePR({ id: 1, title: "[PLA-252] Fix agent rendering" }),
    makePR({ id: 2, title: "[DAY-11560] continuous validation" }),
    makePR({ id: 3, title: "Add dark mode", repository_url: "https://api.github.com/repos/acme/web", head_ref: "feat/PLA-900-toggle" }),
  ];

  it("returns the same array reference when the query is empty", () => {
    expect(filterPRs(prs, "")).toBe(prs);
    expect(filterPRs(prs, "   ")).toBe(prs);
  });

  it("matches a ticket id in the title", () => {
    const result = filterPRs(prs, "PLA-252");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("is case-insensitive", () => {
    expect(filterPRs(prs, "pla-252")).toHaveLength(1);
    expect(filterPRs(prs, "DARK")).toHaveLength(1);
  });

  it("matches a partial fragment", () => {
    expect(filterPRs(prs, "252")).toHaveLength(1);
    expect(filterPRs(prs, "pla")).toHaveLength(2); // PLA-252 title + PLA-900 branch
  });

  it("requires all whitespace-separated tokens to match (AND), order-independent", () => {
    expect(filterPRs(prs, "fix agent")).toHaveLength(1);
    expect(filterPRs(prs, "agent fix")).toHaveLength(1);
    expect(filterPRs(prs, "fix validation")).toHaveLength(0);
  });

  it("matches against repo name and branch", () => {
    expect(filterPRs(prs, "acme/web")).toHaveLength(1);
    expect(filterPRs(prs, "feat/pla-900")).toHaveLength(1);
  });

  it("matches against author login", () => {
    const withAuthor = [makePR({ id: 9, title: "Unrelated", user: { login: "octocat", avatar_url: "" } })];
    expect(filterPRs(withAuthor, "octocat")).toHaveLength(1);
  });

  it("matches a PR number with a # prefix", () => {
    const numbered = [makePR({ id: 1, number: 215 }), makePR({ id: 2, number: 1215 })];
    const result = filterPRs(numbered, "#215");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("does not fall back to text for a # token", () => {
    const numbered = [makePR({ id: 1, number: 7, title: "Bump to 215" })];
    expect(filterPRs(numbered, "#215")).toEqual([]);
  });

  it("matches a bare number against the PR number or the text", () => {
    const numbered = [
      makePR({ id: 1, number: 215, title: "Unrelated" }),
      makePR({ id: 2, number: 9, title: "[PLA-215] ticket" }),
      makePR({ id: 3, number: 30, title: "Other" }),
    ];
    expect(filterPRs(numbered, "215").map((pr) => pr.id)).toEqual([1, 2]);
  });

  it("combines a PR number with other tokens (AND)", () => {
    const numbered = [
      makePR({ id: 1, number: 215, title: "Fix login" }),
      makePR({ id: 2, number: 215, title: "Add dark mode" }),
    ];
    const result = filterPRs(numbered, "#215 dark");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterPRs(prs, "PLA-999")).toEqual([]);
  });
});
