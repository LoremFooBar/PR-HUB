const PR_GROUP_TITLE = "My PRs";

// Opens every given PR URL in a single tab group and keeps that group in sync:
// tabs for PRs that are no longer open are closed, missing PRs are opened, and
// the result is (re)grouped under one collapsible "My PRs" group. Tabs are
// ordered to match `urls` (the alphabetical-by-title PR list order).
export async function syncPRTabGroup(urls: string[]): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabGroups) {
    urls.forEach((url) => window.open(url, "_blank"));
    return;
  }

  const windowId = chrome.windows.WINDOW_ID_CURRENT;
  const desired = new Set(urls);

  const [existingGroup] = await chrome.tabGroups.query({ title: PR_GROUP_TITLE, windowId });

  const tabIdByUrl = new Map<string, number>();
  const toCreate = new Set(urls);
  let keptCount = 0;

  if (existingGroup) {
    const groupTabs = await chrome.tabs.query({ groupId: existingGroup.id });
    const staleTabIds: number[] = [];
    for (const t of groupTabs) {
      if (t.id == null) continue;
      if (t.url && desired.has(t.url)) {
        tabIdByUrl.set(t.url, t.id);
        toCreate.delete(t.url); // already open — don't create a duplicate
        keptCount++;
      } else {
        staleTabIds.push(t.id);
      }
    }
    if (staleTabIds.length) await chrome.tabs.remove(staleTabIds);
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
  await chrome.tabGroups.update(groupId, { title: PR_GROUP_TITLE, color: "blue" });

  // Grouping doesn't guarantee tab-strip order, so lay the tabs out to match
  // the list: move them, in order, to the group's current start position.
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
