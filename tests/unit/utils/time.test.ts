import { timeAgo, oneWeekAgo } from "../../../src/utils/time";

describe("timeAgo", () => {
  it("returns 'just now' for dates within the last 60 seconds", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("2d ago");
  });

  it("returns months ago", () => {
    const date = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("1mo ago");
  });
});

describe("oneWeekAgo", () => {
  it("returns an ISO date string 7 days before now", () => {
    const result = oneWeekAgo();
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    expect(result).toBe(expected.toISOString().split("T")[0]);
  });
});
