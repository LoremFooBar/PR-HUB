export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export type CheckStatus = "success" | "failure" | "pending";
export type ReviewStatus = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING";

export interface PullRequestItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  comments: number;
  user?: { login: string; avatar_url: string };
  check_status?: CheckStatus;
  approvals?: number;
  changes_requested?: number;
  my_review_status?: ReviewStatus;
  base_ref?: string;
  head_ref?: string;
  behind?: boolean;
}
