/* eslint-disable */
// Auriz — Importar transações via planilha Excel (.xlsx / .xlsm)

const ImportSheet = ({ open, onClose, familyId, members, categories, onImported }) => {
  const [step, setStep]         = React.useState("upload");   // upload | preview | importing | done
  const [rows, setRows]         = React.useState([]);
  const [progress, setProgress] = React.useState(0);
  const [summary, setSummary]   = React.useState(null);       // { done, errors }
  const [dragging, setDragging] = React.useState(false);
  const { show: showToast, el: toastEl } = useToast();
  const inputRef = React.useRef(null);

  // Fecha e reseta estado
  const handleClose = () => {
    setStep("upload"); setRows([]); setProgress(0); setSummary(null);
    onClose();
  };

  if (!open) return null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const excelDateToISO = (serial) => {
    if (!serial || typeof serial !== "number" || serial < 1) return null;
    // 25569 = dias entre epoch do Excel (30 dez 1899) e Unix epoch (1 jan 1970)
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const d  = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  };

  const matchMember = (nameRaw) => {
    if (!nameRaw) return null;
    const n = nameRaw.trim().toLowerCase();
    return members.find(m =>
      m.name.toLowerCase().startsWith(n) ||
      n.startsWith(m.name.toLowerCase().split(" ")[0])
    ) ?? null;
  };

  const matchCategory = (nameRaw) => {
    if (!nameRaw) return null;
    const n = nameRaw.trim().toLowerCase();
    return (
      categories.find(c => c.name.toLowerCase() === n) ??
      categories.find(c => c.name.toLowerCase().includes(n)) ??
      categories.find(c => n.includes(c.name.toLowerCase())) ??
      null
    );
  };

  const normalizeMethod = (raw) => {
    if (!raw) return "PIX";
    const r = raw.toLowerCase();
    if (r.includes("pix"))    return "PIX";
    if (r.includes("crédito") || r.includes("credito") || r.includes("cartão") || r.includes("cartao")) return "Cartão de Crédito";
    if (r.includes("débito")  || r.includes("debito"))  return "Cartão de Débito";
    if (r.includes("dinheiro"))                          return "Dinheiro";
    return raw.trim();
  };

  // ── Parser ───────────────────────────────────────────────────────────────

  const parseWorkbook = (file) => {
    if (typeof XLSX === "undefined") {
      showToast("Biblioteca XLSX ainda carregando. Tente novamente.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });

        // Aceita aba "Transações" ou primeira aba
        const sheetName = wb.SheetNames.find(n =>
          n.toLowerCase().includes("transa") || n.toLowerCase().includes("lançamento")
        ) ?? wb.SheetNames[0];

        const ws   = wb.Sheets[sheetName];
        const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        // Linha 1 = título, Linha 2 = cabeçalho, Linha 3+ = dados
        const dataRows = raw.slice(2);
        const parsed   = [];

        for (const row of dataRows) {
          const dateSerial  = row[0];
          const description = row[1] != null ? String(row[1]).trim() : "";
          const catName     = row[2] != null ? String(row[2]).trim() : "";
          const amountRaw   = row[3];
          const memberName  = row[4] != null ? String(row[4]).trim() : "";
          const methodRaw   = row[5] != null ? String(row[5]).trim() : "";
          const forma       = row[6] != null ? String(row[6]).trim() : "";
          const parcelas    = row[7];

          // Ignora linhas vazias
          if (!amountRaw && !dateSerial) continue;
          const amount = parseFloat(amountRaw);
          if (!amount || isNaN(amount) || amount === 0) continue;

          const isoDate = excelDateToISO(dateSerial);
          if (!isoDate) continue;

          const member   = matchMember(memberName);
          const category = matchCategory(catName);
          const isRecurring = forma.toLowerCase().includes("recorr");
          const installmentTotal = parcelas > 1 ? parseInt(parcelas) : null;

          parsed.push({
            date:            isoDate,
            description:     description || "(sem descrição)",
            catName,
            categoryId:      category?.id  ?? null,
            categoryLabel:   (category?.name ?? catName) || "—",
            catOk:           !!category,
            memberName,
            memberId:        member?.id   ?? null,
            memberLabel:     (member?.name ?? memberName) || "—",
            memberOk:        !!member,
            amount:          -Math.abs(amount),  // sempre despesa
            method:          normalizeMethod(methodRaw),
            isRecurring,
            installmentTotal,
            valid:           !!isoDate && !!member && !!amount,
          });
        }

        setRows(parsed);
        setStep("preview");
      } catch (err) {
        showToast("Erro ao ler o arquivo. Verifique se é um .xlsx válido.", "error");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xlsm|xls)$/i)) {
      showToast("Envie um arquivo .xlsx ou .xlsm.", "error"); return;
    }
    parseWorkbook(file);
  };

  // ── Importação ───────────────────────────────────────────────────────────

  const handleImport = async () => {
    const valid = rows.filter(r => r.valid);
    if (valid.length === 0) return;
    setStep("importing");
    setProgress(0);
    let done = 0, errors = 0;

    for (const row of valid) {
      try {
        await DB.addTransaction({
          familyId,
          memberId:           row.memberId,
          categoryId:         row.categoryId,
          description:        row.description,
          amount:             row.amount,
          date:               row.date,
          method:             row.method,
          isRecurring:        row.isRecurring,
          installmentTotal:   row.installmentTotal,
          installmentCurrent: row.installmentTotal ? 1 : null,
        });
        done++;
      } catch {
        errors++;
      }
      setProgress(Math.round((done + errors) / valid.length * 100));
    }

    setSummary({ done, errors });
    setStep("done");
    onImported?.();
  };

  // ── Estilo helpers ────────────────────────────────────────────────────────

  const S = {
    overlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1200, padding: 24,
    },
    box: {
      background: "var(--paper)", borderRadius: "var(--r-2)",
      boxShadow: "0 24px 64px rgba(0,0,0,.18)",
      width: "100%", maxWidth: 740,
      maxHeight: "90vh", display: "flex", flexDirection: "column",
      overflow: "hidden",
    },
    head: {
      padding: "20px 24px 16px",
      borderBottom: "1px solid var(--hairline)",
      display: "flex", alignItems: "center", gap: 12,
    },
    body: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    foot: {
      padding: "14px 24px",
      borderTop: "1px solid var(--hairline)",
      display: "flex", justifyContent: "flex-end", gap: 10,
    },
    dropzone: {
      border: `2px dashed ${dragging ? "var(--sage)" : "var(--hairline)"}`,
      borderRadius: "var(--r-2)",
      padding: "48px 24px",
      textAlign: "center",
      background: dragging ? "var(--sage-bg, #f0f7f4)" : "var(--surface)",
      cursor: "pointer",
      transition: "all var(--dur-base) var(--ease-out)",
    },
  };

  const validCount   = rows.filter(r => r.valid).length;
  const skippedCount = rows.length - validCount;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={S.box}>
        {toastEl}

        {/* Header */}
        <div style={S.head}>
          <Icon.Upload size={18} style={{ color: "var(--ink-2)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Importar transações</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              {step === "upload"    && 'Envie o arquivo Excel com a aba "Transações"'}
              {step === "preview"   && `${rows.length} linhas lidas · ${validCount} válidas · ${skippedCount} ignoradas`}
              {step === "importing" && `Importando… ${progress}%`}
              {step === "done"      && "Importação concluída"}
            </div>
          </div>
          <button onClick={handleClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-3)", padding: 4, display: "flex", borderRadius: "var(--r-1)"
          }}>
            <Icon.X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── STEP: upload ── */}
          {step === "upload" && (
            <div>
              <div
                style={S.dropzone}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setDragging(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                <Icon.FileSpreadsheet size={36} style={{ color: "var(--ink-3)", marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  Arraste o arquivo ou clique para selecionar
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  Aceita .xlsx e .xlsm · Aba "Transações" · Modelo padrão Auriz
                </div>
              </div>
              <input
                ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])}
              />

              {/* Guia das colunas */}
              <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--surface)",
                borderRadius: "var(--r-1)", border: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--ink-2)" }}>
                  Formato esperado da aba "Transações":
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "4px 12px", fontSize: 12, color: "var(--ink-3)" }}>
                  {[
                    ["A – Data",         "Data da transação"],
                    ["B – Descrição",    "Nome/descrição"],
                    ["C – Categoria",    "Nome da categoria (será mapeada)"],
                    ["D – Valor (R$)",   "Valor positivo → importado como despesa"],
                    ["E – Responsável",  "Nome do membro (ex: Rodrigo, Laryssa)"],
                    ["F – Meio Pgto",    "PIX, Cartão Rodrigo, etc."],
                    ["G – Forma Pgto",   "Recorrente, À Vista"],
                    ["H – Parcelas",     "Número de parcelas (opcional)"],
                  ].map(([col, desc]) => (
                    <React.Fragment key={col}>
                      <span style={{ fontWeight: 500, color: "var(--ink-2)" }}>{col}</span>
                      <span>{desc}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: preview ── */}
          {step === "preview" && (
            <div>
              {/* Badges de resumo */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: "#e6f4ed", color: "#1a7a4a" }}>
                  ✓ {validCount} prontas para importar
                </span>
                {skippedCount > 0 && (
                  <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: "#fff3e0", color: "#b45309" }}>
                    ⚠ {skippedCount} ignoradas (sem membro ou data)
                  </span>
                )}
              </div>

              {/* Tabela de preview */}
              <div style={{ border: "1px solid var(--hairline)", borderRadius: "var(--r-1)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 120px 90px",
                  gap: 12, padding: "8px 14px", background: "var(--surface)",
                  borderBottom: "1px solid var(--hairline)",
                  fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <span>Data</span>
                  <span>Descrição</span>
                  <span>Categoria</span>
                  <span>Membro</span>
                  <span style={{ textAlign: "right" }}>Valor</span>
                </div>

                {/* Rows — max 200 para performance */}
                <div style={{ maxHeight: 380, overflowY: "auto" }}>
                  {rows.slice(0, 200).map((row, i) => (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "90px 1fr 160px 120px 90px",
                      gap: 12, padding: "9px 14px",
                      borderTop: i === 0 ? "none" : "1px solid var(--hairline-soft)",
                      background: row.valid ? "var(--paper)" : "var(--surface)",
                      opacity: row.valid ? 1 : 0.55,
                      fontSize: 13,
                    }}>
                      <span style={{ color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 12 }}>
                        {row.date
                          ? new Date(row.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                          : "—"}
                      </span>
                      <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.description}
                      </span>
                      <span>
                        {row.catOk
                          ? <span style={{ color: "var(--ink-2)" }}>{row.categoryLabel}</span>
                          : <span style={{ color: "#b45309" }} title={`"${row.catName}" não encontrada`}>
                              ⚠ {row.categoryLabel}
                            </span>
                        }
                      </span>
                      <span>
                        {row.memberOk
                          ? <span style={{ color: "var(--ink-2)" }}>{row.memberLabel.split(" ")[0]}</span>
                          : <span style={{ color: "#dc2626" }} title={`"${row.memberName}" não encontrado`}>
                              ✕ {row.memberLabel}
                            </span>
                        }
                      </span>
                      <span style={{
                        textAlign: "right", fontFamily: "var(--font-display)",
                        color: "var(--terra, #b45309)", fontWeight: 600
                      }}>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(row.amount)}
                      </span>
                    </div>
                  ))}
                  {rows.length > 200 && (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--ink-3)", textAlign: "center",
                      borderTop: "1px solid var(--hairline-soft)" }}>
                      … e mais {rows.length - 200} linhas (todas serão importadas)
                    </div>
                  )}
                </div>
              </div>

              {validCount === 0 && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#fef2f2",
                  borderRadius: "var(--r-1)", color: "#dc2626", fontSize: 13 }}>
                  Nenhuma linha válida encontrada. Verifique se os membros da planilha
                  correspondem aos membros cadastrados no Auriz.
                </div>
              )}
            </div>
          )}

          {/* ── STEP: importing ── */}
          {step === "importing" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Spinner size={32} />
              <div style={{ marginTop: 16, fontSize: 15, fontWeight: 500 }}>
                Importando transações…
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-3)" }}>
                {progress}% concluído
              </div>
              {/* Barra de progresso */}
              <div style={{ marginTop: 16, height: 6, background: "var(--hairline)",
                borderRadius: 3, overflow: "hidden", maxWidth: 320, margin: "16px auto 0" }}>
                <div style={{
                  height: "100%", background: "var(--sage, #2d6a4f)",
                  width: `${progress}%`, transition: "width .3s ease",
                  borderRadius: 3,
                }} />
              </div>
            </div>
          )}

          {/* ── STEP: done ── */}
          {step === "done" && summary && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                {summary.errors === 0 ? "✅" : "⚠️"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {summary.errors === 0
                  ? `${summary.done} transações importadas!`
                  : `${summary.done} importadas · ${summary.errors} com erro`}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                {summary.errors === 0
                  ? "As transações já aparecem na lista de transações."
                  : "Algumas transações não puderam ser salvas. Verifique os dados e tente novamente."}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={S.foot}>
          {step === "upload" && (
            <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => { setStep("upload"); setRows([]); }}>
                ← Trocar arquivo
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={validCount === 0}
              >
                Importar {validCount} transaç{validCount === 1 ? "ão" : "ões"}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button variant="primary" onClick={handleClose}>Fechar</Button>
          )}
        </div>
      </div>
    </div>
  );
};

window.ImportSheet = ImportSheet;
