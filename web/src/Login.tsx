import { useState, type FormEvent } from "react";
import { login, signup, type Me } from "./api";

type Mode = "login" | "signup";

export function Login({ onOk }: { onOk: (me: Me) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const me =
        mode === "login"
          ? await login(name, password)
          : await signup(name, password);
      onOk(me);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (mode === "signup" && msg.includes("409")) {
        setError("That greenhouse name is already taken");
      } else if (mode === "signup") {
        setError("Could not create account");
      } else {
        setError("Invalid greenhouse name or password");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-panel">
        <header className="login-brand brand">
          <h1 className="brand-mark">
            Smart
            <br />
            Greenhouse
          </h1>
        </header>

        <div className="login-tabs" role="tablist" aria-label="Account">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`login-tab${mode === "login" ? " is-active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`login-tab${mode === "signup" ? " is-active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label className="login-label">
            Greenhouse name
            <input
              className="login-input"
              name="greenhouse_name"
              autoComplete="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="login-label">
            Password
            <input
              className="login-input"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" ? 4 : undefined}
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="login-submit" type="submit" disabled={busy}>
            {busy
              ? mode === "login"
                ? "Signing in…"
                : "Creating…"
              : mode === "login"
                ? "Log In"
                : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
