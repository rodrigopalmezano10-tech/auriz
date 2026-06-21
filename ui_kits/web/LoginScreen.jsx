/* eslint-disable */
// Auriz — Login (Cloudflare Worker Auth)

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail]       = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await DB.signIn(email, password); onLogin(); }
    catch (err) { setError(err.message ?? "Credenciais inválidas."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)",
      display: "grid", gridTemplateColumns: "1.1fr 1fr" }}>

      {/* Esquerda — editorial */}
      <div style={{ padding: "56px 64px", display: "flex", flexDirection: "column",
        background: "var(--paper-deep)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: "url(../../assets/pattern-coin.svg)", backgroundSize: "240px",
          opacity: 0.18, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}><Logo height={32} /></div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600,
              fontSize: 84, lineHeight: 0.98, letterSpacing: "-0.04em",
              margin: 0, color: "var(--ink)", maxWidth: 520 }}>
              Suas finanças,<br />
              <em style={{ fontStyle: "normal", color: "var(--auriz-gold-deep)" }}>com horizonte.</em>
            </h1>
            <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 440, marginTop: 22, marginBottom: 0 }}>
              Auriz é a maneira calma de cuidar do dinheiro da família. Sem alarmes, sem confetes. Só os números, em ordem.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 12.5, color: "var(--ink-3)", position: "relative", zIndex: 1 }}>
          <span>© 2025 Auriz</span><span>·</span><span>Privacidade</span><span>·</span><span>Termos</span>
        </div>
      </div>

      {/* Direita — formulário */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <span className="a-overline">Entrar</span>
          <h2 className="a-h2" style={{ fontSize: 32, margin: "8px 0 6px" }}>Bem-vindos de volta.</h2>
          <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "0 0 32px" }}>Continue de onde a família parou.</p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Email" type="email" placeholder="você@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Senha" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

            {error && (
              <div style={{ fontSize: 13, color: "var(--terracotta)", background: "var(--terracotta-soft)",
                padding: "10px 14px", borderRadius: "var(--r-2)", display: "flex", gap: 8, alignItems: "center" }}>
                <Icon.AlertCircle size={14} />{error}
              </div>
            )}

            <Button variant="primary" size="lg" type="submit" disabled={loading}
              trailing={loading ? <Spinner size={16} /> : <Icon.ArrowRight size={16} />}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>

          </form>
        </div>
      </div>
    </div>
  );
};

window.LoginScreen = LoginScreen;
