import { useCallback, useEffect, useRef, useState } from "react";
import { validateToken, fetchAuthoredPRs, fetchReviewPRs, fetchMergedPRs } from "./github";
import type { GitHubUser, PullRequestItem } from "./types";
import { getToken, setToken, removeToken, getCachedUser, setCachedUser, getCachedTab, setCachedTab, clearCache, getInitCache } from "./storage";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import { DashboardSkeleton } from "./components/Skeleton";

type Tab = "assigned" | "reviews" | "merged";

const ALL_TABS: Tab[] = ["assigned", "reviews", "merged"];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [assigned, setAssigned] = useState<PullRequestItem[]>([]);
  const [reviews, setReviews] = useState<PullRequestItem[]>([]);
  const [merged, setMerged] = useState<PullRequestItem[]>([]);
  const [error, setError] = useState("");
  const [isLoadingPRs, setIsLoadingPRs] = useState(false);
  const loadedTabsRef = useRef<Set<Tab>>(new Set());
  const activeLoadRef = useRef(0);

  const setTabData = useCallback((tab: Tab, data: PullRequestItem[]) => {
    if (tab === "assigned") setAssigned(data);
    else if (tab === "reviews") setReviews(data);
    else setMerged(data);
  }, []);

  const fetchTab = useCallback(async (tab: Tab, pat: string, username: string): Promise<PullRequestItem[]> => {
    if (tab === "assigned") return fetchAuthoredPRs(pat, username);
    if (tab === "reviews") return fetchReviewPRs(pat, username);
    return fetchMergedPRs(pat, username);
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
    setReviews([]);
    setMerged([]);
    loadedTabsRef.current = new Set();
  }

  function handleTabChange(tab: Tab) {
    if (token && user) {
      loadTab(tab, token, user.login);
    }
  }

  function handleReload(currentTab: Tab) {
    if (!token || !user) return;
    loadedTabsRef.current = new Set();
    setAssigned([]);
    setReviews([]);
    setMerged([]);
    loadTab(currentTab, token, user.login, true);
    prefetchOtherTabs(currentTab, token, user.login);
  }

  useEffect(() => {
    async function init() {
      // Single storage read for all cached data
      const cache = await getInitCache();
      if (!cache.token) {
        setLoading(false);
        return;
      }

      if (cache.user) {
        // Show cached data instantly
        setTokenState(cache.token);
        setUser(cache.user);
        if (cache.assigned) setAssigned(cache.assigned);
        if (cache.reviews) setReviews(cache.reviews);
        if (cache.merged) setMerged(cache.merged);
        setLoading(false);

        // Revalidate in background
        validateToken(cache.token)
          .then(async (ghUser) => {
            setUser(ghUser);
            setCachedUser(ghUser);
            await loadTab("assigned", cache.token!, ghUser.login, true);
            prefetchOtherTabs("assigned", cache.token!, ghUser.login);
          })
          .catch(async () => {
            await removeToken();
            await clearCache();
            setTokenState(null);
            setUser(null);
            setAssigned([]);
            setReviews([]);
            setMerged([]);
          });
      } else {
        // No cache — go through normal login flow
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      user={user}
      assigned={assigned}
      reviews={reviews}
      merged={merged}
      isLoadingPRs={isLoadingPRs}
      error={error}
      onLogout={logout}
      onReload={handleReload}
      onTabChange={handleTabChange}
    />
  );
}
