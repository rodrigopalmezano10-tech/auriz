/* eslint-disable */
// Auriz — Transações — lista completa com delete, edit e filtros

const TransactionsScreen = ({ familyId, month, year, members, categories, viewMember, onAddTransaction, onEditTransaction }) => {
  const [txs, setTxs]       = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter]   = React.useState("all");   // all | shared | installments | income
  const [deleting, setDeleting] = React.useState(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const { show: showToast, el: toastEl } = useToast();

  const load = () => {
    setLoading(true);
    DB.getTransactions(familyId, month + 1, year)
      .then(setTxs).finally(() => setLoading(false));
  };

  React.useEffect(() => { if (familyId) load(); }, [familyId, month, year]);

  const handleDelete = async (id) => {
    if (!confirm("Remover esta transação? A ação pode ser revertida pelo banco de dados.")) return;
    setDeleting(id);
    try { await DB.softDeleteTransaction(id); showToast("Transação removida."); load(); }
    catch { showToast("Não foi possível remover.", "error"); }
    finally { setDeleting(null); }
  };

  let filtered = viewMember && viewMember !== "all" ? txs.filter(t => t.member_id === viewMember) : txs;
  if (filter === "shared")       filtered = filtered.filter(t => t.is_shared);
  if (filter === "installments") filtered = filtered.filter(t => t.installment_label);
  if (filter === "income")       filtered = filtered.filter(t => t.amount > 0);
  if (filter === "expenses")     filtered = filtered.filter(t => t.amount < 0);

  const grouped = filtered.reduce((acc, tx) => {
    const k = tx.transaction_date;
    if (!acc[k]) acc[k] = [];
    acc[k].push(tx); return acc;
  }, {});

  const totalThisMonth = filtered.filter(t => t.amount < 0 && !t.is_projected).reduce((s, t) => s + Math.abs(t.amount), 0);

  if (loading) return <LoadingPane label="Carregando transações…" />;

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 1280, margin: "0 auto" }}>
      {toastEl}
      <ImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        familyId={familyId}
        members={members}
        categories={categories ?? []}
        onImported={load}
      />

      {/* Resumo + filtros */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 28, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div className="a-overline">Gasto · {filtered.filter(t => !t.is_projected).length} transações</div>
          <div style={{ marginTop: 6 }}><Money value={-totalThisMonth} size="lg" tone="terra" /></div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "all",          label: "Todas" },
            { key: "expenses",     label: "Despesas" },
            { key: "income",       label: "Renda" },
            { key: "shared",       label: "Compartilhadas" },
            { key: "installments", label: "Parceladas" },
          ].map(f => (
            <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</FilterChip>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)} leading={<Icon.Upload size={14}/>}>
          Importar
        </Button>
        <Button variant="primary" size="sm" onClick={onAddTransaction} leading={<Icon.Plus size={14}/>}>
          Adicionar
        </Button>
      </div>

      {/* Lista */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon="CreditCard" title="Nenhuma transação neste período."
          description="Adicione a primeira pelo botão acima."
          action={<Button variant="primary" size="sm" onClick={onAddTransaction} leading={<Icon.Plus size={14}/>}>Adicionar transação</Button>} />
      ) : (
        <Card padded={false}>
          {Object.entries(grouped).map(([date, txList], gi) => (
            <div key={date}>
              <div style={{ padding: "12px 24px 8px",
                borderTop: gi === 0 ? "none" : "1px solid var(--hairline-soft)",
                background: "var(--paper)" }}>
                <span className="a-overline">
                  {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <span style={{ marginLeft: 10, fontFamily: "var(--font-display)", color: "var(--ink-3)", fontSize: 13 }}>
                  {txList.filter(t => !t.is_projected).length} {txList.filter(t => !t.is_projected).length === 1 ? "lançamento" : "lançamentos"}
                  {txList.some(t => t.is_projected) && (
                    <span style={{ marginLeft: 6, color: "var(--auriz-gold-deep)", fontSize: 11 }}>
                      + {txList.filter(t => t.is_projected).length} projetada{txList.filter(t => t.is_projected).length > 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              </div>
              {txList.map((tx) => {
                const isProjected = !!tx.is_projected;
                return (
                  <div key={tx.id + (isProjected ? '_proj' : '')} style={{
                    display: "grid", gridTemplateColumns: "36px 1fr 130px 140px 36px 36px", gap: 14,
                    alignItems: "center", padding: "12px 24px",
                    borderTop: "1px solid var(--hairline-soft)",
                    background: isProjected ? "var(--auriz-gold-soft)" : "var(--surface)",
                    transition: "background var(--dur-fast) var(--ease-out)",
                    opacity: (deleting === tx.id) ? 0.4 : isProjected ? 0.75 : 1,
                  }}
                  onMouseEnter={e => { if (!isProjected) e.currentTarget.style.background = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isProjected ? "var(--auriz-gold-soft)" : "var(--surface)"; }}>
                    <CategoryChip name={tx.category_name} icon={tx.category_icon} color={tx.category_color} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        {tx.description}
                        {isProjected && <span style={{ fontSize: 11, color: "var(--auriz-gold-deep)", fontStyle: "italic" }}>projetada</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2,
                        display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span>{tx.category_name}</span>
                        {tx.installment_label && <Badge tone="neutral">{tx.installment_label}</Badge>}
                        {tx.is_shared && <Badge tone="teal">dividida</Badge>}
                        {tx.is_recurring && <Badge tone="plum">recorrente</Badge>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={tx.member_name ?? "?"} color={tx.member_color ?? "gold"} size={22} />
                      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{tx.member_name?.split(" ")[0]}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <MoneyMono value={tx.amount} tone={tx.amount > 0 ? "sage" : "terra"} />
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{tx.method}</div>
                    </div>
                    {/* Editar */}
                    <button
                      onClick={() => onEditTransaction?.(tx)}
                      style={{ background: "transparent", border: "none", cursor: "pointer",
                        color: isProjected ? "var(--auriz-gold-deep)" : "var(--ink-3)",
                        padding: 4, display: "flex", borderRadius: "var(--r-1)" }}
                      title={isProjected ? "Registrar esta recorrente" : "Editar"}>
                      <Icon.Edit size={15} />
                    </button>
                    {/* Deletar — não disponível para projetadas */}
                    <button
                      onClick={() => !isProjected && handleDelete(tx.id)}
                      disabled={deleting === tx.id || isProjected}
                      style={{ background: "transparent", border: "none",
                        cursor: isProjected ? "default" : "pointer",
                        color: isProjected ? "transparent" : "var(--ink-3)",
                        padding: 4, display: "flex", borderRadius: "var(--r-1)" }}
                      title={isProjected ? "" : "Remover"}>
                      <Icon.Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

const FilterChip = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "6px 14px", borderRadius: 999,
    background: active ? "var(--ink)" : "#fff",
    color: active ? "var(--paper)" : "var(--ink-2)",
    border: `1px solid ${active ? "var(--ink)" : "var(--hairline)"}`,
    cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)",
    transition: "all var(--dur-base) var(--ease-out)",
  }}>{children}</button>
);

window.TransactionsScreen = TransactionsScreen;
window.FilterChip = FilterChip;
