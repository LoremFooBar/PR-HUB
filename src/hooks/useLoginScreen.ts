import { useState } from "react";

interface UseLoginScreenOptions {
  onLogin(token: string): Promise<void>;
}

export function useLoginScreen({ onLogin }: UseLoginScreenOptions) {
  const [tokenInput, setTokenInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    const pat = tokenInput.trim();
    if (!pat) return;
    if (!pat.startsWith("ghp_")) {
      setError("Please use a Classic PAT (starts with ghp_). Fine-grained tokens are not supported.");
      return;
    }
    setError("");
    setLoggingIn(true);
    try {
      await onLogin(pat);
    } catch {
      setError("Invalid token. Make sure it has repo and read:user scopes.");
    } finally {
      setLoggingIn(false);
    }
  }

  return {
    tokenInput,
    setTokenInput,
    loggingIn,
    error,
    handleLogin,
  };
}
