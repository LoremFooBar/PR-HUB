import { useLoginScreen } from "../hooks/useLoginScreen";

interface LoginScreenProps {
  onLogin(token: string): Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { tokenInput, setTokenInput, loggingIn, error, handleLogin } = useLoginScreen({ onLogin });

  return (
    <div className="container">
      <h2 className="login-heading">PR Hub</h2>
      <p className="login-description">
        Enter a Classic Personal Access Token (starts with <b>ghp_</b>) with
        the following scopes:
      </p>
      <ul className="badge-list">
        <li className="badge badge--required">repo</li>
        <li className="badge badge--required">read:user</li>
      </ul>
      <input
        type="password"
        placeholder="ghp_…"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        className="input"
      />
      {error && <p className="error-text">{error}</p>}
      <button
        disabled={loggingIn || !tokenInput.trim()}
        onClick={handleLogin}
        className="btn-primary"
      >
        {loggingIn ? "Logging in…" : "Login"}
      </button>
    </div>
  );
}
