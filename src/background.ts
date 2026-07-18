import { fetchAuthoredPRs, fetchMergedPRs } from "./github";
import { getToken, getOrg, getCachedUser, getCachedTab, setCachedTab, getAutoSync } from "./storage";
import { syncPRTabGroup } from "./tabs";

const REFRESH_ALARM = "refresh-prs";
const REFRESH_PERIOD_MIN = 30;
const SYNC_TABS_COMMAND = "sync-pr-tabs";

// Refetch both tabs and update the cache. The open panel picks these up live
// via chrome.storage.onChanged, so the user never waits on a fetch when opening.
async function refreshPRs() {
  const [token, org, user] = await Promise.all([
    getToken(),
    getOrg(),
    getCachedUser(),
  ]);
  if (!token || !user) return;
  try {
    const [assigned, merged] = await Promise.all([
      fetchAuthoredPRs(token, user.login, org),
      fetchMergedPRs(token, user.login, org),
    ]);
    await Promise.all([
      setCachedTab("assigned", assigned),
      setCachedTab("merged", merged),
    ]);
    // Keep the "My PRs" tab group current with the fresh data. Gentle: without
    // closing the active tab, repurposed tabs, or reordering — see
    // syncPRTabGroup. When auto-sync is on we create the group if it's missing.
    if (await getAutoSync()) {
      await syncPRTabGroup(assigned, { gentle: true, create: true });
    }
  } catch {
    // Leave the existing cache untouched on failure.
  }
}

function ensureAlarm() {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MIN });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  refreshPRs();
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  refreshPRs();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) refreshPRs();
});

// Keyboard shortcut (see manifest `commands`) syncs the "My PRs" tab group from
// the cached open PRs, so it works even when the side panel is closed.
chrome.commands?.onCommand.addListener(async (command) => {
  if (command !== SYNC_TABS_COMMAND) return;
  const assigned = await getCachedTab("assigned");
  if (!assigned || assigned.length === 0) return;
  await syncPRTabGroup(assigned);
});

// Clicking the toolbar icon opens the side panel instead of a popup.
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
