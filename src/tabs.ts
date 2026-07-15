import { getGroupColor, getStrayTabAction } from "./storage";

const PR_GROUP_TITLE = "My PRs";

export interface SyncPRTabGroupOptions {
  // Background/timer sync: never disturb what the user is doing. The group is
  // only updated if it already exists, the active tab is never closed, and
  // tabs are not reordered.
  gentle?: boolean;
  // Let a gentle sync create the group when it doesn't exist yet, instead of
  // bailing. A manual sync always creates it regardless of this flag.
  create?: boolean;
}

// A tab still "is" a PR if the user merely navigated within it (Files/Commits
// tabs, anchors, query params). The "/" | "?" | "#" boundary prevents
// .../pull/12 from matching .../pull/123.
function matchDesiredUrl(tabUrl: string, desired: string[]): string | undefined {
  return desired.find(
    (url) =>
      tabUrl === url ||
      tabUrl.startsWith(url + "/") ||
      tabUrl.startsWith(url + "?") ||
      tabUrl.startsWith(url + "#")
  );
}

// Opens every given PR URL in a single tab group and keeps that group in sync:
// tabs for PRs that are no longer open are closed, missing PRs are opened, and
// the result is (re)grouped under one collapsible "My PRs" group. Tabs are
// ordered to match `urls` (the alphabetical-by-title PR list order).
export async function syncPRTabGroup(
  urls: string[],
  { gentle = false, create = false }: SyncPRTabGroupOptions = {}
): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabGroups) {
    if (!gentle) urls.forEach((url) => window.open(url, "_blank"));
    return;
  }

  // A gentle sync may run from the service worker where there is no "current"
  // window, so locate the group wherever it lives; a manual sync targets the
  // window the user pressed the button in.
  const [existingGroup] = gentle
    ? await chrome.tabGroups.query({ title: PR_GROUP_TITLE })
    : await chrome.tabGroups.query({
        title: PR_GROUP_TITLE,
        windowId: chrome.windows.WINDOW_ID_CURRENT,
      });
  if (gentle && !existingGroup && !create) return; // the timer only maintains an existing group

  // Anchor to the group's window when it exists. Otherwise we're creating: a
  // manual sync can use the current window, but the service worker has none, so
  // fall back to the last focused window there.
  let windowId = existingGroup?.windowId;
  if (windowId == null) {
    windowId = gentle
      ? (await chrome.windows.getLastFocused().catch(() => null))?.id ??
        chrome.windows.WINDOW_ID_CURRENT
      : chrome.windows.WINDOW_ID_CURRENT;
  }

  const tabIdByUrl = new Map<string, number>();
  const toCreate = new Set(urls);
  let keptCount = 0;

  if (existingGroup) {
    const strayAction = await getStrayTabAction();
    const groupTabs = await chrome.tabs.query({ groupId: existingGroup.id });
    const staleTabIds: number[] = [];
    const strayTabIds: number[] = [];
    for (const t of groupTabs) {
      if (t.id == null) continue;
      const matched = t.url && matchDesiredUrl(t.url, urls);
      if (matched) {
        tabIdByUrl.set(matched, t.id);
        toCreate.delete(matched); // already open — don't create a duplicate
        keptCount++;
      } else if (!t.url?.includes("/pull/")) {
        // A stray tab — the user repurposed it for something other than a PR.
        // Never close it; the setting decides whether it stays in the group.
        if (strayAction === "ungroup") strayTabIds.push(t.id);
        else keptCount++;
      } else if (gentle && t.active) {
        keptCount++; // don't close a tab the user is looking at
      } else {
        staleTabIds.push(t.id);
      }
    }
    if (staleTabIds.length) await chrome.tabs.remove(staleTabIds);
    if (strayTabIds.length) await chrome.tabs.ungroup(strayTabIds);
  }

  for (const url of toCreate) {
    const tab = await chrome.tabs.create({ url, active: false, windowId });
    if (tab.id != null) tabIdByUrl.set(url, tab.id);
  }

  // Tab ids in the same order as the PR list (which is sorted by title).
  const orderedTabIds = urls
    .map((url) => tabIdByUrl.get(url))
    .filter((id): id is number => id != null);
  if (orderedTabIds.length === 0) return; // no open PRs — nothing to group

  // Reuse the existing group only if it still has tabs (an emptied group is
  // auto-dissolved by Chrome, so its id would no longer be valid).
  const reuse = existingGroup && keptCount > 0;
  const groupId = await chrome.tabs.group(
    reuse ? { groupId: existingGroup.id, tabIds: orderedTabIds } : { tabIds: orderedTabIds }
  );
  await chrome.tabGroups.update(groupId, {
    title: PR_GROUP_TITLE,
    color: await getGroupColor(),
  });

  // Reordering while the user works would be disruptive, so only the manual
  // sync lays the tabs out to match the list order.
  if (gentle) return;
  const grouped = await chrome.tabs.query({ groupId });
  const startIndex = Math.min(...grouped.map((t) => t.index));
  await chrome.tabs.move(orderedTabIds, { index: startIndex });
}

export function openOrFocusTab(url: string) {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    window.open(url, "_blank");
    return;
  }
  chrome.tabs.query({ url: url + "*" }, (tabs) => {
    if (tabs.length > 0 && tabs[0].id != null) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId!, { focused: true });
    } else {
      chrome.tabs.create({ url });
    }
  });
}
