import type { GitHubUser, PullRequestItem } from "./types";

const storage =
  typeof chrome !== "undefined" && chrome.storage
    ? chrome.storage.local
    : null;

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
      // Expire cache after 1 hour
      if (Date.now() - entry.timestamp > 60 * 60 * 1000) return resolve(null);
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
      ["cached_user", "cached_assigned", "cached_reviews", "cached_merged"],
      () => resolve()
    )
  );
}
