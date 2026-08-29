// PR Tower is a separate local tool that lists the same PRs. It is an ordinary
// served page, so it cannot reach chrome.tabs or chrome.tabGroups; posting a
// message to this extension is the only route from one of its links into the
// "My PRs" tab group.
export const OPEN_PR = "prhub:open-pr";

// The marker PR Tower reads to decide whether to intercept a click. Without it
// its links stay ordinary anchors to github.com.
export const MARKER = "prHub";

// Loopback only, any port: PR Tower publishes itself on 127.0.0.1 and its port
// is configurable. A page served from the wider web must never be able to drive
// the user's tabs.
export function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}
