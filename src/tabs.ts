const PR_GROUP_TITLE = "My PRs";

// Opens every given PR URL in a single tab group and keeps that group in sync:
// tabs for PRs that are no longer open are closed, missing PRs are opened, and
// the result is (re)grouped under one collapsible "My PRs" group.
export async function syncPRTabGroup(urls: string[]): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabGroups) {
    urls.forEach((url) => window.open(url, "_blank"));
    return;
  }

  const windowId = chrome.windows.WINDOW_ID_CURRENT;
  const desired = new Set(urls);

  const [existingGroup] = await chrome.tabGroups.query({ title: PR_GROUP_TITLE, windowId });

  const keptTabIds: number[] = [];
  if (existingGroup) {
    const groupTabs = await chrome.tabs.query({ groupId: existingGroup.id });
    const staleTabIds: number[] = [];
    for (const t of groupTabs) {
      if (t.id == null) continue;
      if (t.url && desired.has(t.url)) {
        keptTabIds.push(t.id);
        desired.delete(t.url); // already open — don't create a duplicate
      } else {
        staleTabIds.push(t.id);
      }
    }
    if (staleTabIds.length) await chrome.tabs.remove(staleTabIds);
  }

  const newTabIds: number[] = [];
  for (const url of desired) {
    const tab = await chrome.tabs.create({ url, active: false, windowId });
    if (tab.id != null) newTabIds.push(tab.id);
  }

  const tabIds = [...keptTabIds, ...newTabIds];
  if (tabIds.length === 0) return; // no open PRs — nothing to group

  // Reuse the existing group only if it still has tabs (an emptied group is
  // auto-dissolved by Chrome, so its id would no longer be valid).
  const reuse = existingGroup && keptTabIds.length > 0;
  const groupId = await chrome.tabs.group(
    reuse ? { groupId: existingGroup.id, tabIds } : { tabIds }
  );
  await chrome.tabGroups.update(groupId, { title: PR_GROUP_TITLE, color: "blue" });
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
