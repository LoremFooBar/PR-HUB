import type { PullRequestItem, MergeStatus } from "../types";

export function getMergeStatus(pr: PullRequestItem): { status: MergeStatus; reason: string } {
  const ciFailed = pr.check_status === "failure";
  const hasChangesRequested = (pr.changes_requested ?? 0) > 0;

  if (ciFailed && hasChangesRequested) return { status: "blocked", reason: "CI failed & changes requested" };
  if (ciFailed) return { status: "blocked", reason: "CI failed" };
  if (hasChangesRequested) return { status: "blocked", reason: "Changes requested" };

  const ciPassed = pr.check_status === "success";
  const hasApprovals = (pr.approvals ?? 0) > 0;

  if (ciPassed && hasApprovals && pr.behind) return { status: "behind", reason: "Branch needs update" };
  if (ciPassed && hasApprovals) return { status: "ready", reason: "Ready to merge" };
  if (pr.behind) return { status: "behind", reason: "Branch needs update" };

  if (!ciPassed && !hasApprovals) return { status: "pending", reason: "Pending CI & reviews" };
  if (!ciPassed) return { status: "pending", reason: "CI pending" };
  return { status: "pending", reason: "Awaiting reviews" };
}
