/* eslint-disable */
// Auriz — Gestão de Usuários & Acesso (Admin)

// ── Linha de membro com status de conta ────────────────────────
const MemberUserRow = ({ member, onToggleAdmin, onUnlink, loading }) => {
  const hasAccount = !!member.user_id;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:16,
      padding:'16px 20px',
      background:'var(--surface)',
      border:'1px solid var(--hairline)',
      borderRadius:'var(--r-3)',
    }}>
      <Avatar name={member.name} color={member.color} size={44}/>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
          <span style={{ fontWeight:500, fontSize:15, color:'var(--ink)' }}>{member.name}</span>

          {member.is_admin && (
            <span style={{
              fontSize:11, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase',
              color:'var(--auriz-gold-deep)', background:'var(--auriz-gold-soft)',
              border:'1px solid var(--auriz-gold)', padding:'2px 8px', borderRadius:999,
            }}>Admin</span>
          )}

          <span style={{
            fontSize:12, fontWeight:500,
            color: hasAccount ? '#1a6666' : 'var(--ink-3)',
            background: hasAccount ? '#e6f4f4' : 'var(--paper-deep)',
            padding:'2px 9px', borderRadius:999,
            border:`1px solid ${hasAccount ? '#2a9d8f' : 'var(--hairline)'}`,
          }}>
            {hasAccount ? '✓ Conta ativa' : 'Sem conta'}
          </span>
        </div>

        <div style={{ fontSize:12.5, color:'var(--ink-3)', fontFamily:'var(--font-display)' }}>
          {hasAccount
            ? `ID: ${member.user_id.slice(0,8)}…${member.user_id.slice(-4)}`
            : 'Nenhum acesso ao painel configurado'}
        </div>
      </div>

      {hasAccount && (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button
            onClick={() => onToggleAdmin(!member.is_admin)}
            disabled={loading}
            style={{
              padding:'7px 14px', fontSize:12.5, fontWeight:500,
              background: member.is_admin ? 'var(--terracotta-soft)' : 'var(--auriz-gold-soft)',
              color:       member.is_admin ? 'var(--terracotta)'      : 'var(--auriz-gold-deep)',
              border:'1px solid',
              borderColor: member.is_admin ? 'var(--terracotta)'      : 'var(--auriz-gold)',
              borderRadius:'var(--r-2)', cursor:'pointer',
              fontFamily:'var(--font-sans)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {member.is_admin ? 'Remover admin' : 'Tornar admin'}
          </button>

          <button
            onClick={onUnlink}
            disabled={loading}
            title="Desvincular conta"
            style={{
              padding:'7px 8px', display:'flex', alignItems:'center',
              background:'transparent', border:'1px solid var(--hairline)',
              color:'var(--ink-3)', borderRadius:'var(--r-2)', cursor:'pointer',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--terracotta-soft)';e.currentTarget.style.color='var(--terracotta)';e.currentTarget.style.borderColor='var(--terracotta)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--ink-3)';e.currentTarget.style.borderColor='var(--hairline)';}}
          >
            <Icon.UserX size={15}/>
          </button>
        </div>
      )}
    </div>
  );
};

