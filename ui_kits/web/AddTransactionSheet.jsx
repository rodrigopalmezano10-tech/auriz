/* eslint-disable */
// Auriz — Adicionar / Editar transação

const AddTransactionSheet = ({ open, onClose, familyId, members, categories, onSaved, editTx }) => {
  const [memberId, setMemberId]       = React.useState(members[0]?.id ?? "");
  const [shareWithId, setShareWithId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount]           = React.useState("");
  const [categoryId, setCategoryId]   = React.useState("");
  const [date, setDate]               = React.useState(new Date().toISOString().slice(0,10));
  const [method, setMethod]           = React.useState("PIX");
  const [installments, setInstallments] = React.useState(1);
  const [shared, setShared]           = React.useState(false);
  const [recurring, setRecurring]     = React.useState(false);
  const [isExpense, setIsExpense]     = React.useState(true);
  const [loading, setLoading]         = React.useState(false);
  const [error, setError]             = React.useState("");

  // Sincroniza o formulário quando abre ou quando muda a transação a editar
  React.useEffect(() => {
    if (!open) return;
    if (editTx) {
      setMemberId(editTx.member_id ?? members[0]?.id ?? "");
      setDescription(editTx.description ?? "");
      setAmount(String(Math.abs(editTx.amount ?? 0)));
      setCategoryId(editTx.category_id ?? "");
      setDate(editTx.transaction_date ?? new Date().toISOString().slice(0,10));
      setMethod(editTx.method ?? "PIX");
      setInstallments(editTx.installment_total ?? 1);
      setRecurring(!!editTx.is_recurring);
      setIsExpense((editTx.amount ?? -1) <= 0);
      setShared(false);
      setShareWithId("");
    } else {
      setMemberId(members[0]?.id ?? "");
      setDescription("");
      setAmount("");
      setCategoryId(categories.find(c => !c.is_income)?.id ?? "");
      setDate(new Date().toISOString().slice(0,10));
      setMethod("PIX");
      setInstallments(1);
      setRecurring(false);
      setIsExpense(true);
      setShared(false);
      setShareWithId("");
    }
    setError("");
  }, [open, editTx]);

  React.useEffect(() => {
    if (members[0]?.id && !memberId) setMemberId(members[0].id);
  }, [members]);

  React.useEffect(() => {
    const first = categories.find(c => !c.is_income);
    if (first && !categoryId) setCategoryId(first.id);
  }, [categories]);

  if (!open) return null;

  const isEditing   = !!(editTx && !editTx.is_projected);
  const isConfirm   = !!(editTx && editTx.is_projected);

  const numAmount  = parseFloat((amount || "0").replace(",", ".")) || 0;
  const halfAmount = numAmount / 2;
  const sign       = isExpense ? -1 : 1;

  const payer   = members.find(m => m.id === memberId);
  const partner = members.find(m => m.id === shareWithId);
  const splitReady = shared && shareWithId && numAmount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description || !memberId || !categoryId) {
      setError("Preencha todos os campos obrigatórios."); return;
    }
    setError(""); setLoading(true);
    try {
      if (isEditing) {
        // Editar transação existente (PATCH)
        await DB.updateTransaction(editTx.id, {
          description, amount: sign * Math.abs(numAmount),
          categoryId, date, method,
          isRecurring: recurring,
          installmentCurrent: installments > 1 ? parseInt(editTx.installment_current ?? 1) : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        });
      } else if (shared && shareWithId) {
        // Nova transação 50/50
        const half = sign * Math.abs(halfAmount);
        const base = {
          familyId, categoryId, description,
          amount: half, date, method,
          isShared: true, isRecurring: recurring,
          installmentCurrent: installments > 1 ? parseInt(editTx?.installment_current ?? 1) : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        };
        await Promise.all([
          DB.addTransaction({ ...base, memberId }),
          DB.addTransaction({ ...base, memberId: shareWithId }),
        ]);
      } else {
        // Nova transação simples
        await DB.addTransaction({
          familyId, memberId, categoryId, description,
          amount: sign * Math.abs(numAmount),
          date, method,
          isShared: false, isRecurring: recurring,
          installmentCurrent: installments > 1 ? parseInt(editTx?.installment_current ?? 1) : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar.");
    } finally { setLoading(false); }
  };

  const headerLabel = isEditing ? "Editando transação"
    : isConfirm ? "Confirmar recorrente"
    : splitReady ? (
      <>Gastaram{" "}
        <em style={{ fontStyle: "normal", color: "var(--auriz-gold-deep)" }}>R$ {numAmount.toLocaleString("pt-BR")}</em>
        {" "}— <em style={{ fontStyle: "normal", color: "var(--auriz-gold-deep)" }}>R$ {halfAmount.toLocaleString("pt-BR")}</em> cada
      </>
    ) : amount ? (
      <>Você {isExpense ? "gastou" : "recebeu"}{" "}
        <em style={{ fontStyle: "normal", color: "var(--auriz-gold-deep)" }}>R$ {amount}</em>
      </>
    ) : "Quanto foi?";

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

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            {!isEditing && !isConfirm && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {["Despesa","Renda"].map(t => (
                  <button key={t} type="button"
                    onClick={() => setIsExpense(t === "Despesa")}
                    style={{
                      padding: "4px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                      background: (t === "Despesa") === isExpense ? "var(--ink)" : "transparent",
                      color: (t === "Despesa") === isExpense ? "var(--paper)" : "var(--ink-2)",
                      border: `1px solid ${(t === "Despesa") === isExpense ? "var(--ink)" : "var(--hairline)"}`,
                      fontFamily: "var(--font-sans)", transition: "all var(--dur-base) var(--ease-out)",
                    }}>{t}</button>
                ))}
              </div>
            )}
            {(isEditing || isConfirm) && (
              <div style={{ marginBottom: 8 }}>
                <span className="a-overline" style={{ color: isConfirm ? "var(--auriz-gold-deep)" : "var(--ink-2)" }}>
                  {isEditing ? "Editar" : "Confirmar recorrente"}
                </span>
              </div>
            )}
            <h2 className="a-h2" style={{ margin: 0, fontSize: 26 }}>{headerLabel}</h2>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 36, height: 36, background: "var(--paper-deep)", border: "none",
            borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", color: "var(--ink-2)" }}>
            <Icon.X size={16} />
          </button>
        </div>

        {/* Membro — não editável se editando (transação já pertence a alguém) */}
        <div style={{ marginBottom: 20 }}>
          <div className="a-overline" style={{ marginBottom: 8 }}>De quem é</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {members.map(m => (
              <button key={m.id} type="button"
                disabled={isEditing}
                onClick={() => { if (!isEditing) { setMemberId(m.id); if (shareWithId === m.id) setShareWithId(""); }}}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "6px 14px 6px 6px",
                  borderRadius: 999, cursor: isEditing ? "default" : "pointer", fontSize: 13.5, fontWeight: 500,
                  background: memberId === m.id ? "var(--ink)" : "#fff",
                  color: memberId === m.id ? "var(--paper)" : "var(--ink)",
                  border: `1px solid ${memberId === m.id ? "var(--ink)" : "var(--hairline)"}`,
                  fontFamily: "var(--font-sans)", transition: "all var(--dur-base) var(--ease-out)",
                  opacity: isEditing && memberId !== m.id ? 0.4 : 1,
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
              placeholder="0" inputMode="decimal"
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
            options={categories.filter(c => !!c.is_income === !isExpense).map(c => ({ value: c.id, label: c.name }))} />
        </div>

        {/* Data + Método + Parcelas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
          <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Select label="Pagamento" value={method} onChange={e => setMethod(e.target.value)}
            options={[{value:"PIX",label:"PIX"},{value:"Cartão",label:"Cartão"},{value:"Dinheiro",label:"Dinheiro"}]} />
          <Input label="Parcelas" type="number" min="1" max="60" value={installments}
            onChange={e => setInstallments(e.target.value)} suffix={installments > 1 ? `×${installments}` : ""} />
        </div>

        {/* Toggles — não mostrar divisão ao editar */}
        {!isEditing && (
          <div style={{ display: "flex", gap: 10, marginBottom: shared ? 14 : 22 }}>
            <ToggleRow
              label="Dividir com a família"
              sub="Cria uma transação por pessoa (50% / 50%)."
              on={shared}
              onChange={() => { setShared(s => !s); setShareWithId(""); }}
            />
            <ToggleRow label="Recorrente" sub="Repete todo mês." on={recurring} onChange={() => setRecurring(!recurring)} />
          </div>
        )}
        {isEditing && (
          <div style={{ marginBottom: 22 }}>
            <ToggleRow label="Recorrente" sub="Repete todo mês." on={recurring} onChange={() => setRecurring(!recurring)} />
          </div>
        )}

        {/* Seletor de com quem dividir */}
        {!isEditing && shared && (
          <div style={{ marginBottom: 22, padding: "14px 16px", background: "var(--surface)",
            border: "1px solid var(--hairline-soft)", borderRadius: "var(--r-2)" }}>
            <div className="a-overline" style={{ marginBottom: 10 }}>Dividir com</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {members.filter(m => m.id !== memberId).map(m => (
                <button key={m.id} type="button" onClick={() => setShareWithId(id => id === m.id ? "" : m.id)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 6px",
                  borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: 500,
                  background: shareWithId === m.id ? "var(--auriz-gold)" : "#fff",
                  color: shareWithId === m.id ? "#fff" : "var(--ink)",
                  border: `1px solid ${shareWithId === m.id ? "var(--auriz-gold)" : "var(--hairline)"}`,
                  fontFamily: "var(--font-sans)", transition: "all var(--dur-base) var(--ease-out)",
                }}>
                  <Avatar name={m.name} color={m.color} size={26} />
                  {m.name.split(" ")[0]}
                </button>
              ))}
            </div>

            {splitReady && (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[payer, partner].map(m => (
                  <div key={m.id} style={{ padding: "10px 14px", background: "#fff",
                    borderRadius: "var(--r-1)", border: "1px solid var(--hairline-soft)",
                    display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={m.name} color={m.color} size={26} />
                    <div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{m.name.split(" ")[0]}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600,
                        color: "var(--terra)" }}>
                        −R$ {halfAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <div style={{ fontSize: 13, color: "var(--terracotta)", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 6 }}>
          <Icon.AlertCircle size={14} /> {error}
        </div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={15} /> : null}>
            {loading ? "Salvando…"
              : isEditing ? "Salvar alterações"
              : isConfirm ? "Registrar recorrente +"
              : splitReady ? "Registrar 2 transações"
              : "Registrar transação +"}
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
