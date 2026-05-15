/* eslint-disable */
// Auriz — Primeiro acesso: cria família + membro

const COLOR_OPTIONS = [
  { value: "gold",  label: "Dourado"  },
  { value: "sage",  label: "Verde"    },
  { value: "teal",  label: "Teal"     },
  { value: "plum",  label: "Ameixa"   },
  { value: "terra", label: "Terracota"},
  { value: "ink",   label: "Tinta"    },
];

const SetupScreen = ({ userId, onDone }) => {
  const [familyName, setFamilyName] = React.useState("Família ");
  const [memberName, setMemberName] = React.useState("");
  const [color, setColor]           = React.useState("gold");
  const [income, setIncome]         = React.useState("");
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!familyName.trim() || !memberName.trim()) return;
    setError(""); setLoading(true);
    try {
      await DB.createFamily(familyName.trim(), userId, memberName.trim(), color, parseFloat(income) || 0);
      onDone();
    } catch (err) {
      setError(err.message ?? "Não foi possível criar a família.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Logo height={28} />
        <div style={{ marginTop: 40 }}>
          <span className="a-overline">Primeiro acesso</span>
          <h1 className="a-h1" style={{ fontSize: 38, margin: "8px 0 8px" }}>Bem-vindo ao Auriz.</h1>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-3)",
            lineHeight: 1.5, margin: "0 0 36px" }}>
            Vamos criar o espaço da sua família. Leva menos de um minuto.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Input label="Nome da família" placeholder="ex: Família Souza"
            value={familyName} onChange={e => setFamilyName(e.target.value)} required />

          <div style={{ height: 1, background: "var(--hairline-soft)" }} />

          <Input label="Seu nome" placeholder="Como você quer ser chamado"
            value={memberName} onChange={e => setMemberName(e.target.value)} required />

          <Input label="Renda mensal (R$)" type="number" placeholder="0,00" step="0.01" min="0"
            value={income} onChange={e => setIncome(e.target.value)}
            hint="Usado para calcular divisão proporcional de despesas." />

          <div>
            <div className="a-overline" style={{ marginBottom: 10 }}>Sua cor no sistema</div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)} style={{
                  width: 36, height: 36, borderRadius: 999, border: "none", cursor: "pointer",
                  outline: color === c.value ? "3px solid var(--auriz-gold)" : "none",
                  outlineOffset: 2 }}>
                  <Avatar name={memberName || "?"} color={c.value} size={36} />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "var(--terracotta)", background: "var(--terracotta-soft)",
              padding: "10px 14px", borderRadius: "var(--r-2)" }}>{error}</div>
          )}

          <Button variant="primary" size="lg" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={16} /> : <Icon.ArrowRight size={16} />}>
            {loading ? "Criando família…" : "Começar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

window.SetupScreen = SetupScreen;
