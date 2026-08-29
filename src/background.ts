import { fetchAuthoredPRs, fetchMergedPRs, fetchReviewPRs } from "./github";
import { getToken, getOrg, getCachedUser, getCachedTab, setCachedTab, getAutoSync } from "./storage";
import { openPRInGroup, syncPRTabGroup } from "./tabs";
import { OPEN_PR, isTrustedOrigin } from "./bridge";
import { normalizePRUrl } from "./utils/pr-url";

const REFRESH_ALARM = "refresh-prs";
const REFRESH_PERIOD_MIN = 30;
const SYNC_TABS_COMMAND = "sync-pr-tabs";

// Refetch every tab and update the cache. The open panel picks these up live
// via chrome.storage.onChanged, so the user never waits on a fetch when opening.
async function refreshPRs() {
  const [token, org, user] = await Promise.all([
    getToken(),
    getOrg(),
    getCachedUser(),
  ]);
  if (!token || !user) return;
  try {
    const [assigned, review, merged] = await Promise.all([
      fetchAuthoredPRs(token, user.login, org),
      fetchReviewPRs(token, org),
      fetchMergedPRs(token, user.login, org),
    ]);
    await Promise.all([
      setCachedTab("assigned", assigned),
      setCachedTab("review", review),
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

// A PR Tower click, relayed by the content script. The origin is checked again
// here and the URL is normalized rather than trusted: normalizePRUrl returns
// null for anything that is not a github.com pull-request URL, so a page cannot
// use this to open a tab at an address of its choosing.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== OPEN_PR) return;
  if (!sender.tab || !isTrustedOrigin(sender.origin)) return;
  const url = typeof message.url === "string" ? normalizePRUrl(message.url) : null;
  if (url) openPRInGroup(url);
});

// Clicking the toolbar icon opens the side panel instead of a popup.
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
