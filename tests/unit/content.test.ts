import type { PullRequestItem } from "../../src/types";

const openPR: PullRequestItem = {
  id: 1,
  number: 7,
  title: "Add hover preview",
  html_url: "https://github.com/owner/repo/pull/7",
  repository_url: "https://api.github.com/repos/owner/repo",
  created_at: new Date().toISOString(),
  comments: 3,
  approvals: 1,
  check_status: "success",
  base_ref: "main",
  head_ref: "feature/preview",
};

const mergedPR: PullRequestItem = {
  ...openPR,
  id: 2,
  number: 9,
  title: "Ship it",
  html_url: "https://github.com/owner/repo/pull/9",
};

// The script is loaded once — its document listeners outlive any module reset —
// so settings and cache changes are driven through the storage listener it
// registers, exactly as they arrive in a real page.
const storageData: Record<string, unknown> = {
  link_preview: true,
  cached_assigned: { data: [openPR] },
  cached_merged: { data: [mergedPR] },
};
let notifyStorageChange: (
  changes: Record<string, { newValue?: unknown }>,
  area: string
) => void;

// The card lives in a closed shadow root, so the test opens it at creation time
// to be able to read what was rendered.
let shadow: ShadowRoot | null = null;

function card(): HTMLElement | null {
  return shadow?.querySelector(".card.visible") ?? null;
}

function hover(href: string): void {
  document.body.innerHTML = `<a href="${href}">a pull request</a>`;
  document.body.firstElementChild!.dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true })
  );
  jest.advanceTimersByTime(300);
}

function moveAway(): void {
  document.body.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
}

beforeAll(() => {
  const attachShadow = Element.prototype.attachShadow;
  jest
    .spyOn(Element.prototype, "attachShadow")
    .mockImplementation(function (this: Element, init: ShadowRootInit) {
      shadow = attachShadow.call(this, { ...init, mode: "open" });
      return shadow;
    });

  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: (keys: string[], callback: (result: Record<string, unknown>) => void) => {
          const picked: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in storageData) picked[key] = storageData[key];
          }
          callback(picked);
        },
      },
      onChanged: {
        addListener: (listener: typeof notifyStorageChange) => {
          notifyStorageChange = listener;
        },
      },
    },
  };

  require("../../src/content");
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  moveAway();
  jest.useRealTimers();
});

describe("PR link hover preview", () => {
  it("previews a cached open PR", () => {
    hover("https://github.com/owner/repo/pull/7/files?w=1");

    const preview = card();
    expect(preview).not.toBeNull();
    expect(preview!.querySelector(".title")!.textContent).toBe("Add hover preview");
    expect(preview!.querySelector(".repo")!.textContent).toBe("owner/repo");
    expect(preview!.querySelector(".num")!.textContent).toBe("#7");
    expect(preview!.querySelector(".status")!.textContent).toBe("Ready to merge");
  });

  it("marks a PR from the merged cache as merged", () => {
    hover(mergedPR.html_url);

    expect(card()!.querySelector(".status")!.textContent).toBe("Merged");
  });

  it("ignores PR links that are not cached", () => {
    hover("https://github.com/owner/repo/pull/404");

    expect(card()).toBeNull();
  });

  it("ignores links that are not GitHub PRs", () => {
    hover("https://example.com/owner/repo/pull/7");

    expect(card()).toBeNull();
  });

  it("hides the preview when the pointer moves off the link", () => {
    hover(openPR.html_url);
    expect(card()).not.toBeNull();

    moveAway();

    expect(card()).toBeNull();
  });

  it("hides the preview on Escape", () => {
    hover(openPR.html_url);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(card()).toBeNull();
  });

  it("picks up a background cache refresh", () => {
    const renamed = { ...openPR, title: "Renamed in a later refresh" };
    storageData.cached_assigned = { data: [renamed] };
    notifyStorageChange({ cached_assigned: { newValue: storageData.cached_assigned } }, "local");

    hover(openPR.html_url);

    expect(card()!.querySelector(".title")!.textContent).toBe("Renamed in a later refresh");
  });

  it("does nothing while the setting is off", () => {
    notifyStorageChange({ link_preview: { newValue: false } }, "local");
    hover(openPR.html_url);
    expect(card()).toBeNull();

    notifyStorageChange({ link_preview: { newValue: true } }, "local");
    hover(openPR.html_url);
    expect(card()).not.toBeNull();
  });
});
