/* eslint-disable */
const _GlobalStyles = () => (
  <style>{`
    @keyframes auriz-fade  { from{opacity:0} to{opacity:1} }
    @keyframes auriz-slide { from{transform:translateY(40px);opacity:0} to{transform:none;opacity:1} }
    @keyframes auriz-spin  { to{transform:rotate(360deg)} }
    @keyframes auriz-in-up { from{transform:translateY(12px);opacity:0} to{transform:none;opacity:1} }
  `}</style>
);

const Spinner = ({ size = 28, style = {} }) => (
  <div style={{ width:size, height:size, borderRadius:'50%',
    border:'2px solid var(--hairline)', borderTopColor:'var(--auriz-gold)',
    animation:'auriz-spin 0.75s linear infinite', ...style }} />
);

const LoadingPane = ({ label = 'Carregando…' }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', gap:14, padding:'64px 0' }}>
    <Spinner size={32}/>
    <span style={{ fontSize:13, color:'var(--ink-3)', fontFamily:'var(--font-display)' }}>{label}</span>
  </div>
);

const EmptyState = ({ icon='Inbox', title, description, action }) => {
  const IconEl = window.Icon?.[icon] ?? window.Icon?.Wallet;
  return (
    <div style={{ textAlign:'center', padding:'56px 32px', display:'flex',
      flexDirection:'column', alignItems:'center', gap:10 }}>
      {IconEl && (
        <div style={{ width:52, height:52, borderRadius:999,
          background:'var(--auriz-gold-soft)', color:'var(--auriz-gold-deep)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <IconEl size={22}/>
        </div>
      )}
      <div style={{ fontSize:16, fontWeight:500, color:'var(--ink)', marginTop:4 }}>{title}</div>
      {description && <div style={{ fontSize:13.5, color:'var(--ink-3)',
        fontFamily:'var(--font-display)', maxWidth:340, lineHeight:1.5 }}>{description}</div>}
      {action && <div style={{ marginTop:8 }}>{action}</div>}
    </div>
  );
};

const Modal = ({ open, onClose, title, width=480, children }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200,
      background:'rgba(37,32,26,0.45)', backdropFilter:'blur(2px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:24, animation:'auriz-fade 200ms var(--ease-out)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:width,
        background:'var(--paper)', borderRadius:'var(--r-4)', boxShadow:'var(--shadow-3)',
        animation:'auriz-in-up 220ms var(--ease-out)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'20px 24px', borderBottom:'1px solid var(--hairline-soft)' }}>
          <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:20, fontWeight:400 }}>{title}</h3>
          <button onClick={onClose} style={{ width:32, height:32, background:'var(--paper-deep)',
            border:'none', borderRadius:999, cursor:'pointer', color:'var(--ink-2)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon.X size={15}/>
          </button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
};

const Toast = ({ message, tone='ok', onDismiss }) => {
  const tones = { ok:{bg:'var(--ink)',fg:'var(--paper)'}, error:{bg:'var(--terracotta)',fg:'#fff'}, warn:{bg:'oklch(0.45 0.12 65)',fg:'#fff'} };
  const t = tones[tone] ?? tones.ok;
  React.useEffect(() => { const id=setTimeout(onDismiss,3500); return ()=>clearTimeout(id); }, [message]);
  if (!message) return null;
  return (
    <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
      zIndex:999, background:t.bg, color:t.fg, padding:'11px 20px',
      borderRadius:'var(--r-pill)', fontSize:13.5, fontWeight:500,
      boxShadow:'var(--shadow-3)', animation:'auriz-in-up 220ms var(--ease-out)',
      display:'flex', alignItems:'center', gap:10, whiteSpace:'nowrap' }}>
      {message}
      <button onClick={onDismiss} style={{ background:'transparent', border:'none',
        cursor:'pointer', color:'inherit', opacity:0.6, padding:0, display:'flex' }}>
        <Icon.X size={14}/>
      </button>
    </div>
  );
};

