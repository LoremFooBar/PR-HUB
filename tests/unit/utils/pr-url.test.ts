import { normalizePRUrl } from "../../../src/utils/pr-url";

describe("normalizePRUrl", () => {
  it("returns the canonical URL for a plain PR link", () => {
    expect(normalizePRUrl("https://github.com/my-org/my-repo/pull/42")).toBe(
      "https://github.com/my-org/my-repo/pull/42"
    );
  });

  it("strips sub-pages, query strings and fragments", () => {
    const canonical = "https://github.com/my-org/my-repo/pull/42";
    expect(normalizePRUrl("https://github.com/my-org/my-repo/pull/42/files")).toBe(canonical);
    expect(normalizePRUrl("https://github.com/my-org/my-repo/pull/42/commits/abc123")).toBe(canonical);
    expect(normalizePRUrl("https://github.com/my-org/my-repo/pull/42?diff=split")).toBe(canonical);
    expect(normalizePRUrl("https://github.com/my-org/my-repo/pull/42#issuecomment-1")).toBe(canonical);
    expect(normalizePRUrl("https://www.github.com/my-org/my-repo/pull/42")).toBe(canonical);
  });

  it("rejects non-PR GitHub URLs", () => {
    expect(normalizePRUrl("https://github.com/my-org/my-repo/issues/42")).toBeNull();
    expect(normalizePRUrl("https://github.com/my-org/my-repo/pull/not-a-number")).toBeNull();
    expect(normalizePRUrl("https://github.com/my-org/my-repo")).toBeNull();
  });

  it("rejects other hosts and malformed URLs", () => {
    expect(normalizePRUrl("https://gitlab.com/my-org/my-repo/pull/42")).toBeNull();
    expect(normalizePRUrl("https://github.com.evil.example/o/r/pull/42")).toBeNull();
    expect(normalizePRUrl("/my-org/my-repo/pull/42")).toBeNull();
    expect(normalizePRUrl("")).toBeNull();
  });
});
