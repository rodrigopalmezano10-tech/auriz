/* eslint-disable */
// Auriz — Categorias: lista + criação de categorias personalizadas

const LUCIDE_ICONS = [
  "Home","ShoppingCart","Dumbbell","Sparkles","Shirt","HeartPulse","Car","Monitor",
  "TrendingUp","Wallet","PiggyBank","Tag","Coffee","BookOpen","Music",
  "Briefcase","Zap","Phone",
];
const COLOR_TOKENS = ["sage","terra","teal","plum","amber","neutral"];

const CategoriasScreen = ({ familyId }) => {
  const [cats, setCats]     = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const { show: showToast, el: toastEl } = useToast();

  const load = () => DB.getCategories(familyId).then(setCats).finally(() => setLoading(false));
  React.useEffect(() => { if (familyId) load(); }, [familyId]);

  const handleDelete = async (cat) => {
    if (cat.is_default) return;
    if (!confirm(`Remover categoria "${cat.name}"?`)) return;
    await DB.softDeleteCategory(cat.id);
    showToast("Categoria removida."); load();
  };

  const defaults  = cats.filter(c => c.is_default || !c.family_id);
  const customs   = cats.filter(c => !c.is_default && c.family_id);

  if (loading) return <LoadingPane label="Carregando categorias…" />;

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 900, margin: "0 auto" }}>
      {toastEl}
      <SectionHeader title="Categorias" caption="como vocês organizam o gasto"
        action={<Button variant="primary" size="sm" onClick={() => setAddOpen(true)} leading={<Icon.Plus size={14}/>}>
          Nova categoria
        </Button>} />

      <div style={{ marginBottom: 28 }}>
        <div className="a-overline" style={{ marginBottom: 14 }}>Categorias padrão</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {defaults.map(cat => <CatCard key={cat.id} cat={cat} onDelete={() => {}} />)}
        </div>
      </div>

      <div>
        <div className="a-overline" style={{ marginBottom: 14 }}>Suas categorias</div>
        {customs.length === 0 ? (
          <EmptyState icon="Tag" title="Nenhuma categoria personalizada."
            description="Crie categorias para despesas específicas da sua família."
            action={<Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>Criar agora</Button>} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {customs.map(cat => <CatCard key={cat.id} cat={cat} onDelete={() => handleDelete(cat)} deletable />)}
          </div>
        )}
      </div>

      <AddCategoryModal open={addOpen} familyId={familyId}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); showToast("Categoria criada."); load(); }} />
    </div>
  );
};

const CatCard = ({ cat, onDelete, deletable }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
    background: "var(--surface)", border: "1px solid var(--hairline)",
    borderRadius: "var(--r-3)", boxShadow: "var(--shadow-1)" }}>
    <CategoryChip name={cat.name} icon={cat.icon} color={cat.color} size={38} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{cat.name}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
        {cat.is_income ? "Renda" : "Despesa"} · {cat.is_default ? "padrão" : "personalizada"}
      </div>
    </div>
    {deletable && (
      <button onClick={onDelete} style={{ background: "transparent", border: "none",
        cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "flex" }}>
        <Icon.Trash2 size={15} />
      </button>
    )}
  </div>
);

const AddCategoryModal = ({ open, familyId, onClose, onSaved }) => {
  const [name, setName]     = React.useState("");
  const [icon, setIcon]     = React.useState("Wallet");
  const [color, setColor]   = React.useState("neutral");
  const [isIncome, setIsIncome] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await DB.addCategory({ familyId, name, icon, color, isIncome }); onSaved(); setName(""); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova categoria" width={520}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="Nome" placeholder="ex: Pets, Presente, Educação"
          value={name} onChange={e => setName(e.target.value)} required />

        <div style={{ display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px", background: "var(--surface)",
          border: "1px solid var(--hairline)", borderRadius: "var(--r-2)" }}>
          <CategoryChip name={name || "Nova"} icon={icon} color={color} size={38} />
          <span style={{ fontSize: 15, fontWeight: 500 }}>{name || "Nova categoria"}</span>
        </div>

        <div>
          <div className="a-overline" style={{ marginBottom: 8 }}>Ícone</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LUCIDE_ICONS.map(ic => {
              const IconEl = window.Icon?.[ic];
              return (
                <button key={ic} type="button" onClick={() => setIcon(ic)} style={{
                  width: 36, height: 36, borderRadius: "var(--r-2)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: icon === ic ? "var(--ink)" : "var(--surface)",
                  color: icon === ic ? "var(--paper)" : "var(--ink-2)",
                  outline: icon === ic ? "2px solid var(--auriz-gold)" : "none",
                }}>
                  {IconEl && <IconEl size={16} />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="a-overline" style={{ marginBottom: 8 }}>Cor</div>
          <div style={{ display: "flex", gap: 8 }}>
            {COLOR_TOKENS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{
                padding: "5px 12px", borderRadius: "var(--r-pill)", fontSize: 12, cursor: "pointer",
                background: `var(--${c}-soft, var(--paper-deep))`,
                color: c === "neutral" ? "var(--ink-2)" : `var(--${c})`,
                border: `1px solid ${color === c ? `var(--${c === "neutral" ? "ink" : c})` : "transparent"}`,
                fontWeight: color === c ? 600 : 400, fontFamily: "var(--font-sans)",
              }}>{c}</button>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={isIncome} onChange={e => setIsIncome(e.target.checked)}
            style={{ accentColor: "var(--auriz-gold)", width: 16, height: 16 }} />
          <span style={{ fontSize: 14, color: "var(--ink)" }}>Categoria de renda (entrada)</span>
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={14}/> : null}>
            {loading ? "Criando…" : "Criar categoria"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

window.CategoriasScreen = CategoriasScreen;
