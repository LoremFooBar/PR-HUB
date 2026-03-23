import { getMergeStatus } from "../../../src/utils/merge-status";
import type { PullRequestItem } from "../../../src/types";

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

describe("getMergeStatus", () => {
  it("returns blocked when CI failed and changes requested", () => {
    const result = getMergeStatus(makePR({ check_status: "failure", changes_requested: 1 }));
    expect(result).toEqual({ status: "blocked", reason: "CI failed & changes requested" });
  });

  it("returns blocked when CI failed", () => {
    const result = getMergeStatus(makePR({ check_status: "failure" }));
    expect(result).toEqual({ status: "blocked", reason: "CI failed" });
  });

  it("returns blocked when changes requested", () => {
    const result = getMergeStatus(makePR({ changes_requested: 2 }));
    expect(result).toEqual({ status: "blocked", reason: "Changes requested" });
  });

  it("returns behind when CI passed, has approvals, but branch is behind", () => {
    const result = getMergeStatus(makePR({ check_status: "success", approvals: 1, behind: true }));
    expect(result).toEqual({ status: "behind", reason: "Branch needs update" });
  });

  it("returns ready when CI passed and has approvals", () => {
    const result = getMergeStatus(makePR({ check_status: "success", approvals: 1 }));
    expect(result).toEqual({ status: "ready", reason: "Ready to merge" });
  });

  it("returns behind when branch is behind (no CI pass or approvals)", () => {
    const result = getMergeStatus(makePR({ behind: true }));
    expect(result).toEqual({ status: "behind", reason: "Branch needs update" });
  });

  it("returns pending when no CI pass and no approvals", () => {
    const result = getMergeStatus(makePR());
    expect(result).toEqual({ status: "pending", reason: "Pending CI & reviews" });
  });

  it("returns pending when CI not passed but has approvals", () => {
    const result = getMergeStatus(makePR({ approvals: 1 }));
    expect(result).toEqual({ status: "pending", reason: "CI pending" });
  });

  it("returns pending when CI passed but no approvals", () => {
    const result = getMergeStatus(makePR({ check_status: "success" }));
    expect(result).toEqual({ status: "pending", reason: "Awaiting reviews" });
  });
});
