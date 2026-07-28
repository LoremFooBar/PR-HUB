import type { Tab } from "./types";

export const PAGE_SIZE = 10;
export const PRODUCTION_BRANCHES = new Set(["main", "master"]);

// Tab order in the UI. Also drives the cache keys and the background refresh,
// so a new tab only has to be added here and in the fetch/display maps.
export const ALL_TABS: Tab[] = ["assigned", "review", "merged"];
export const TAB_CACHE_KEYS = ALL_TABS.map((tab) => `cached_${tab}`);
