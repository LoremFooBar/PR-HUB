import type { ReviewStatus } from "./types";

export const PAGE_SIZE = 10;
export const PRODUCTION_BRANCHES = new Set(["main", "master"]);

export const reviewLabels: Record<ReviewStatus, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  COMMENTED: "Commented",
  PENDING: "Pending review",
};

export const reviewCssClass: Record<ReviewStatus, string> = {
  APPROVED: "review-badge--approved",
  CHANGES_REQUESTED: "review-badge--changes",
  COMMENTED: "review-badge--commented",
  PENDING: "review-badge--pending",
};
