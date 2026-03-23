import { test, expect } from "@playwright/experimental-ct-react";
import Dashboard from "../../src/components/Dashboard";
import type { GitHubUser, PullRequestItem, Tab } from "../../src/types";

const mockUser: GitHubUser = {
  login: "testuser",
  avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
};

function makePR(overrides: Partial<PullRequestItem> = {}): PullRequestItem {
  return {
    id: 1,
    number: 1,
    title: "Test PR",
    html_url: "https://github.com/owner/repo/pull/1",
    repository_url: "https://api.github.com/repos/owner/repo",
    created_at: new Date().toISOString(),
    comments: 0,
    ...overrides,
  };
}

const defaultProps = {
  user: mockUser,
  assigned: [] as PullRequestItem[],
  reviews: [] as PullRequestItem[],
  merged: [] as PullRequestItem[],
  isLoadingPRs: false,
  error: "",
  onLogout: () => {},
  onReload: (_tab: Tab) => {},
  onTabChange: (_tab: Tab) => {},
};

test.describe("Dashboard", () => {
  test("renders user profile", async ({ mount }) => {
    const component = await mount(<Dashboard {...defaultProps} />);
    await expect(component.getByText("testuser")).toBeVisible();
  });

  test("renders tab bar with My PRs, Reviews, Merged", async ({ mount }) => {
    const component = await mount(<Dashboard {...defaultProps} />);
    await expect(component.getByText("My PRs")).toBeVisible();
    await expect(component.getByText("Reviews")).toBeVisible();
    await expect(component.getByText("Merged")).toBeVisible();
  });

  test("shows tab counts", async ({ mount }) => {
    const assigned = [makePR(), makePR({ id: 2, number: 2, title: "PR 2" })];
    const component = await mount(
      <Dashboard {...defaultProps} assigned={assigned} />
    );
    await expect(component.getByText("My PRs (2)")).toBeVisible();
  });

  test("switches to Reviews tab", async ({ mount }) => {
    let changedTab = "";
    const component = await mount(
      <Dashboard
        {...defaultProps}
        reviews={[makePR({ my_review_status: "PENDING" })]}
        onTabChange={(tab) => { changedTab = tab; }}
      />
    );
    await component.getByText("Reviews (1)").click();
    expect(changedTab).toBe("reviews");
    await expect(component.getByText("Pending review (1)")).toBeVisible();
  });

  test("shows loading skeleton when isLoadingPRs is true", async ({ mount }) => {
    const component = await mount(
      <Dashboard {...defaultProps} isLoadingPRs={true} />
    );
    await expect(component.locator(".skeleton")).toHaveCount(6); // 3 items × 2 skeletons each
  });

  test("shows error message when error prop is set", async ({ mount }) => {
    const component = await mount(
      <Dashboard {...defaultProps} error="Failed to load PRs." />
    );
    await expect(component.getByText("Failed to load PRs.")).toBeVisible();
  });

  test("calls onReload when reload button is clicked", async ({ mount }) => {
    let reloaded = false;
    const component = await mount(
      <Dashboard {...defaultProps} onReload={() => { reloaded = true; }} />
    );
    await component.getByTitle("Reload").click();
    expect(reloaded).toBe(true);
  });

  test("calls onLogout when logout button is clicked", async ({ mount }) => {
    let loggedOut = false;
    const component = await mount(
      <Dashboard {...defaultProps} onLogout={() => { loggedOut = true; }} />
    );
    await component.getByText("Logout").click();
    expect(loggedOut).toBe(true);
  });
});
