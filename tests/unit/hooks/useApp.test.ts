import { renderHook, act } from "@testing-library/react";
import { useApp } from "../../../src/hooks/useApp";
import type { GitHubUser, PullRequestItem } from "../../../src/types";

// Mock modules
jest.mock("../../../src/github");
jest.mock("../../../src/storage");

const github = jest.requireMock("../../../src/github") as {
  validateToken: jest.Mock;
  fetchAuthoredPRs: jest.Mock;
  fetchReviewPRs: jest.Mock;
  fetchMergedPRs: jest.Mock;
};

const storage = jest.requireMock("../../../src/storage") as {
  getInitCache: jest.Mock;
  setToken: jest.Mock;
  removeToken: jest.Mock;
  setCachedUser: jest.Mock;
  setCachedTab: jest.Mock;
  clearCache: jest.Mock;
};

const mockUser: GitHubUser = { login: "testuser", avatar_url: "https://avatar.url" };

const mockPRs: PullRequestItem[] = [
  {
    id: 1,
    number: 1,
    title: "Test PR",
    html_url: "https://github.com/owner/repo/pull/1",
    repository_url: "https://api.github.com/repos/owner/repo",
    created_at: new Date().toISOString(),
    comments: 0,
  },
];

beforeEach(() => {
  // Default: no cache
  storage.getInitCache.mockResolvedValue({
    token: null,
    user: null,
    assigned: null,
    reviews: null,
    merged: null,
  });
  storage.setToken.mockResolvedValue(undefined);
  storage.removeToken.mockResolvedValue(undefined);
  storage.setCachedUser.mockResolvedValue(undefined);
  storage.setCachedTab.mockResolvedValue(undefined);
  storage.clearCache.mockResolvedValue(undefined);

  github.validateToken.mockResolvedValue(mockUser);
  github.fetchAuthoredPRs.mockResolvedValue(mockPRs);
  github.fetchReviewPRs.mockResolvedValue([]);
  github.fetchMergedPRs.mockResolvedValue([]);
});

describe("useApp", () => {
  it("sets loading to false when no cached token", async () => {
    const { result } = renderHook(() => useApp());
    // Wait for init to complete
    await act(() => Promise.resolve());
    expect(result.current.loading).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("shows cached data immediately when cache exists", async () => {
    storage.getInitCache.mockResolvedValue({
      token: "ghp_cached",
      user: mockUser,
      assigned: mockPRs,
      reviews: null,
      merged: null,
    });

    const { result } = renderHook(() => useApp());
    await act(() => Promise.resolve());

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.assigned).toEqual(mockPRs);
  });

  it("handles login flow: validates, stores, and loads PRs", async () => {
    const { result } = renderHook(() => useApp());
    await act(() => Promise.resolve());

    await act(() => result.current.handleLogin("ghp_valid"));

    expect(github.validateToken).toHaveBeenCalledWith("ghp_valid");
    expect(storage.setToken).toHaveBeenCalledWith("ghp_valid");
    expect(storage.setCachedUser).toHaveBeenCalledWith(mockUser);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe("ghp_valid");
    expect(result.current.assigned).toEqual(mockPRs);
  });

  it("clears all state on logout", async () => {
    const { result } = renderHook(() => useApp());
    await act(() => Promise.resolve());

    // Login first
    await act(() => result.current.handleLogin("ghp_valid"));
    expect(result.current.user).toEqual(mockUser);

    // Logout
    await act(() => result.current.logout());
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.assigned).toEqual([]);
    expect(result.current.reviews).toEqual([]);
    expect(result.current.merged).toEqual([]);
    expect(storage.removeToken).toHaveBeenCalled();
    expect(storage.clearCache).toHaveBeenCalled();
  });

  it("loads tab data on handleTabChange", async () => {
    const { result } = renderHook(() => useApp());
    await act(() => Promise.resolve());
    await act(() => result.current.handleLogin("ghp_valid"));

    github.fetchReviewPRs.mockResolvedValue(mockPRs);
    await act(() => result.current.handleTabChange("reviews"));
    expect(github.fetchReviewPRs).toHaveBeenCalledWith("ghp_valid", "testuser");
  });

  it("clears data and force-reloads on handleReload", async () => {
    const { result } = renderHook(() => useApp());
    await act(() => Promise.resolve());
    await act(() => result.current.handleLogin("ghp_valid"));

    // Reset mock to track reload call
    github.fetchAuthoredPRs.mockClear();
    github.fetchAuthoredPRs.mockResolvedValue(mockPRs);

    await act(() => result.current.handleReload("assigned"));
    expect(github.fetchAuthoredPRs).toHaveBeenCalledWith("ghp_valid", "testuser");
  });
});