const useToast = () => {
  const [toast, setToast] = React.useState(null);
  const show = (message, tone='ok') => setToast({ message, tone });
  const hide = () => setToast(null);
  const el = toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={hide}/> : null;
  return { show, el };
};

const Select = ({ label, value, onChange, options, style={}, ...rest }) => (
  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
    {label && <span className="a-overline">{label}</span>}
    <div style={{ position:'relative' }}>
      <select value={value} onChange={onChange} style={{ width:'100%', appearance:'none',
        border:'1px solid var(--hairline)', borderRadius:'var(--r-2)',
        padding:'10px 36px 10px 12px', background:'#fff',
        fontFamily:'var(--font-sans)', fontSize:14, color:'var(--ink)',
        cursor:'pointer', outline:'none', ...style }} {...rest}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
        pointerEvents:'none', color:'var(--ink-3)' }}>
        <Icon.ChevronDown size={15}/>
      </div>
    </div>
  </label>
);

const Button = ({ variant='primary', size='md', leading, trailing, children, ...rest }) => {
  const base = { display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer',
    fontFamily:'var(--font-sans)', fontWeight:500, lineHeight:1, letterSpacing:'0.005em',
    border:'1px solid transparent', borderRadius:'var(--r-2)',
    transition:'all var(--dur-base) var(--ease-out)', whiteSpace:'nowrap' };
  const sizes = { sm:{padding:'6px 12px',fontSize:13}, md:{padding:'10px 18px',fontSize:14}, lg:{padding:'13px 22px',fontSize:15} };
  const variants = {
    primary:     { background:'var(--auriz-gold)', color:'#2A1F12', boxShadow:'var(--shadow-1)' },
    ghost:       { background:'transparent', color:'var(--ink)', borderColor:'var(--hairline)' },
    ink:         { background:'var(--ink)', color:'var(--paper)' },
    quiet:       { background:'transparent', color:'var(--ink-2)' },
    destructive: { background:'transparent', color:'var(--terracotta)', borderColor:'var(--hairline)' },
  };
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant] }}
      onMouseEnter={e => {
        if (variant==='primary')    { e.currentTarget.style.background='var(--auriz-gold-deep)'; e.currentTarget.style.color='var(--paper)'; }
        if (variant==='ghost')        e.currentTarget.style.background='var(--paper-deep)';
        if (variant==='ink')          e.currentTarget.style.background='#14110D';
        if (variant==='quiet')       { e.currentTarget.style.background='var(--paper-deep)'; e.currentTarget.style.color='var(--ink)'; }
        if (variant==='destructive') { e.currentTarget.style.background='var(--terracotta-soft)'; e.currentTarget.style.borderColor='var(--terracotta)'; }
      }}
      onMouseLeave={e => Object.assign(e.currentTarget.style, base, sizes[size], variants[variant])}
      {...rest}>
      {leading}{children}{trailing}
    </button>
  );
};

const Card = ({ tone='surface', padded=true, raised=false, children, style, ...rest }) => {
  const tones = {
    surface: { background:'var(--surface)' }, paper: { background:'var(--paper)' },
    raised:  { background:'#fff' }, gold: { background:'var(--auriz-gold-soft)', borderColor:'var(--auriz-gold)' },
    ink:     { background:'var(--ink)', color:'var(--paper)' },
  };
  return (
    <div style={{ border:'1px solid var(--hairline)', borderRadius:'var(--r-3)',
      padding:padded?22:0, boxShadow:raised?'var(--shadow-2)':'var(--shadow-1)',
      ...tones[tone], ...style }} {...rest}>{children}</div>
  );
};

