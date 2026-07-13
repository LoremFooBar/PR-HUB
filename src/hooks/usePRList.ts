import { useState, useCallback, useEffect } from "react";
import type { PullRequestItem } from "../types";
import { PAGE_SIZE } from "../constants";

export function usePRList(prs: PullRequestItem[]) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reset pagination when the list changes (filter query or tab switch). The
  // caller memoizes `prs`, so this only fires on a real change, not every render.
  useEffect(() => { setVisible(PAGE_SIZE); }, [prs]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  const visiblePRs = prs.slice(0, visible);
  const remainingCount = prs.length - visible;

  function showMore() {
    setVisible((prev) => prev + PAGE_SIZE);
  }

  return {
    visiblePRs,
    remainingCount,
    copiedId,
    copyToClipboard,
    showMore,
  };
}
