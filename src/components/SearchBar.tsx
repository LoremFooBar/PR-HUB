import { useEffect, useRef } from "react";
import { SearchIcon, CloseIcon } from "./Icons";

interface SearchBarProps {
  value: string;
  onChange(value: string): void;
  resultCount: number;
  totalCount: number;
}

export default function SearchBar({ value, onChange, resultCount, totalCount }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the filter from anywhere, unless already typing in a field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const hasQuery = value.length > 0;

  return (
    <div className="search-bar" role="search">
      <SearchIcon size={14} className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Filter PRs…"
        aria-label="Filter pull requests"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            inputRef.current?.blur();
          }
        }}
      />
      {hasQuery && (
        <>
          <span className="search-count">{resultCount}/{totalCount}</span>
          <button
            type="button"
            className="search-clear"
            aria-label="Clear filter"
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
          >
            <CloseIcon size={14} />
          </button>
        </>
      )}
    </div>
  );
}