// ── Modal: criar novo usuário ──────────────────────────────────
const CriarUsuarioModal = ({ membersUnlinked, onClose, onSaved, onError }) => {
  const [memberId, setMemberId] = React.useState(membersUnlinked[0]?.id ?? '');
  const [email,    setEmail]    = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isAdmin,  setIsAdmin]  = React.useState(false);
  const [loading,  setLoading]  = React.useState(false);
  const [error,    setError]    = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberId || !email || password.length < 6) {
      setError('Preencha todos os campos. Senha mínima: 6 caracteres.');
      return;
    }
    setError(''); setLoading(true);
    try {
      await DB.createUserAndLink(email.trim(), password, memberId, isAdmin);
      onSaved();
    } catch (err) {
      const msg = err.message ?? 'Erro ao criar usuário.';
      setError(msg); onError(msg);
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Criar novo usuário" open={true} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

        <div>
          <div className="a-overline" style={{ marginBottom:8 }}>Vincular ao membro</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {membersUnlinked.map(m => (
              <label key={m.id} style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                borderRadius:'var(--r-2)', border:'1px solid',
                borderColor: memberId===m.id ? 'var(--auriz-gold)' : 'var(--hairline)',
                background:  memberId===m.id ? 'var(--auriz-gold-soft)' : 'var(--surface)',
                cursor:'pointer', transition:'all var(--dur-base)',
              }}>
                <input type="radio" name="member" value={m.id}
                  checked={memberId===m.id} onChange={()=>setMemberId(m.id)}
                  style={{ accentColor:'var(--auriz-gold-deep)' }}/>
                <Avatar name={m.name} color={m.color} size={32}/>
                <span style={{ fontWeight:500, fontSize:14 }}>{m.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ height:1, background:'var(--hairline-soft)' }}/>

        <Input label="E-mail" type="email" value={email}
          onChange={e=>setEmail(e.target.value)} required placeholder="usuario@email.com"/>

        <Input label="Senha" type="password" value={password}
          onChange={e=>setPassword(e.target.value)} required placeholder="mínimo 6 caracteres"
          hint="O usuário poderá alterar depois nas configurações de conta."/>

        <label style={{
          display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:14,
          padding:'10px 14px', background:'var(--auriz-gold-soft)',
          borderRadius:'var(--r-2)', border:'1px solid var(--auriz-gold)',
        }}>
          <input type="checkbox" checked={isAdmin} onChange={e=>setIsAdmin(e.target.checked)}
            style={{ width:16, height:16, accentColor:'var(--auriz-gold-deep)' }}/>
          <Icon.ShieldCheck size={15} style={{ color:'var(--auriz-gold-deep)' }}/>
          <div>
            <div style={{ fontWeight:500, color:'var(--auriz-gold-deep)' }}>Conceder acesso de administrador</div>
            <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>Pode gerenciar membros, categorias e limites</div>
          </div>
        </label>

        {error && (
          <div style={{ fontSize:13, color:'var(--terracotta)', background:'var(--terracotta-soft)',
            padding:'10px 14px', borderRadius:'var(--r-2)', display:'flex', gap:8, alignItems:'flex-start' }}>
            <Icon.AlertCircle size={14} style={{ marginTop:1, flexShrink:0 }}/>{error}
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4 }}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={14}/> : <Icon.UserPlus size={14}/>}>
            {loading ? 'Criando…' : 'Criar usuário'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Tela principal ─────────────────────────────────────────────
const AdminUsuariosScreen = ({ familyId, members, onMembersChange }) => {
  const [showModal,  setShowModal]  = React.useState(false);
  const [rowLoading, setRowLoading] = React.useState(null);
  const toast = useToast();  // retorna { show, el }

  const membersUnlinked = members.filter(m => !m.user_id);
  const adminCount      = members.filter(m => m.is_admin).length;

  const handleToggleAdmin = async (member, isAdmin) => {
    setRowLoading(member.id);
    try {
      await DB.setAdminStatus(member.id, isAdmin);
      toast.show(isAdmin ? `${member.name} agora é administrador` : `${member.name} removido dos administradores`);
      onMembersChange();
    } catch (err) {
      toast.show(err.message ?? 'Erro ao atualizar permissão.', 'error');
    } finally { setRowLoading(null); }
  };

  const handleUnlink = async (member) => {
    if (!confirm(`Desvincular a conta de ${member.name}? O acesso ao painel será revogado.`)) return;
    setRowLoading(member.id);
    try {
      await DB.unlinkMember(member.id);
      toast.show(`Conta de ${member.name} desvinculada.`);
      onMembersChange();
    } catch (err) {
      toast.show(err.message ?? 'Erro ao desvincular.', 'error');
    } finally { setRowLoading(null); }
  };

  return (
    <div style={{ padding:'28px 32px', maxWidth:840 }}>

      {toast.el}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, gap:24 }}>
        <div>
          <span className="a-overline">Administração</span>
          <h2 className="a-h2" style={{ margin:'6px 0 8px', fontSize:28 }}>Usuários & Acesso</h2>
          <p style={{ color:'var(--ink-3)', fontSize:14, margin:0, lineHeight:1.55, maxWidth:500 }}>
            Controle quem tem acesso ao painel do Auriz. Cada membro pode ter uma conta com e-mail e senha próprios.
          </p>
        </div>
        {membersUnlinked.length > 0 && (
          <Button variant="primary" onClick={()=>setShowModal(true)} leading={<Icon.UserPlus size={15}/>}>
            Criar usuário
          </Button>
        )}
      </div>

      {/* Admin notice */}
      <div style={{
        display:'flex', gap:12, alignItems:'flex-start',
        background:'var(--auriz-gold-soft)', border:'1px solid var(--auriz-gold)',
        borderRadius:'var(--r-3)', padding:'14px 18px', marginBottom:28,
      }}>
        <span style={{ color:'var(--auriz-gold-deep)', flexShrink:0, marginTop:1 }}>
          <Icon.ShieldCheck size={17}/>
        </span>
        <div style={{ fontSize:13.5, color:'var(--auriz-gold-deep)', lineHeight:1.55 }}>
          <strong>Modo administrador ativo.</strong>{' '}
          Você tem controle total sobre os membros, categorias e limites de orçamento desta família.
          {adminCount > 1 && ` Há ${adminCount} administradores configurados.`}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'Total de membros',  value:members.length,                         icon:'Users'       },
          { label:'Com conta ativa',   value:members.filter(m=>m.user_id).length,    icon:'UserCheck'   },
          { label:'Administradores',   value:adminCount,                              icon:'ShieldCheck' },
        ].map(s => {
          const IconEl = Icon[s.icon];
          return (
            <div key={s.label} style={{ padding:'16px 20px', background:'var(--surface)', border:'1px solid var(--hairline)', borderRadius:'var(--r-3)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                {IconEl && <IconEl size={15} style={{ color:'var(--ink-3)' }}/>}
                <span className="a-caption" style={{ color:'var(--ink-3)' }}>{s.label}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:600, fontFamily:'var(--font-display)', color:'var(--ink)', lineHeight:1 }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div style={{ marginBottom:12 }}><SectionHeader title="Membros da família"/></div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {members.length === 0 && (
          <EmptyState icon="Users" title="Nenhum membro" description="Adicione membros na tela Membros primeiro."/>
        )}
        {members.map(m => (
          <MemberUserRow key={m.id} member={m} loading={rowLoading===m.id}
            onToggleAdmin={(v)=>handleToggleAdmin(m,v)}
            onUnlink={()=>handleUnlink(m)}/>
        ))}
      </div>

      {membersUnlinked.length===0 && members.length>0 && (
        <div style={{
          marginTop:20, padding:'14px 18px',
          background:'var(--paper-deep)', border:'1px solid var(--hairline-soft)',
          borderRadius:'var(--r-2)', fontSize:13.5, color:'var(--ink-3)',
          display:'flex', gap:10, alignItems:'center',
        }}>
          <Icon.CheckCircle size={15} style={{ color:'#2d6a4f', flexShrink:0 }}/>
          Todos os membros já têm contas configuradas.
        </div>
      )}

      {showModal && (
        <CriarUsuarioModal
          membersUnlinked={membersUnlinked}
          onClose={()=>setShowModal(false)}
          onSaved={()=>{ setShowModal(false); toast.show('Usuário criado com sucesso!'); onMembersChange(); }}
          onError={(msg)=>toast.show(msg, 'error')}
        />
      )}
    </div>
  );
};

window.AdminUsuariosScreen = AdminUsuariosScreen;
