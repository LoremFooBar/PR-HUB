import { renderHook, act } from "@testing-library/react";
import { usePRList } from "../../../src/hooks/usePRList";
import { PAGE_SIZE } from "../../../src/constants";
import type { PullRequestItem } from "../../../src/types";

function makePRs(count: number): PullRequestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    title: `PR #${i + 1}`,
    html_url: `https://github.com/owner/repo/pull/${i + 1}`,
    repository_url: "https://api.github.com/repos/owner/repo",
    created_at: new Date().toISOString(),
    comments: 0,
  }));
}

describe("usePRList", () => {
  it("shows first PAGE_SIZE items and computes remainingCount", () => {
    const prs = makePRs(25);
    const { result } = renderHook(() => usePRList(prs));
    expect(result.current.visiblePRs).toHaveLength(PAGE_SIZE);
    expect(result.current.remainingCount).toBe(25 - PAGE_SIZE);
  });

  it("shows all items when fewer than PAGE_SIZE", () => {
    const prs = makePRs(5);
    const { result } = renderHook(() => usePRList(prs));
    expect(result.current.visiblePRs).toHaveLength(5);
    expect(result.current.remainingCount).toBeLessThanOrEqual(0);
  });

  it("increases visible count on showMore", () => {
    const prs = makePRs(25);
    const { result } = renderHook(() => usePRList(prs));
    act(() => result.current.showMore());
    expect(result.current.visiblePRs).toHaveLength(PAGE_SIZE * 2);
    expect(result.current.remainingCount).toBe(25 - PAGE_SIZE * 2);
  });

  it("calls navigator.clipboard.writeText on copyToClipboard", async () => {
    const prs = makePRs(1);
    const { result } = renderHook(() => usePRList(prs));
    await act(async () => {
      result.current.copyToClipboard("https://example.com", "url-1");
      // Flush the clipboard promise
      await Promise.resolve();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com");
  });

  it("sets copiedId and clears it after timeout", async () => {
    jest.useFakeTimers();
    const prs = makePRs(1);
    const { result } = renderHook(() => usePRList(prs));

    await act(async () => {
      result.current.copyToClipboard("text", "test-id");
      // Flush the clipboard promise so setCopiedId fires
      await Promise.resolve();
    });

    expect(result.current.copiedId).toBe("test-id");

    act(() => jest.advanceTimersByTime(1500));
    expect(result.current.copiedId).toBeNull();

    jest.useRealTimers();
  });
});
