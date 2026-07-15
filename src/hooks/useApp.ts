import { useCallback, useEffect, useRef, useState } from "react";
import { validateToken, fetchAuthoredPRs, fetchMergedPRs } from "../github";
import type { GitHubUser, PullRequestItem, Tab } from "../types";
import { setToken, removeToken, setCachedUser, setCachedTab, clearCache, clearTabCache, setOrg as persistOrg, setStrayTabAction as persistStrayTabAction, setGroupColor as persistGroupColor, setAutoSync as persistAutoSync, getInitCache, type StrayTabAction, type GroupColor } from "../storage";

const ALL_TABS: Tab[] = ["assigned", "merged"];

export function useApp() {
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [org, setOrgState] = useState("");
  const [strayTabAction, setStrayTabActionState] = useState<StrayTabAction>("ungroup");
  const [groupColor, setGroupColorState] = useState<GroupColor>("blue");
  const [autoSync, setAutoSyncState] = useState(false);
  const [assigned, setAssigned] = useState<PullRequestItem[]>([]);
  const [merged, setMerged] = useState<PullRequestItem[]>([]);
  const [error, setError] = useState("");
  const [isLoadingPRs, setIsLoadingPRs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const loadedTabsRef = useRef<Set<Tab>>(new Set());
  const activeLoadRef = useRef(0);
  // Latest org scope, read by async fetch closures to avoid stale captures.
  const orgRef = useRef("");

  const setTabData = useCallback((tab: Tab, data: PullRequestItem[]) => {
    if (tab === "assigned") setAssigned(data);
    else setMerged(data);
  }, []);

  const fetchTab = useCallback((tab: Tab, pat: string, username: string): Promise<PullRequestItem[]> => {
    if (tab === "assigned") return fetchAuthoredPRs(pat, username, orgRef.current);
    return fetchMergedPRs(pat, username, orgRef.current);
  }, []);

  const loadTab = useCallback(async (tab: Tab, pat: string, username: string, force = false) => {
    if (!force && loadedTabsRef.current.has(tab)) return;
    const loadId = ++activeLoadRef.current;
    setIsLoadingPRs(true);
    setError("");
    try {
      const data = await fetchTab(tab, pat, username);
      if (activeLoadRef.current !== loadId) return; // stale
      setTabData(tab, data);
      loadedTabsRef.current.add(tab);
      setCachedTab(tab, data);
    } catch {
      if (activeLoadRef.current === loadId) setError("Failed to load PRs.");
    } finally {
      if (activeLoadRef.current === loadId) setIsLoadingPRs(false);
    }
  }, [fetchTab, setTabData]);

  const prefetchOtherTabs = useCallback((activeTab: Tab, pat: string, username: string) => {
    for (const tab of ALL_TABS) {
      if (tab !== activeTab && !loadedTabsRef.current.has(tab)) {
        fetchTab(tab, pat, username)
          .then((data) => {
            loadedTabsRef.current.add(tab);
            setTabData(tab, data);
            setCachedTab(tab, data);
          })
          .catch(() => {}); // silent background failure
      }
    }
  }, [fetchTab, setTabData]);

  async function handleLogin(pat: string) {
    setError("");
    const ghUser = await validateToken(pat);
    await setToken(pat);
    await setCachedUser(ghUser);
    setTokenState(pat);
    setUser(ghUser);
    await loadTab("assigned", pat, ghUser.login);
    prefetchOtherTabs("assigned", pat, ghUser.login);
  }

  async function logout() {
    await removeToken();
    await clearCache();
    setTokenState(null);
    setUser(null);
    setAssigned([]);
    setMerged([]);
    loadedTabsRef.current = new Set();
    setShowSettings(false);
  }

  function handleTabChange(tab: Tab) {
    if (token && user) {
      loadTab(tab, token, user.login);
    }
  }

  // Refresh button: drop the cache and force a fresh fetch of every tab.
  function handleReload(currentTab: Tab) {
    if (!token || !user) return;
    clearTabCache();
    loadedTabsRef.current = new Set();
    setAssigned([]);
    setMerged([]);
    loadTab(currentTab, token, user.login, true);
    prefetchOtherTabs(currentTab, token, user.login);
  }

  function openSettings() {
    setShowSettings(true);
  }

  function closeSettings() {
    setShowSettings(false);
  }

  // Persist settings; only an org-scope change requires refetching data.
  async function saveSettings(newOrg: string, newStrayTabAction: StrayTabAction, newGroupColor: GroupColor, newAutoSync: boolean) {
    setStrayTabActionState(newStrayTabAction);
    setGroupColorState(newGroupColor);
    setAutoSyncState(newAutoSync);
    await Promise.all([
      persistStrayTabAction(newStrayTabAction),
      persistGroupColor(newGroupColor),
      persistAutoSync(newAutoSync),
    ]);
    const trimmed = newOrg.trim();
    const orgChanged = trimmed !== orgRef.current;
    orgRef.current = trimmed;
    setOrgState(trimmed);
    await persistOrg(trimmed);
    setShowSettings(false);
    if (orgChanged && token && user) {
      await clearTabCache();
      loadedTabsRef.current = new Set();
      setAssigned([]);
      setMerged([]);
      loadTab("assigned", token, user.login, true);
      prefetchOtherTabs("assigned", token, user.login);
    }
  }

  useEffect(() => {
    async function init() {
      const cache = await getInitCache();
      orgRef.current = cache.org;
      setOrgState(cache.org);
      setStrayTabActionState(cache.strayTabAction);
      setGroupColorState(cache.groupColor);
      setAutoSyncState(cache.autoSync);

      if (!cache.token) {
        setLoading(false);
        return;
      }

      if (cache.user) {
        setTokenState(cache.token);
        setUser(cache.user);
        // Fresh cache is rendered as-is; mark those tabs loaded so we don't refetch.
        if (cache.assigned) { setAssigned(cache.assigned); loadedTabsRef.current.add("assigned"); }
        if (cache.merged) { setMerged(cache.merged); loadedTabsRef.current.add("merged"); }
        setLoading(false);

        validateToken(cache.token)
          .then((ghUser) => {
            setUser(ghUser);
            setCachedUser(ghUser);
            // PRs are not refetched on open — the background alarm keeps the
            // cache warm. This only fetches a tab we've never cached at all
            // (fresh install / cleared cache).
            loadTab("assigned", cache.token!, ghUser.login);
            prefetchOtherTabs("assigned", cache.token!, ghUser.login);
          })
          .catch(async () => {
            await removeToken();
            await clearCache();
            setTokenState(null);
            setUser(null);
            setAssigned([]);
            setMerged([]);
          });
      } else {
        try {
          await handleLogin(cache.token);
        } catch {
          // Token invalid
        }
        setLoading(false);
      }
    }
    init();
  }, []);

  // The background service worker refreshes the tab caches every 30 minutes.
  // Reflect those updates live if the panel is open when a refresh lands.
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return;
      const assignedChange = changes.cached_assigned?.newValue;
      if (assignedChange) {
        setAssigned(assignedChange.data);
        loadedTabsRef.current.add("assigned");
      }
      const mergedChange = changes.cached_merged?.newValue;
      if (mergedChange) {
        setMerged(mergedChange.data);
        loadedTabsRef.current.add("merged");
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return {
    loading,
    token,
    user,
    org,
    strayTabAction,
    groupColor,
    autoSync,
    assigned,
    merged,
    error,
    isLoadingPRs,
    showSettings,
    handleLogin,
    logout,
    handleTabChange,
    handleReload,
    openSettings,
    closeSettings,
    saveSettings,
  };
}
