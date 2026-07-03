import { fetchAuthoredPRs, fetchMergedPRs } from "./github";
import { getToken, getOrg, getCachedUser, setCachedTab } from "./storage";

const REFRESH_ALARM = "refresh-prs";
const REFRESH_PERIOD_MIN = 30;

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

// Clicking the toolbar icon opens the side panel instead of a popup.
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
