/* eslint-disable */
// Auriz — Teto de Gastos: limites por categoria/mês

const TetoScreen = ({ familyId, month, year }) => {
  const [budgets, setBudgets]   = React.useState([]);
  const [cats, setCats]         = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [addOpen, setAddOpen]   = React.useState(false);
  const { show: showToast, el: toastEl } = useToast();

  const load = () => {
    Promise.all([
      DB.getBudgetStatus(familyId, month + 1, year),
      DB.getCategories(familyId),
    ]).then(([b, c]) => { setBudgets(b); setCats(c.filter(c => !c.is_income)); })
      .finally(() => setLoading(false));
  };
  React.useEffect(() => { if (familyId) load(); }, [familyId, month, year]);

  const handleDelete = async (b) => {
    if (!confirm(`Remover teto de "${b.category_name}"?`)) return;
    await DB.deleteBudgetLimit(familyId, b.category_id, month + 1, year);
    showToast("Teto removido."); load();
  };

  const totalLimit = budgets.reduce((s, b) => s + parseFloat(b.limit_amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent ?? 0), 0);

  if (loading) return <LoadingPane label="Carregando tetos…" />;

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 900, margin: "0 auto" }}>
      {toastEl}
      <SectionHeader title="Teto de gastos" caption={`limites por categoria — ${MONTHS_PT[month]} ${year}`}
        action={<Button variant="primary" size="sm" onClick={() => setAddOpen(true)} leading={<Icon.Plus size={14}/>}>
          Definir teto
        </Button>} />

      {budgets.length > 0 && (
        <Card padded={false} style={{ padding: "22px 28px", marginBottom: 24,
          display: "flex", gap: 40, alignItems: "center" }}>
          <div>
            <div className="a-overline" style={{ marginBottom: 4 }}>Total orçado</div>
            <Money value={totalLimit} size="md" tone="ink" />
          </div>
          <div>
            <div className="a-overline" style={{ marginBottom: 4 }}>Gasto até agora</div>
            <Money value={totalSpent} size="md" tone={totalSpent > totalLimit ? "terra" : "ink"} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="a-overline" style={{ marginBottom: 8 }}>Uso geral</div>
            <ProgressBar pct={totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0}
              tone={totalSpent >= totalLimit ? "over" : totalSpent >= totalLimit * 0.75 ? "warn" : "ok"} />
          </div>
        </Card>
      )}

      {budgets.length === 0 ? (
        <EmptyState icon="TrendingUp" title="Nenhum teto definido para este mês."
          description="Defina limites por categoria para controlar os gastos da família."
          action={<Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>Definir agora</Button>} />
      ) : (
        <Card padded={false}>
          {budgets.map((b, i) => (
            <div key={b.category_id} style={{
              padding: "18px 22px",
              borderBottom: i < budgets.length - 1 ? "1px solid var(--hairline-soft)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <CategoryChip name={b.category_name} icon={b.category_icon} color={b.category_color} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{b.category_name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-2)" }}>
                        R$ {parseFloat(b.spent ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        <span style={{ color: "var(--ink-3)" }}> / R$ {parseFloat(b.limit_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </span>
                      <Badge tone={b.status === "over" ? "terra" : b.status === "warn" ? "amber" : "sage"}>
                        {b.status === "over" ? "acima" : b.status === "warn" ? "atenção" : "ok"} · {parseFloat(b.pct_used ?? 0).toFixed(0)}%
                      </Badge>
                      <button onClick={() => handleDelete(b)} style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "var(--ink-3)", padding: 4, display: "flex" }}>
                        <Icon.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <ProgressBar pct={parseFloat(b.pct_used ?? 0)} tone={b.status === "over" ? "over" : b.status === "warn" ? "warn" : "ok"} />
            </div>
          ))}
        </Card>
      )}

      <AddBudgetModal open={addOpen} familyId={familyId} month={month + 1} year={year}
        categories={cats} existingCatIds={budgets.map(b => b.category_id)}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); showToast("Teto definido."); load(); }} />
    </div>
  );
};

const AddBudgetModal = ({ open, familyId, month, year, categories, existingCatIds, onClose, onSaved }) => {
  const available = categories.filter(c => !existingCatIds.includes(c.id));
  const [catId, setCatId]   = React.useState(available[0]?.id ?? "");
  const [limit, setLimit]   = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (available[0]?.id) setCatId(available[0].id);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await DB.upsertBudgetLimit({ familyId, categoryId: catId, month, year, limitAmount: limit }); onSaved(); setLimit(""); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Definir teto">
      {available.length === 0 ? (
        <div>
          <p style={{ color: "var(--ink-2)", fontSize: 14 }}>Todas as categorias já têm teto definido para este mês.</p>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select label="Categoria" value={catId} onChange={e => setCatId(e.target.value)}
            options={available.map(c => ({ value: c.id, label: c.name }))} />
          <Input label="Limite mensal (R$)" type="number" min="1" step="0.01" placeholder="ex: 800,00"
            value={limit} onChange={e => setLimit(e.target.value)} required />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={loading}
              trailing={loading ? <Spinner size={14}/> : null}>
              {loading ? "Salvando…" : "Definir teto"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

window.TetoScreen = TetoScreen;
