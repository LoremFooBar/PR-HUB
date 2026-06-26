import { test, expect } from "@playwright/experimental-ct-react";
import PRList from "../../src/components/PRList";
import type { PullRequestItem } from "../../src/types";

function makePR(overrides: Partial<PullRequestItem> = {}): PullRequestItem {
  return {
    id: 1,
    number: 1,
    title: "Fix login bug",
    html_url: "https://github.com/owner/repo/pull/1",
    repository_url: "https://api.github.com/repos/owner/repo",
    created_at: new Date().toISOString(),
    comments: 0,
    ...overrides,
  };
}

function makePRs(count: number): PullRequestItem[] {
  return Array.from({ length: count }, (_, i) =>
    makePR({ id: i + 1, number: i + 1, title: `PR #${i + 1}` })
  );
}

test.describe("PRList", () => {
  test("renders empty message when no PRs", async ({ mount }) => {
    const component = await mount(
      <PRList prs={[]} emptyMessage="No open PRs." />
    );
    await expect(component.getByText("No open PRs.")).toBeVisible();
  });

  test("renders PR titles", async ({ mount }) => {
    const prs = [makePR({ title: "Add dark mode" })];
    const component = await mount(
      <PRList prs={prs} emptyMessage="" />
    );
    await expect(component.getByText("Add dark mode")).toBeVisible();
  });

  test("shows repo name", async ({ mount }) => {
    const prs = [makePR()];
    const component = await mount(
      <PRList prs={prs} emptyMessage="" />
    );
    await expect(component.getByText("owner/repo")).toBeVisible();
  });

  test("shows 'Show more' button when more than PAGE_SIZE PRs", async ({ mount }) => {
    const prs = makePRs(15);
    const component = await mount(
      <PRList prs={prs} emptyMessage="" />
    );
    await expect(component.getByText(/Show more/)).toBeVisible();
  });

  test("does not show 'Show more' when fewer than PAGE_SIZE", async ({ mount }) => {
    const prs = makePRs(5);
    const component = await mount(
      <PRList prs={prs} emptyMessage="" />
    );
    await expect(component.getByText(/Show more/)).not.toBeVisible();
  });

  test("shows check badges when showChecks is true", async ({ mount }) => {
    const prs = [makePR({ check_status: "success", approvals: 2, comments: 3 })];
    const component = await mount(
      <PRList prs={prs} emptyMessage="" showChecks />
    );
    await expect(component.getByTitle("Approvals")).toBeVisible();
    await expect(component.getByTitle("Comments")).toBeVisible();
  });

  test("shows author info when showAuthor is true", async ({ mount }) => {
    const prs = [makePR({ user: { login: "octocat", avatar_url: "https://avatar.url/octocat" } })];
    const component = await mount(
      <PRList prs={prs} emptyMessage="" showAuthor />
    );
    await expect(component.getByText("octocat")).toBeVisible();
  });

  test("shows merged badge when showMergedBadge is true", async ({ mount }) => {
    const prs = [makePR()];
    const component = await mount(
      <PRList prs={prs} emptyMessage="" showMergedBadge />
    );
    await expect(component.getByTitle("Merged")).toBeVisible();
  });

  test("shows base branch when showBaseBranch is true", async ({ mount }) => {
    const prs = [makePR({ base_ref: "main" })];
    const component = await mount(
      <PRList prs={prs} emptyMessage="" showBaseBranch />
    );
    await expect(component.getByText("main")).toBeVisible();
  });
});