const Input = ({ label, prefix, suffix, error, hint, value, onChange, ...rest }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {label && <span className="a-overline">{label}</span>}
      <div style={{ display:'flex', alignItems:'center', background:'#fff',
        border:`1px solid ${error?'var(--terracotta)':focused?'var(--auriz-gold)':'var(--hairline)'}`,
        borderRadius:'var(--r-2)', padding:'0 12px',
        boxShadow:focused?'0 0 0 3px var(--auriz-gold-soft)':'none',
        transition:'all var(--dur-base) var(--ease-out)' }}>
        {prefix && <span style={{ fontFamily:'var(--font-display)', color:'var(--ink-3)', marginRight:6, fontSize:14 }}>{prefix}</span>}
        <input value={value} onChange={onChange}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ border:'none', outline:'none', background:'transparent',
            padding:'11px 0', flex:1, font:'inherit', fontSize:14, color:'var(--ink)',
            fontFamily:rest.type==='number'?'var(--font-mono)':'var(--font-sans)' }}
          {...rest}/>
        {suffix && <span style={{ fontSize:12, color:'var(--ink-3)', marginLeft:6 }}>{suffix}</span>}
      </div>
      {(error||hint) && <span style={{ fontSize:12, color:error?'var(--terracotta)':'var(--ink-3)' }}>{error||hint}</span>}
    </label>
  );
};

const Avatar = ({ name, color='gold', size=36 }) => {
  const palette = {
    gold: {bg:'var(--auriz-gold-soft)', fg:'var(--auriz-gold-deep)'},
    sage: {bg:'var(--sage-soft)',       fg:'var(--sage)'},
    terra:{bg:'var(--terracotta-soft)',fg:'var(--terracotta)'},
    plum: {bg:'var(--plum-soft)',       fg:'var(--plum)'},
    teal: {bg:'var(--teal-soft)',       fg:'var(--teal)'},
    ink:  {bg:'var(--ink)',             fg:'var(--paper)'},
  };
  const c = palette[color] ?? palette.gold;
  return (
    <div style={{ width:size, height:size, borderRadius:999, background:c.bg, color:c.fg,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-display)', fontSize:size*0.48, flexShrink:0, lineHeight:1 }}>
      {(name??'?').charAt(0).toUpperCase()}
    </div>
  );
};

const CATEGORY_MAP = {
  Aluguel:{icon:'Home',color:'terra'}, Mercado:{icon:'ShoppingCart',color:'sage'},
  Academia:{icon:'Dumbbell',color:'teal'}, Lazer:{icon:'Sparkles',color:'plum'},
  Roupas:{icon:'Shirt',color:'amber'}, 'Saúde':{icon:'HeartPulse',color:'terra'},
  Transporte:{icon:'Car',color:'teal'}, Assinaturas:{icon:'Monitor',color:'plum'},
  Investimento:{icon:'TrendingUp',color:'sage'}, Outros:{icon:'Wallet',color:'neutral'},
  'Salário':{icon:'TrendingUp',color:'sage'}, Reserva:{icon:'PiggyBank',color:'teal'},
  Viagem:{icon:'Send',color:'plum'}, 'Veículo':{icon:'Car',color:'teal'},
};

const CategoryChip = ({ name, icon, color, size=36 }) => {
  const palette = {
    sage:{bg:'var(--sage-soft)',fg:'var(--sage)'}, terra:{bg:'var(--terracotta-soft)',fg:'var(--terracotta)'},
    teal:{bg:'var(--teal-soft)',fg:'var(--teal)'}, plum:{bg:'var(--plum-soft)',fg:'var(--plum)'},
    amber:{bg:'var(--amber-soft)',fg:'oklch(0.45 0.12 65)'}, neutral:{bg:'var(--paper-deep)',fg:'var(--ink-2)'},
  };
  const meta  = CATEGORY_MAP[name] ?? CATEGORY_MAP.Outros;
  const c     = palette[color??meta.color] ?? palette.neutral;
  const iName = icon ?? meta.icon;
  const IconEl = window.Icon?.[iName] ?? window.Icon?.Wallet;
  return (
    <div style={{ width:size, height:size, borderRadius:'var(--r-2)', background:c.bg, color:c.fg,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {IconEl && <IconEl size={size*0.5}/>}
    </div>
  );
};

const Badge = ({ tone='neutral', children, dot }) => {
  const tones = {
    sage:{bg:'var(--sage-soft)',fg:'var(--sage)'}, terra:{bg:'var(--terracotta-soft)',fg:'var(--terracotta)'},
    teal:{bg:'var(--teal-soft)',fg:'var(--teal)'}, plum:{bg:'var(--plum-soft)',fg:'var(--plum)'},
    amber:{bg:'var(--amber-soft)',fg:'oklch(0.45 0.12 65)'}, neutral:{bg:'var(--paper-deep)',fg:'var(--ink-2)'},
    ink:{bg:'var(--ink)',fg:'var(--paper)'},
  };
  const t = tones[tone] ?? tones.neutral;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6,
      padding:'3px 10px', borderRadius:999, fontSize:12, fontWeight:500,
      lineHeight:1.4, background:t.bg, color:t.fg }}>
      {dot && <span style={{ width:6, height:6, background:'currentColor', borderRadius:999 }}/>}
      {children}
    </span>
  );
};

