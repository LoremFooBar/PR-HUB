import { fetchReviewPRs } from "../../src/github";
import type { PullRequestItem } from "../../src/types";

function item(id: number, title: string): PullRequestItem {
  return {
    id,
    number: id,
    title,
    html_url: `https://github.com/owner/repo/pull/${id}`,
    repository_url: "https://api.github.com/repos/owner/repo",
    created_at: "2026-07-01T00:00:00Z",
    comments: 0,
  };
}

let queries: string[] = [];

beforeEach(() => {
  queries = [];
  // Search returns fixtures; every enrichment endpoint fails, so enrichPR falls
  // back to the search payload — enough to assert merge/dedup/order.
  (globalThis as { fetch: unknown }).fetch = jest.fn(async (url: string) => {
    if (!url.includes("/search/issues")) return { ok: false, json: async () => ({}) };
    const query = new URL(url).searchParams.get("q") ?? "";
    queries.push(query);
    const items = query.includes("user-review-requested")
      ? [item(2, "B pending"), { ...item(1, "A pending"), draft: true }]
      : [item(2, "B pending"), item(3, "C reviewed")];
    return { ok: true, json: async () => ({ items }) };
  });
});

describe("fetchReviewPRs", () => {
  it("runs the direct-request and already-reviewed searches, excluding team requests", async () => {
    await fetchReviewPRs("ghp_x");

    expect(queries).toHaveLength(2);
    expect(queries).toEqual(
      expect.arrayContaining([
        "type:pr is:open user-review-requested:@me",
        "type:pr is:open reviewed-by:@me review:required -author:@me",
      ])
    );
    // Plain `review-requested:` would pull in team requests.
    for (const query of queries) expect(query).not.toMatch(/(^|[^-])review-requested:/);
    // Review can be requested on a draft PR, so drafts must not be filtered out.
    for (const query of queries) expect(query).not.toContain("-is:draft");
  });

  it("appends the org scope to both searches", async () => {
    await fetchReviewPRs("ghp_x", "acme");
    for (const query of queries) expect(query).toContain(" org:acme");
  });

  it("merges both searches, deduping a PR that appears in each", async () => {
    const prs = await fetchReviewPRs("ghp_x");
    expect(prs.map((pr) => pr.id)).toEqual([1, 2, 3]);
  });

  it("flags only the already-reviewed PRs and sorts them last", async () => {
    const prs = await fetchReviewPRs("ghp_x");

    expect(prs.map((pr) => [pr.title, pr.reviewed_by_me ?? false])).toEqual([
      ["A pending", false],
      ["B pending", false],
      ["C reviewed", true],
    ]);
  });

  it("keeps the draft flag from the search payload", async () => {
    const prs = await fetchReviewPRs("ghp_x");
    expect(prs.map((pr) => [pr.title, pr.draft ?? false])).toEqual([
      ["A pending", true],
      ["B pending", false],
      ["C reviewed", false],
    ]);
  });
});
