/* eslint-disable */
// Auriz — Adicionar transação (salva no Supabase)

const AddTransactionSheet = ({ open, onClose, familyId, members, categories, onSaved }) => {
  const [memberId,     setMemberId]     = React.useState(members[0]?.id ?? "");
  const [description,  setDescription]  = React.useState("");
  const [amount,       setAmount]       = React.useState("");
  const [categoryId,   setCategoryId]   = React.useState("");
  const [date,         setDate]         = React.useState(new Date().toISOString().slice(0,10));
  const [method,       setMethod]       = React.useState("PIX");
  const [installments, setInstallments] = React.useState(1);
  const [shared,       setShared]       = React.useState(false);
  const [shareWithId,  setShareWithId]  = React.useState("");
  const [recurring,    setRecurring]    = React.useState(false);
  const [isExpense,    setIsExpense]    = React.useState(true);
  const [loading,      setLoading]      = React.useState(false);
  const [error,        setError]        = React.useState("");

  React.useEffect(() => {
    if (members[0]?.id && !memberId) setMemberId(members[0].id);
  }, [members]);

  React.useEffect(() => {
    const first = categories.find(c => !c.is_income);
    if (first && !categoryId) setCategoryId(first.id);
  }, [categories]);

  // Ao mudar quem paga, limpa o "com quem dividir" se for o mesmo
  React.useEffect(() => {
    if (shareWithId === memberId) setShareWithId("");
  }, [memberId]);

  if (!open) return null;

  const numAmount   = parseFloat((amount || "0").replace(",", ".")) || 0;
  const halfAmount  = numAmount / 2;
  const payerName   = members.find(m => m.id === memberId)?.name?.split(" ")[0] ?? "";
  const partnerName = members.find(m => m.id === shareWithId)?.name?.split(" ")[0] ?? "";
  const othersAvail = members.filter(m => m.id !== memberId);

  const fmt = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const reset = () => {
    setDescription(""); setAmount(""); setInstallments(1);
    setShared(false); setShareWithId(""); setRecurring(false); setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description || !memberId || !categoryId) {
      setError("Preencha todos os campos obrigatórios."); return;
    }
    if (shared && !shareWithId) {
      setError("Selecione com quem dividir a despesa."); return;
    }
    setError(""); setLoading(true);
    try {
      const sign = isExpense ? -1 : 1;

      if (shared && shareWithId) {
        // Cria uma transação separada para cada membro (metade cada)
        const half = sign * Math.abs(halfAmount);
        const basePayload = {
          familyId, categoryId, description,
          amount: half, date, method,
          isShared: true, isRecurring: recurring,
          installmentCurrent: installments > 1 ? 1       : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        };
        await Promise.all([
          DB.addTransaction({ ...basePayload, memberId }),
          DB.addTransaction({ ...basePayload, memberId: shareWithId }),
        ]);
      } else {
        await DB.addTransaction({
          familyId, memberId, categoryId, description,
          amount: sign * Math.abs(numAmount),
          date, method,
          isShared: false, isRecurring: recurring,
          installmentCurrent: installments > 1 ? 1       : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        });
      }

      onSaved?.();
      onClose();
      reset();
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar.");
    } finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(37,32,26,0.4)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      animation: "auriz-fade 220ms var(--ease-out)" }}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} style={{
        background: "var(--paper)", width: "100%", maxWidth: 640,
        borderRadius: "var(--r-4) var(--r-4) 0 0", boxShadow: "var(--shadow-3)",
        padding: "28px 36px 32px", animation: "auriz-slide 280ms var(--ease-out)",
        maxHeight: "90vh", overflowY: "auto" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {["Despesa","Renda"].map(t => (
                <button key={t} type="button"
                  onClick={() => setIsExpense(t === "Despesa")}
                  style={{
                    padding: "4px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                    background: (t === "Despesa") === isExpense ? "var(--ink)" : "transparent",
                    color:      (t === "Despesa") === isExpense ? "var(--paper)" : "var(--ink-2)",
                    border: `1px solid ${(t === "Despesa") === isExpense ? "var(--ink)" : "var(--hairline)"}`,
                    fontFamily: "var(--font-sans)", transition: "all var(--dur-base) var(--ease-out)",
                  }}>{t}</button>
              ))}
            </div>
            <h2 className="a-h2" style={{ margin: 0, fontSize: 26 }}>
              {numAmount > 0 ? <>
                {isExpense ? "Gastaram" : "Receberam"}{" "}
                <em style={{ fontStyle: "normal", color: "var(--auriz-gold-deep)" }}>R$ {fmt(numAmount)}</em>
                {shared && shareWithId && numAmount > 0 && (
                  <span style={{ fontSize: 16, color: "var(--ink-3)", fontFamily: "var(--font-display)" }}>
                    {" "}— R$ {fmt(halfAmount)} cada
                  </span>
                )}
              </> : "Quanto foi?"}
            </h2>
          </div>
          <button type="button" onClick={() => { onClose(); reset(); }} style={{
            width: 36, height: 36, background: "var(--paper-deep)", border: "none",
            borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", color: "var(--ink-2)" }}>
            <Icon.X size={16} />
          </button>
        </div>

        {/* Quem paga */}
        <div style={{ marginBottom: 20 }}>
          <div className="a-overline" style={{ marginBottom: 8 }}>De quem é</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {members.map(m => (
              <button key={m.id} type="button" onClick={() => setMemberId(m.id)} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "6px 14px 6px 6px",
                borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: 500,
                background: memberId === m.id ? "var(--ink)" : "#fff",
                color:      memberId === m.id ? "var(--paper)" : "var(--ink)",
                border: `1px solid ${memberId === m.id ? "var(--ink)" : "var(--hairline)"}`,
                fontFamily: "var(--font-sans)", transition: "all var(--dur-base) var(--ease-out)",
              }}>
                <Avatar name={m.name} color={m.color} size={26} />
                {m.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Valor */}
        <div style={{ marginBottom: 20 }}>
          <div className="a-overline" style={{ marginBottom: 8 }}>Valor total</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8,
            background: "#fff", border: "1px solid var(--hairline)",
            borderRadius: "var(--r-3)", padding: "18px 22px" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-3)" }}>R$</span>
            <input value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0,00" inputMode="decimal"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent",
                fontFamily: "var(--font-display)", fontSize: 44, color: "var(--ink)",
                fontVariantNumeric: "tabular-nums lining-nums", letterSpacing: "-0.045em",
                padding: 0, lineHeight: 1 }} />
          </div>
        </div>

        {/* Descrição + Categoria */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 16 }}>
          <Input label="Descrição" placeholder="ex: Pão de Açúcar · Compras"
            value={description} onChange={e => setDescription(e.target.value)} required />
          <Select label="Categoria"
            value={categoryId} onChange={e => setCategoryId(e.target.value)}
            options={categories.filter(c => c.is_income === !isExpense).map(c => ({ value: c.id, label: c.name }))} />
        </div>

        {/* Data + Pagamento + Parcelas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
          <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Select label="Pagamento" value={method} onChange={e => setMethod(e.target.value)}
            options={[{value:"PIX",label:"PIX"},{value:"Cartão",label:"Cartão"},{value:"Dinheiro",label:"Dinheiro"}]} />
          <Input label="Parcelas" type="number" min="1" max="21" value={installments}
            onChange={e => setInstallments(e.target.value)} suffix={installments > 1 ? `×${installments}` : ""} />
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 10, marginBottom: shared ? 0 : 22 }}>
          <ToggleRow
            label="Dividir com a família"
            sub="Cria uma transação por pessoa (50% / 50%)."
            on={shared}
            onChange={() => { setShared(v => !v); setShareWithId(""); }}
          />
          <ToggleRow label="Recorrente" sub="Repete todo mês." on={recurring} onChange={() => setRecurring(!recurring)} />
        </div>

        {/* Painel de divisão — aparece quando shared=true */}
        {shared && (
          <div style={{
            margin: "14px 0 22px",
            background: "var(--auriz-gold-soft)", border: "1px solid var(--auriz-gold)",
            borderRadius: "var(--r-3)", padding: "16px 18px",
          }}>
            <div className="a-overline" style={{ marginBottom: 10, color: "var(--auriz-gold-deep)" }}>
              Com quem dividir?
            </div>

            {othersAvail.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Adicione outros membros na tela Membros primeiro.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: numAmount > 0 && shareWithId ? 14 : 0 }}>
                {othersAvail.map(m => (
                  <button key={m.id} type="button" onClick={() => setShareWithId(m.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 6px",
                    borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: 500,
                    background: shareWithId === m.id ? "var(--auriz-gold-deep)" : "#fff",
                    color:      shareWithId === m.id ? "#fff" : "var(--ink)",
                    border: `1px solid ${shareWithId === m.id ? "var(--auriz-gold-deep)" : "var(--hairline)"}`,
                    fontFamily: "var(--font-sans)", transition: "all var(--dur-base) var(--ease-out)",
                  }}>
                    <Avatar name={m.name} color={m.color} size={24} />
                    {m.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            )}

            {/* Preview 50/50 */}
            {numAmount > 0 && shareWithId && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr auto 1fr",
                gap: 10, alignItems: "center", marginTop: 14,
                background: "rgba(255,255,255,0.6)", borderRadius: "var(--r-2)", padding: "12px 16px",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--auriz-gold-deep)", fontWeight: 600, marginBottom: 4 }}>
                    {payerName}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
                    R$ {fmt(halfAmount)}
                  </div>
                </div>
                <div style={{ fontSize: 18, color: "var(--auriz-gold-deep)", fontWeight: 300 }}>+</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--auriz-gold-deep)", fontWeight: 600, marginBottom: 4 }}>
                    {partnerName}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
                    R$ {fmt(halfAmount)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: "var(--terracotta)", marginBottom: 14,
            display: "flex", gap: 6, alignItems: "center" }}>
            <Icon.AlertCircle size={13}/>{error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={() => { onClose(); reset(); }}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={15} /> : <Icon.Plus size={15}/>}>
            {loading
              ? "Salvando…"
              : shared && shareWithId
                ? `Registrar 2 transações`
                : "Registrar transação"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const ToggleRow = ({ label, sub, on, onChange }) => (
  <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--hairline-soft)",
    borderRadius: "var(--r-2)", cursor: "pointer" }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>}
    </div>
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 999,
      background: on ? "var(--auriz-gold)" : "var(--hairline)", border: "none",
      position: "relative", cursor: "pointer", flexShrink: 0, marginLeft: 10,
      transition: "background var(--dur-base) var(--ease-out)" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: 999, background: "#fff",
        boxShadow: "var(--shadow-1)", transition: "left var(--dur-base) var(--ease-out)" }} />
    </div>
  </label>
);

window.AddTransactionSheet = AddTransactionSheet;
