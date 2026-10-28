/* eslint-disable */
// Auriz — Adicionar / Editar transação (flow em 4 passos para novos lançamentos)

const TX_TYPES = [
  { id: "despesa",    label: "Despesa",    emoji: "💸", sub: "Algo que saiu" },
  { id: "renda",      label: "Renda",      emoji: "💰", sub: "Algo que entrou" },
  { id: "parcela",    label: "Parcela",    emoji: "📅", sub: "Compra parcelada" },
  { id: "recorrente", label: "Recorrente", emoji: "🔄", sub: "Mensal, anual…" },
];

const useIsMobile = (max = 640) => {
  const q = `(max-width: ${max}px)`;
  const [m, setM] = React.useState(() => window.matchMedia(q).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [q]);
  return m;
};

const AddTransactionSheet = ({ open, onClose, familyId, members, categories, onSaved, editTx }) => {
  const isMobile = useIsMobile();
  const [step, setStep]             = React.useState(0);
  const [txType, setTxType]         = React.useState("despesa");
  const [memberId, setMemberId]     = React.useState(members[0]?.id ?? "");
  const [shareWithId, setShareWithId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount]         = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [date, setDate]             = React.useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod]         = React.useState("PIX");
  const [installments, setInstallments] = React.useState(1);
  const [shared, setShared]         = React.useState(false);
  const [recurring, setRecurring]   = React.useState(false);
  const [isExpense, setIsExpense]   = React.useState(true);
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState("");

  const isEditing = !!(editTx && !editTx.is_projected);
  const isConfirm = !!(editTx && editTx.is_projected);
  const useSteps  = !isEditing && !isConfirm;

  React.useEffect(() => {
    if (!open) return;
    if (editTx) {
      setMemberId(editTx.member_id ?? members[0]?.id ?? "");
      setDescription(editTx.description ?? "");
      setAmount(String(Math.abs(editTx.amount ?? 0)));
      setCategoryId(editTx.category_id ?? "");
      setDate(editTx.transaction_date ?? new Date().toISOString().slice(0, 10));
      setMethod(editTx.method ?? "PIX");
      setInstallments(editTx.installment_total ?? 1);
      setRecurring(!!editTx.is_recurring);
      setIsExpense((editTx.amount ?? -1) <= 0);
      setShared(false); setShareWithId("");
    } else {
      setStep(0); setTxType("despesa");
      setMemberId(members[0]?.id ?? "");
      setDescription(""); setAmount("");
      setCategoryId(categories.find(c => !c.is_income)?.id ?? "");
      setDate(new Date().toISOString().slice(0, 10));
      setMethod("PIX"); setInstallments(1);
      setRecurring(false); setIsExpense(true);
      setShared(false); setShareWithId("");
    }
    setError("");
  }, [open, editTx]);

  React.useEffect(() => { if (members[0]?.id && !memberId) setMemberId(members[0].id); }, [members]);
  React.useEffect(() => {
    const first = categories.find(c => !c.is_income);
    if (first && !categoryId) setCategoryId(first.id);
  }, [categories]);

  if (!open) return null;

  const numAmount  = parseFloat((amount || "0").replace(",", ".")) || 0;
  const halfAmount = numAmount / 2;
  const sign       = isExpense ? -1 : 1;
  const payer      = members.find(m => m.id === memberId);
  const partner    = members.find(m => m.id === shareWithId);
  const splitReady = shared && shareWithId && numAmount > 0;

  const handleTypeSelect = (type) => {
    setTxType(type);
    setIsExpense(type !== "renda");
    setRecurring(type === "recorrente");
    if (type === "parcela" && parseInt(installments) < 2) setInstallments(2);
    if (type !== "parcela") setInstallments(1);
    // auto-filtra categoria pelo novo isExpense
    const newIsExpense = type !== "renda";
    const first = categories.find(c => !!c.is_income === !newIsExpense);
    if (first) setCategoryId(first.id);
    setStep(1);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => { if (step === 0) onClose(); else setStep(s => s - 1); };

  const handleDelete = async () => {
    if (!confirm("Excluir esta transação?")) return;
    setLoading(true);
    try { await DB.softDeleteTransaction(editTx.id); onSaved?.(); onClose(); }
    catch { setError("Não foi possível excluir."); setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!amount || !description || !memberId || !categoryId) {
      setError("Preencha todos os campos obrigatórios."); return;
    }
    setError(""); setLoading(true);
    try {
      if (isEditing) {
        await DB.updateTransaction(editTx.id, {
          description, amount: sign * Math.abs(numAmount),
          categoryId, date, method,
          isRecurring: recurring,
          installmentCurrent: installments > 1 ? parseInt(editTx.installment_current ?? 1) : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        });
      } else if (shared && shareWithId) {
        const half = sign * Math.abs(halfAmount);
        const base = {
          familyId, categoryId, description,
          amount: half, date, method,
          isShared: true, isRecurring: recurring || installments > 1,
          installmentCurrent: installments > 1 ? 1 : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        };
        await Promise.all([
          DB.addTransaction({ ...base, memberId }),
          DB.addTransaction({ ...base, memberId: shareWithId }),
        ]);
      } else {
        await DB.addTransaction({
          familyId, memberId, categoryId, description,
          amount: sign * Math.abs(numAmount),
          date, method,
          isShared: false, isRecurring: recurring || installments > 1,
          installmentCurrent: installments > 1 ? 1 : null,
          installmentTotal:   installments > 1 ? parseInt(installments) : null,
        });
      }
      onSaved?.(); onClose();
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar.");
    } finally { setLoading(false); }
  };

  /* ── Shared style helpers ── */
  const sheetBody = {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(37,32,26,0.4)", backdropFilter: "blur(2px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "auriz-fade 220ms var(--ease-out)",
  };
  const formStyle = {
    background: "var(--paper)", width: "100%", maxWidth: isMobile ? "100%" : 640,
    borderRadius: "var(--r-4) var(--r-4) 0 0", boxShadow: "var(--shadow-3)",
    animation: "auriz-slide 280ms var(--ease-out)",
    maxHeight: isMobile ? "94dvh" : "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
  };

  /* ── EDIT / CONFIRM: forma tradicional (sem steps) ── */
  if (!useSteps) {
    const headerLabel = isEditing ? "Editando transação"
      : isConfirm ? "Confirmar recorrente"
      : amount ? `Você ${isExpense ? "gastou" : "recebeu"} R$ ${amount}` : "Quanto foi?";

    return (
      <div onClick={onClose} style={sheetBody}>
        <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} style={{ ...formStyle, padding: isMobile ? "20px 18px calc(20px + env(safe-area-inset-bottom, 0px))" : "28px 36px 32px", overflowY: "auto", overflowX: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ marginBottom: 8 }}>
                <span className="a-overline" style={{ color: isConfirm ? "var(--auriz-gold-deep)" : "var(--ink-2)" }}>
                  {isEditing ? "Editar" : "Confirmar recorrente"}
                </span>
              </div>
              <h2 className="a-h2" style={{ margin: 0, fontSize: 26 }}>{headerLabel}</h2>
            </div>
            <button type="button" onClick={onClose} style={{ width: 36, height: 36, background: "var(--paper-deep)", border: "none", borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)" }}>
              <Icon.X size={16} />
            </button>
          </div>

          <MemberRow members={members} memberId={memberId} onSelect={() => {}} disabled={isEditing} />
          <AmountRow amount={amount} onChange={e => setAmount(e.target.value)} />

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 14, marginBottom: 16 }}>
            <Input label="Descrição" placeholder="ex: Pão de Açúcar · Compras" value={description} onChange={e => setDescription(e.target.value)} required />
            <Select label="Categoria" value={categoryId} onChange={e => setCategoryId(e.target.value)}
              options={categories.filter(c => !!c.is_income === !isExpense).map(c => ({ value: c.id, label: c.name }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Select label="Pagamento" value={method} onChange={e => setMethod(e.target.value)}
              options={[{value:"PIX",label:"PIX"},{value:"Cartão",label:"Cartão"},{value:"Dinheiro",label:"Dinheiro"}]} />
            <Input label="Parcelas" type="number" min="1" max="60" value={installments} onChange={e => setInstallments(e.target.value)} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <ToggleRow label="Recorrente" sub="Repete todo mês." on={recurring} onChange={() => setRecurring(!recurring)} />
          </div>

          {error && <div style={{ fontSize: 13, color: "var(--terracotta)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><Icon.AlertCircle size={14} /> {error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {isEditing && (
              <button type="button" onClick={handleDelete} disabled={loading} style={{ marginRight: "auto", background: "transparent", border: "none", cursor: "pointer", color: "var(--terracotta)", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontFamily: "var(--font-sans)", padding: "6px 2px" }}>
                <Icon.Trash2 size={14} /> Excluir
              </button>
            )}
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={loading} trailing={loading ? <Spinner size={15} /> : null}>
              {loading ? "Salvando…" : isEditing ? "Salvar alterações" : "Registrar recorrente +"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  /* ── NOVO: flow em 4 passos ── */
  const STEP_TITLES = ["O que vamos registrar?", "Quanto foi?", "Qual categoria?", "Últimos detalhes"];
  const filteredCats = categories.filter(c => !!c.is_income === !isExpense);

  const canAdvance = () => {
    if (step === 1) return amount && parseFloat(amount) > 0 && memberId;
    if (step === 2) return !!categoryId;
    if (step === 3) return !!description;
    return true;
  };

  const handleNext = () => {
    if (step === 3) { handleSubmit(); return; }
    if (!canAdvance()) { setError("Preencha o campo antes de continuar."); return; }
    setError(""); nextStep();
  };

  return (
    <div onClick={onClose} style={sheetBody}>
      <div onClick={e => e.stopPropagation()} style={formStyle}>

        {/* Header com dots */}
        <div style={{ padding: isMobile ? "16px 16px 14px" : "22px 28px 18px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <button onClick={prevStep} style={{ width: 32, height: 32, borderRadius: "var(--r-2)", border: "1px solid var(--hairline)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)", fontSize: 16 }}>
            ‹
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px" }}>{STEP_TITLES[step]}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                height: 6, borderRadius: 3,
                width: i === step ? 18 : 6,
                background: i < step ? "var(--sage)" : i === step ? "var(--auriz-gold)" : "var(--hairline)",
                transition: "all .2s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Body scrollável */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: isMobile ? "20px 16px 8px" : "28px 28px 8px" }}>

          {/* Step 0: Tipo */}
          {step === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {TX_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => handleTypeSelect(t.id)} style={{
                  padding: "20px 18px", background: txType === t.id ? "var(--auriz-gold-soft)" : "var(--surface)",
                  border: `2px solid ${txType === t.id ? "var(--auriz-gold)" : "var(--hairline)"}`,
                  borderRadius: "var(--r-3)", cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--font-sans)", transition: "all .15s",
                }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{t.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{t.sub}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Valor + membro */}
          {step === 1 && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, background: "var(--surface)", border: `2px solid ${amount ? "var(--auriz-gold)" : "var(--hairline)"}`, borderRadius: "var(--r-3)", padding: "18px 22px", marginBottom: 22, transition: "border-color .15s", minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-3)" }}>R$</span>
                <input
                  autoFocus
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0" inputMode="decimal"
                  style={{ flex: 1, minWidth: 0, width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-display)", fontSize: isMobile ? 34 : 44, color: "var(--ink)", fontVariantNumeric: "tabular-nums lining-nums", letterSpacing: "-0.045em", padding: 0, lineHeight: 1 }}
                />
              </div>
              <div className="a-overline" style={{ marginBottom: 10 }}>De quem é</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {members.map(m => (
                  <button key={m.id} type="button" onClick={() => setMemberId(m.id)} style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "7px 14px 7px 7px",
                    borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: 500,
                    background: memberId === m.id ? "var(--ink)" : "var(--surface)",
                    color: memberId === m.id ? "var(--paper)" : "var(--ink)",
                    border: `1px solid ${memberId === m.id ? "var(--ink)" : "var(--hairline)"}`,
                    fontFamily: "var(--font-sans)", transition: "all .12s",
                  }}>
                    <Avatar name={m.name} color={m.color} size={26} />
                    {m.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Categoria em grid */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(4, 1fr)", gap: 10 }}>
              {filteredCats.map(c => (
                <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); nextStep(); }} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "14px 8px", borderRadius: "var(--r-3)",
                  border: `2px solid ${categoryId === c.id ? "var(--auriz-gold)" : "var(--hairline)"}`,
                  background: categoryId === c.id ? "var(--auriz-gold-soft)" : "var(--surface)",
                  cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all .12s",
                }}>
                  <CategoryChip name={c.name} icon={c.icon} color={c.color} size={32} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textAlign: "center", lineHeight: 1.2 }}>{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Descrição + data + método + opções */}
          {step === 3 && (
            <>
              <Input label="Descrição" placeholder="ex: Compras da semana no Extra…" value={description} onChange={e => setDescription(e.target.value)} required />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 16 }}>
                <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
                <Select label="Pagamento" value={method} onChange={e => setMethod(e.target.value)}
                  options={[{value:"PIX",label:"PIX"},{value:"Cartão",label:"Cartão"},{value:"Dinheiro",label:"Dinheiro"}]} />
              </div>
              {(txType === "parcela" || txType === "renda") && (
                <div style={{ marginTop: 14 }}>
                  <Input label={txType === "renda" ? "Parcelas a receber (1 = recebimento único)" : "Número de parcelas"} type="number" min={txType === "renda" ? "1" : "2"} max="60" value={installments} onChange={e => setInstallments(e.target.value)} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginTop: 18, marginBottom: 4 }}>
                {txType !== "recorrente" && (
                  <ToggleRow label="Dividir 50/50" sub="Uma tx por pessoa." on={shared} onChange={() => { setShared(s => !s); setShareWithId(""); }} />
                )}
                {txType !== "parcela" && !(txType === "renda" && parseInt(installments) > 1) && (
                  <ToggleRow label="Recorrente" sub="Repete todo mês." on={recurring} onChange={() => setRecurring(!recurring)} />
                )}
              </div>
              {shared && (
                <div style={{ marginTop: 12, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: "var(--r-2)" }}>
                  <div className="a-overline" style={{ marginBottom: 10 }}>Dividir com</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {members.filter(m => m.id !== memberId).map(m => (
                      <button key={m.id} type="button" onClick={() => setShareWithId(id => id === m.id ? "" : m.id)} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 6px",
                        borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: 500,
                        background: shareWithId === m.id ? "var(--auriz-gold)" : "var(--surface)",
                        color: shareWithId === m.id ? "#fff" : "var(--ink)",
                        border: `1px solid ${shareWithId === m.id ? "var(--auriz-gold)" : "var(--hairline)"}`,
                        fontFamily: "var(--font-sans)", transition: "all .12s",
                      }}>
                        <Avatar name={m.name} color={m.color} size={26} />
                        {m.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  {splitReady && (
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[payer, partner].map(m => m && (
                        <div key={m.id} style={{ padding: "10px 14px", background: "#fff", borderRadius: "var(--r-1)", border: "1px solid var(--hairline-soft)", display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={m.name} color={m.color} size={26} />
                          <div>
                            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{m.name.split(" ")[0]}</div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--terracotta)" }}>
                              −R$ {halfAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ fontSize: 13, color: "var(--terracotta)", marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon.AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer — oculto no step 0 (clique no card já avança) */}
        {step > 0 && (
          <div style={{ padding: isMobile ? "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))" : "16px 28px 24px", borderTop: "1px solid var(--hairline)", display: "flex", gap: 10, flexShrink: 0 }}>
            <Button variant="ghost" type="button" style={{ flex: 1 }} onClick={prevStep}>Voltar</Button>
            <Button variant="primary" type="button" style={{ flex: 2 }} disabled={loading} onClick={handleNext}
              trailing={loading ? <Spinner size={15} /> : null}>
              {loading ? "Salvando…"
                : step === 3
                  ? (splitReady ? "Registrar 2 transações +" : "Registrar transação +")
                  : step === 2 ? "Confirmar categoria →"
                  : "Continuar →"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/* Helpers internos */
const MemberRow = ({ members, memberId, onSelect, disabled }) => (
  <div style={{ marginBottom: 20 }}>
    <div className="a-overline" style={{ marginBottom: 8 }}>De quem é</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {members.map(m => (
        <button key={m.id} type="button" disabled={disabled} onClick={() => { if (!disabled) onSelect(m.id); }} style={{
          display: "flex", alignItems: "center", gap: 9, padding: "6px 14px 6px 6px",
          borderRadius: 999, cursor: disabled ? "default" : "pointer", fontSize: 13.5, fontWeight: 500,
          background: memberId === m.id ? "var(--ink)" : "#fff",
          color: memberId === m.id ? "var(--paper)" : "var(--ink)",
          border: `1px solid ${memberId === m.id ? "var(--ink)" : "var(--hairline)"}`,
          fontFamily: "var(--font-sans)", opacity: disabled && memberId !== m.id ? 0.4 : 1,
        }}>
          <Avatar name={m.name} color={m.color} size={26} />
          {m.name.split(" ")[0]}
        </button>
      ))}
    </div>
  </div>
);

const AmountRow = ({ amount, onChange }) => (
  <div style={{ marginBottom: 20 }}>
    <div className="a-overline" style={{ marginBottom: 8 }}>Valor total</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, background: "#fff", border: "1px solid var(--hairline)", borderRadius: "var(--r-3)", padding: "18px 22px" }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-3)" }}>R$</span>
      <input value={amount} onChange={onChange} placeholder="0" inputMode="decimal" style={{ flex: 1, minWidth: 0, width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-display)", fontSize: 44, color: "var(--ink)", fontVariantNumeric: "tabular-nums lining-nums", letterSpacing: "-0.045em", padding: 0, lineHeight: 1 }} />
    </div>
  </div>
);

const ToggleRow = ({ label, sub, on, onChange }) => (
  <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: "var(--r-2)", cursor: "pointer" }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>}
    </div>
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 999, background: on ? "var(--auriz-gold)" : "var(--hairline)", position: "relative", cursor: "pointer", flexShrink: 0, marginLeft: 10, transition: "background var(--dur-base) var(--ease-out)" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", boxShadow: "var(--shadow-1)", transition: "left var(--dur-base) var(--ease-out)" }} />
    </div>
  </label>
);

window.AddTransactionSheet = AddTransactionSheet;
