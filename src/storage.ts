import type { GitHubUser, PullRequestItem } from "./types";

const storage =
  typeof chrome !== "undefined" && chrome.storage
    ? chrome.storage.local
    : null;

// Cached tab data is considered fresh for 30 minutes.
const CACHE_TTL_MS = 30 * 60 * 1000;

export function getToken(): Promise<string | null> {
  if (!storage) return Promise.resolve(null);
  return new Promise((resolve) =>
    storage.get("gh_token", (result) => resolve(result.gh_token ?? null))
  );
}

export function setToken(token: string): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ gh_token: token }, () => resolve())
  );
}

export function removeToken(): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.remove("gh_token", () => resolve())
  );
}

// --- Settings ---

// Org scope is a persistent preference, kept independently of the auth token
// and the PR cache so it survives logout.
export function getOrg(): Promise<string> {
  if (!storage) return Promise.resolve("");
  return new Promise((resolve) =>
    storage.get("gh_org", (result) => resolve(result.gh_org ?? ""))
  );
}

export function setOrg(org: string): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ gh_org: org }, () => resolve())
  );
}

// --- Caching ---

interface CachedTab {
  data: PullRequestItem[];
  timestamp: number;
}

export function getCachedUser(): Promise<GitHubUser | null> {
  if (!storage) return Promise.resolve(null);
  return new Promise((resolve) =>
    storage.get("cached_user", (result) => resolve(result.cached_user ?? null))
  );
}

export function setCachedUser(user: GitHubUser): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ cached_user: user }, () => resolve())
  );
}

export function getCachedTab(tab: string): Promise<PullRequestItem[] | null> {
  if (!storage) return Promise.resolve(null);
  const key = `cached_${tab}`;
  return new Promise((resolve) =>
    storage.get(key, (result) => {
      const entry: CachedTab | undefined = result[key];
      if (!entry) return resolve(null);
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) return resolve(null);
      resolve(entry.data);
    })
  );
}

export function setCachedTab(tab: string, data: PullRequestItem[]): Promise<void> {
  if (!storage) return Promise.resolve();
  const key = `cached_${tab}`;
  const entry: CachedTab = { data, timestamp: Date.now() };
  return new Promise((resolve) =>
    storage.set({ [key]: entry }, () => resolve())
  );
}

export function clearCache(): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.remove(
      ["cached_user", "cached_assigned", "cached_merged"],
      () => resolve()
    )
  );
}

// Invalidates just the per-tab PR caches, leaving the cached user in place.
export function clearTabCache(): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.remove(["cached_assigned", "cached_merged"], () => resolve())
  );
}

// Batch read: single chrome.storage call instead of several separate ones.
export interface InitCache {
  token: string | null;
  org: string;
  user: GitHubUser | null;
  assigned: PullRequestItem[] | null;
  merged: PullRequestItem[] | null;
}

export function getInitCache(): Promise<InitCache> {
  if (!storage) return Promise.resolve({ token: null, org: "", user: null, assigned: null, merged: null });
  const keys = ["gh_token", "gh_org", "cached_user", "cached_assigned", "cached_merged"];
  const now = Date.now();
  return new Promise((resolve) =>
    storage.get(keys, (result) => {
      const tab = (key: string): PullRequestItem[] | null => {
        const entry: CachedTab | undefined = result[key];
        if (!entry || now - entry.timestamp > CACHE_TTL_MS) return null;
        return entry.data;
      };
      resolve({
        token: result.gh_token ?? null,
        org: result.gh_org ?? "",
        user: result.cached_user ?? null,
        assigned: tab("cached_assigned"),
        merged: tab("cached_merged"),
      });
    })
  );
}