const ProgressBar = ({ pct, tone='ok' }) => {
  const tones = { ok:'var(--sage)', warn:'var(--amber)', over:'var(--terracotta)', goal:'var(--plum)', gold:'var(--auriz-gold)' };
  return (
    <div style={{ height:6, background:'var(--hairline-soft)', borderRadius:999, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(100,pct)}%`,
        background:tones[tone]??tones.ok, borderRadius:999,
        transition:'width var(--dur-slow) var(--ease-out)' }}/>
    </div>
  );
};

const SectionHeader = ({ title, caption, action }) => (
  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14 }}>
    <div>
      <h2 className="a-h2" style={{ margin:0, fontSize:26 }}>{title}</h2>
      {caption && <div style={{ fontSize:13, color:'var(--ink-3)', fontFamily:'var(--font-display)', marginTop:2 }}>{caption}</div>}
    </div>
    {action}
  </div>
);

const Money = ({ value, size='md', tone='ink', showSign=false }) => {
  const sizes = { sm:{num:18,cur:11,cents:12}, md:{num:28,cur:14,cents:16}, lg:{num:44,cur:18,cents:24}, xl:{num:72,cur:22,cents:32} };
  const s = sizes[size] ?? sizes.md;
  const tones = { ink:'var(--ink)', sage:'var(--sage)', terra:'var(--terracotta)', gold:'var(--auriz-gold-deep)' };
  const absVal = Math.abs(value??0);
  const reais  = Math.floor(absVal);
  const cents  = Math.round((absVal-reais)*100).toString().padStart(2,'0');
  const sign   = value<0 ? '−' : showSign ? '+' : '';
  return (
    <span style={{ fontFamily:'var(--font-display)', fontVariantNumeric:'tabular-nums lining-nums',
      letterSpacing:'-0.045em', lineHeight:1, color:tones[tone]??tones.ink, fontSize:s.num, whiteSpace:'nowrap' }}>
      {sign}<span style={{ fontSize:s.cur, opacity:0.7, marginRight:4 }}>R$</span>
      {reais.toLocaleString('pt-BR')}<span style={{ fontSize:s.cents, opacity:0.7 }}>,{cents}</span>
    </span>
  );
};

const MoneyMono = ({ value, tone='ink' }) => {
  const tones = { ink:'var(--ink)', sage:'var(--sage)', terra:'var(--terracotta)' };
  const absVal = Math.abs(value??0);
  const sign   = value<0 ? '−' : '+';
  return (
    <span style={{ fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums',
      fontSize:14, fontWeight:500, color:tones[tone]??tones.ink, whiteSpace:'nowrap' }}>
      {sign}R$ {absVal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
    </span>
  );
};

const Logo = ({ height=28 }) => (
  <span style={{ fontFamily:'var(--font-display)', fontSize:height*1.1, fontWeight:600,
    letterSpacing:'-0.04em', color:'var(--ink)', lineHeight:1, display:'block' }}>
    auriz
  </span>
);

Object.assign(window, {
  _GlobalStyles, Spinner, LoadingPane, EmptyState, Modal, Toast, useToast,
  Select, Button, Card, Input, Avatar, CategoryChip, Badge,
  ProgressBar, SectionHeader, Money, MoneyMono, Logo, CATEGORY_MAP,
});
