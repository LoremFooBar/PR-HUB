export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export type CheckStatus = "success" | "failure" | "pending";
export type Tab = "assigned" | "merged";
export type MergeStatus = "ready" | "blocked" | "behind" | "pending";

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
  base_ref?: string;
  head_ref?: string;
  behind?: boolean;
}
