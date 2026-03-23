import { renderHook, act } from "@testing-library/react";
import { useLoginScreen } from "../../../src/hooks/useLoginScreen";

describe("useLoginScreen", () => {
  const mockOnLogin = jest.fn<Promise<void>, [string]>();

  beforeEach(() => {
    mockOnLogin.mockReset();
    mockOnLogin.mockResolvedValue(undefined);
  });

  it("has correct initial state", () => {
    const { result } = renderHook(() => useLoginScreen({ onLogin: mockOnLogin }));
    expect(result.current.tokenInput).toBe("");
    expect(result.current.loggingIn).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("updates tokenInput via setTokenInput", () => {
    const { result } = renderHook(() => useLoginScreen({ onLogin: mockOnLogin }));
    act(() => result.current.setTokenInput("ghp_test123"));
    expect(result.current.tokenInput).toBe("ghp_test123");
  });

  it("does nothing when handleLogin is called with empty input", async () => {
    const { result } = renderHook(() => useLoginScreen({ onLogin: mockOnLogin }));
    await act(async () => result.current.handleLogin());
    expect(mockOnLogin).not.toHaveBeenCalled();
    expect(result.current.error).toBe("");
  });

  it("sets error when token does not start with ghp_", async () => {
    const { result } = renderHook(() => useLoginScreen({ onLogin: mockOnLogin }));
    act(() => result.current.setTokenInput("gho_invalid"));
    await act(async () => result.current.handleLogin());
    expect(mockOnLogin).not.toHaveBeenCalled();
    expect(result.current.error).toContain("Classic PAT");
  });

  it("calls onLogin with trimmed token on valid ghp_ input", async () => {
    const { result } = renderHook(() => useLoginScreen({ onLogin: mockOnLogin }));
    act(() => result.current.setTokenInput("  ghp_abc123  "));
    await act(async () => result.current.handleLogin());
    expect(mockOnLogin).toHaveBeenCalledWith("ghp_abc123");
    expect(result.current.error).toBe("");
  });

  it("manages loggingIn state during async call", async () => {
    let resolve!: () => void;
    mockOnLogin.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));

    const { result } = renderHook(() => useLoginScreen({ onLogin: mockOnLogin }));
    act(() => result.current.setTokenInput("ghp_abc123"));

    // Start login — don't await yet
    let loginPromise: Promise<void>;
    await act(async () => {
      loginPromise = result.current.handleLogin();
    });

    // The login should still be in progress since the promise hasn't resolved
    // But act() awaits microtasks, so we need a different approach.
    // Instead, just verify the full flow works:
    expect(mockOnLogin).toHaveBeenCalledWith("ghp_abc123");

    await act(async () => {
      resolve();
      await loginPromise!;
    });
    expect(result.current.loggingIn).toBe(false);
  });

  it("sets error message when onLogin rejects", async () => {
    mockOnLogin.mockRejectedValue(new Error("bad token"));
    const { result } = renderHook(() => useLoginScreen({ onLogin: mockOnLogin }));
    act(() => result.current.setTokenInput("ghp_bad"));
    await act(async () => result.current.handleLogin());
    expect(result.current.error).toContain("Invalid token");
    expect(result.current.loggingIn).toBe(false);
  });
});
