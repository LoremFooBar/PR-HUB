import { useState, useCallback } from "react";
import type { PullRequestItem } from "../types";
import { PAGE_SIZE } from "../constants";

export function usePRList(prs: PullRequestItem[]) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
