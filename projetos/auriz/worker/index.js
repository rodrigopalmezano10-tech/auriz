// Auriz — Cloudflare Worker API
// Bindings: DB (D1), JWT_SECRET (secret)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

// ── Crypto ─────────────────────────────────────────────────────────────────

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  return toHex(salt) + ':' + toHex(key);
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const key = await deriveKey(password, fromHex(saltHex));
  return toHex(key) === hashHex;
}

function b64url(buf) {
  return btoa(typeof buf === 'string' ? buf : String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromb64url(s) {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

async function signJWT(payload, secret) {
  const enc = new TextEncoder();
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify(payload));
  const data = h + '.' + p;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return data + '.' + b64url(sig);
}

async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = Uint8Array.from(fromb64url(s), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(h + '.' + p));
    if (!valid) return null;
    const payload = JSON.parse(fromb64url(p));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
function err(msg, status = 400) { return json({ error: msg }, status); }

function now() { return new Date().toISOString(); }
function genId() { return crypto.randomUUID(); }

// Gera como lançamentos reais as recorrentes e parcelas dos meses já chegados (até o mês pedido).
// Meses futuros continuam só como projeção. O INSERT com NOT EXISTS é atômico, então chamadas
// simultâneas não duplicam; linhas apagadas contam como existentes para não ressuscitar.
async function materializeRecurring(env, familyId, year, month) {
  const d = new Date();
  const curIdx = d.getUTCFullYear() * 12 + d.getUTCMonth();
  const targetIdx = year * 12 + (month - 1);
  if (targetIdx > curIdx) return;
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  const { results } = await env.DB.prepare(`
    SELECT * FROM transactions
    WHERE family_id = ? AND (is_recurring = 1 OR installment_total IS NOT NULL)
      AND transaction_date <= ?
    ORDER BY transaction_date DESC, created_at DESC
  `).bind(familyId, lastDay).all();

  const seen = new Set();
  const stmts = [];
  for (const t of results) {
    const sig = `${t.member_id}|${t.description}|${t.category_id}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    if (t.is_deleted) continue;
    const [sy, sm, sd] = t.transaction_date.split('-').map(Number);
    const srcIdx = sy * 12 + (sm - 1);
    for (let k = srcIdx + 1; k <= targetIdx; k++) {
      const steps = k - srcIdx;
      let curr = null;
      if (t.installment_total !== null) {
        curr = t.installment_current + steps;
        if (curr > t.installment_total) break;
      }
      const y = Math.floor(k / 12), m = (k % 12) + 1;
      const day = Math.min(sd, new Date(Date.UTC(y, m, 0)).getUTCDate());
      const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const from = `${y}-${String(m).padStart(2, '0')}-01`;
      const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      const ts = now();
      stmts.push(env.DB.prepare(`
        INSERT INTO transactions (id, family_id, member_id, category_id, description, amount,
          transaction_date, method, installment_current, installment_total,
          is_shared, is_recurring, notes, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM transactions
          WHERE family_id = ? AND member_id IS ? AND category_id IS ? AND description = ?
            AND transaction_date >= ? AND transaction_date <= ?
        )
      `).bind(genId(), t.family_id, t.member_id, t.category_id, t.description, t.amount,
        date, t.method, curr, t.installment_total, t.is_shared, t.is_recurring, t.notes, ts, ts,
        t.family_id, t.member_id, t.category_id, t.description, from, to));
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
}

async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return verifyJWT(token, env.JWT_SECRET);
}

// ── Main handler ───────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const q = url.searchParams;

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    // ── Public: auth ──────────────────────────────────────────────────────

    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json();
      if (!email || !password) return err('Campos obrigatórios.', 400);
      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
      if (!user) return err('Credenciais inválidas.', 401);
      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) return err('Credenciais inválidas.', 401);
      const token = await signJWT({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 * 30 }, env.JWT_SECRET);
      return json({ token, user: { id: user.id, email: user.email } });
    }

    if (path === '/auth/signup' && method === 'POST') {
      const { email, password } = await request.json();
      if (!email || !password) return err('Campos obrigatórios.', 400);
      const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (exists) return err('E-mail já cadastrado.', 409);
      const id = genId();
      const hash = await hashPassword(password);
      await env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').bind(id, email, hash, now()).run();
      const token = await signJWT({ sub: id, email, exp: Math.floor(Date.now() / 1000) + 86400 * 30 }, env.JWT_SECRET);
      return json({ token, user: { id, email } }, 201);
    }

    // ── Protected: verify token ───────────────────────────────────────────

    const payload = await requireAuth(request, env);
    if (!payload) return err('Não autorizado.', 401);
    const userId = payload.sub;

    // ── Family ────────────────────────────────────────────────────────────

    if (path === '/families/mine' && method === 'GET') {
      const row = await env.DB.prepare(`
        SELECT f.id, f.name, f.slug FROM members m
        JOIN families f ON f.id = m.family_id
        WHERE m.user_id = ? AND m.is_deleted = 0 LIMIT 1
      `).bind(userId).first();
      return json(row ?? null);
    }

    if (path === '/families' && method === 'POST') {
      const { name, memberName, color, income } = await request.json();
      const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const familyId = genId(); const memberId = genId(); const t = now();
      await env.DB.prepare('INSERT INTO families (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(familyId, name, slug, t, t).run();
      await env.DB.prepare('INSERT INTO members (id, family_id, user_id, name, color, monthly_income, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)').bind(memberId, familyId, userId, memberName, color, parseFloat(income) || 0, t, t).run();
      return json({ id: familyId, name, slug }, 201);
    }

    // ── Members ───────────────────────────────────────────────────────────

    if (path === '/members' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM members WHERE family_id = ? AND is_deleted = 0 ORDER BY created_at').bind(q.get('familyId')).all();
      return json(results);
    }

    if (path === '/members' && method === 'POST') {
      const { familyId, name, color, monthlyIncome } = await request.json();
      const id = genId(); const t = now();
      const row = await env.DB.prepare('INSERT INTO members (id, family_id, name, color, monthly_income, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *').bind(id, familyId, name, color, parseFloat(monthlyIncome) || 0, t, t).first();
      return json(row, 201);
    }

    const memberM = path.match(/^\/members\/([^/]+)$/);
    if (memberM) {
      const id = memberM[1];
      if (method === 'PATCH') {
        const body = await request.json();
        if (body.action === 'unlink') {
          await env.DB.prepare('UPDATE members SET user_id = NULL, is_admin = 0, updated_at = ? WHERE id = ?').bind(now(), id).run();
          return json({ ok: true });
        }
        if (body.action === 'link') {
          await env.DB.prepare('UPDATE members SET user_id = ?, is_admin = ?, updated_at = ? WHERE id = ?').bind(body.userId, body.isAdmin ? 1 : 0, now(), id).run();
          return json({ ok: true });
        }
        if ('isAdmin' in body) {
          await env.DB.prepare('UPDATE members SET is_admin = ?, updated_at = ? WHERE id = ?').bind(body.isAdmin ? 1 : 0, now(), id).run();
          return json({ ok: true });
        }
        const { name, color, monthlyIncome } = body;
        await env.DB.prepare('UPDATE members SET name = ?, color = ?, monthly_income = ?, updated_at = ? WHERE id = ?').bind(name, color, parseFloat(monthlyIncome) || 0, now(), id).run();
        return json({ ok: true });
      }
      if (method === 'DELETE') {
        await env.DB.prepare('UPDATE members SET is_deleted = 1, updated_at = ? WHERE id = ?').bind(now(), id).run();
        return json({ ok: true });
      }
    }

    if (path === '/admin/create-user' && method === 'POST') {
      const { email, password, memberId, isAdmin } = await request.json();
      const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (exists) return err('E-mail já cadastrado.', 409);
      const id = genId();
      await env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').bind(id, email, await hashPassword(password), now()).run();
      await env.DB.prepare('UPDATE members SET user_id = ?, is_admin = ?, updated_at = ? WHERE id = ?').bind(id, isAdmin ? 1 : 0, now(), memberId).run();
      return json({ id, email }, 201);
    }

    // ── Categories ────────────────────────────────────────────────────────

    if (path === '/categories' && method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM categories WHERE (family_id IS NULL OR family_id = ?) AND is_deleted = 0 ORDER BY is_default DESC, name'
      ).bind(q.get('familyId')).all();
      return json(results);
    }

    if (path === '/categories' && method === 'POST') {
      const { familyId, name, icon, color, isIncome } = await request.json();
      const id = genId(); const t = now();
      const row = await env.DB.prepare('INSERT INTO categories (id, family_id, name, icon, color, is_income, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *').bind(id, familyId, name, icon, color, isIncome ? 1 : 0, t, t).first();
      return json(row, 201);
    }

    const catM = path.match(/^\/categories\/([^/]+)$/);
    if (catM && method === 'DELETE') {
      await env.DB.prepare('UPDATE categories SET is_deleted = 1, updated_at = ? WHERE id = ?').bind(now(), catM[1]).run();
      return json({ ok: true });
    }

    if (method === 'GET' && /^\/(transactions|budgets|analytics)/.test(path)
        && q.get('familyId') && q.get('month') && q.get('year')) {
      await materializeRecurring(env, q.get('familyId'), parseInt(q.get('year')), parseInt(q.get('month')));
    }

    // ── Transactions ──────────────────────────────────────────────────────

    if (path === '/transactions' && method === 'GET') {
      const familyId = q.get('familyId');
      const month = q.get('month'); const year = q.get('year');
      const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const dateTo = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);

      // Transações reais do mês
      const { results: regular } = await env.DB.prepare(`
        SELECT t.*, m.name AS member_name, m.color AS member_color,
          c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
          CASE WHEN t.installment_total IS NOT NULL
            THEN CAST(t.installment_current AS TEXT) || '/' || CAST(t.installment_total AS TEXT)
            ELSE NULL END AS installment_label,
          0 AS is_projected
        FROM transactions t
        LEFT JOIN members m ON m.id = t.member_id
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.family_id = ? AND t.is_deleted = 0
          AND t.transaction_date >= ? AND t.transaction_date <= ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `).bind(familyId, dateFrom, dateTo).all();

      // Recorrentes e parceladas de meses anteriores — para projeção
      const { results: pastRec } = await env.DB.prepare(`
        SELECT t.*, m.name AS member_name, m.color AS member_color,
          c.name AS category_name, c.icon AS category_icon, c.color AS category_color
        FROM transactions t
        LEFT JOIN members m ON m.id = t.member_id
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.family_id = ?
          AND (t.is_recurring = 1 OR t.installment_total IS NOT NULL)
          AND t.transaction_date < ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `).bind(familyId, dateFrom).all();

      const { results: deletedMonth } = await env.DB.prepare(`
        SELECT member_id, description, category_id FROM transactions
        WHERE family_id = ? AND is_deleted = 1 AND transaction_date >= ? AND transaction_date <= ?
      `).bind(familyId, dateFrom, dateTo).all();

      // Projeção (meses futuros): mais recente por (membro+descrição+categoria), não finalizada,
      // não encerrada (última linha apagada) e não já registrada ou removida no mês
      const seenSig = new Set();
      const monthSigs = new Set([...regular, ...deletedMonth].map(t => `${t.member_id}|${t.description}|${t.category_id}`));
      const projected = [];
      for (const t of pastRec) {
        const sig = `${t.member_id}|${t.description}|${t.category_id}`;
        if (seenSig.has(sig)) continue;
        seenSig.add(sig);
        if (t.is_deleted) continue;
        // Pular se última parcela já foi registrada
        if (t.installment_total !== null && t.installment_current >= t.installment_total) continue;
        // Pular se já existe transação no mês com mesma assinatura
        if (monthSigs.has(sig)) continue;
        // Calcular o número correto da parcela com base nos meses decorridos
        let nextCurr = null;
        if (t.installment_total !== null) {
          const [ty, tm] = t.transaction_date.split('-').map(Number);
          const monthsDiff = (parseInt(year) - ty) * 12 + (parseInt(month) - tm);
          nextCurr = Math.min(t.installment_current + monthsDiff, t.installment_total);
        }
        projected.push({
          ...t,
          transaction_date: dateFrom,
          installment_current: nextCurr,
          installment_label: nextCurr !== null ? `${nextCurr}/${t.installment_total}` : null,
          is_projected: 1,
        });
      }

      const results = [...regular, ...projected].sort((a, b) =>
        b.transaction_date.localeCompare(a.transaction_date) ||
        (b.created_at ?? '').localeCompare(a.created_at ?? '')
      );
      return json(results);
    }

    if (path === '/transactions' && method === 'POST') {
      const b = await request.json();
      const { familyId, memberId, categoryId, description, amount, date, method: txMethod,
        isShared, isRecurring, installmentCurrent, installmentTotal, notes, isDeleted } = b;
      const id = genId(); const t = now();
      const iTotal = installmentTotal > 1 ? parseInt(installmentTotal) : null;
      const iCurr  = installmentTotal > 1 ? parseInt(installmentCurrent ?? 1) : null;
      const row = await env.DB.prepare(`
        INSERT INTO transactions (id, family_id, member_id, category_id, description, amount,
          transaction_date, method, installment_current, installment_total,
          is_shared, is_recurring, notes, created_at, updated_at, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
      `).bind(id, familyId, memberId, categoryId, description, parseFloat(amount),
          date, txMethod, iCurr, iTotal, isShared ? 1 : 0, isRecurring ? 1 : 0,
          notes ?? null, t, t, isDeleted ? 1 : 0).first();
      return json(row, 201);
    }

    const txM = path.match(/^\/transactions\/([^/]+)$/);
    if (txM) {
      const txId = txM[1];
      if (method === 'DELETE') {
        await env.DB.prepare('UPDATE transactions SET is_deleted = 1, updated_at = ? WHERE id = ?').bind(now(), txId).run();
        return json({ ok: true });
      }
      if (method === 'PATCH') {
        const { description, amount, categoryId, date, method: txMethod,
          isRecurring, installmentCurrent, installmentTotal, notes } = await request.json();
        const iTotal = (installmentTotal > 1) ? parseInt(installmentTotal) : null;
        const iCurr  = (installmentTotal > 1) ? parseInt(installmentCurrent ?? 1) : null;
        await env.DB.prepare(`
          UPDATE transactions SET
            description = ?, amount = ?, category_id = ?, transaction_date = ?, method = ?,
            is_recurring = ?, installment_current = ?, installment_total = ?,
            notes = ?, updated_at = ?
          WHERE id = ?
        `).bind(description, parseFloat(amount), categoryId, date, txMethod,
            isRecurring ? 1 : 0, iCurr, iTotal, notes ?? null, now(), txId).run();
        return json({ ok: true });
      }
    }

    // ── Budget Limits ─────────────────────────────────────────────────────

    if (path === '/budgets' && method === 'GET') {
      const familyId = q.get('familyId');
      const mo = parseInt(q.get('month')); const yr = parseInt(q.get('year'));
      const dateFrom = `${yr}-${String(mo).padStart(2, '0')}-01`;
      const dateTo = new Date(yr, mo, 0).toISOString().slice(0, 10);
      const { results } = await env.DB.prepare(`
        SELECT bl.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
          COALESCE(ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)), 0) AS spent,
          ROUND(COALESCE(ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)), 0) / bl.limit_amount * 100, 1) AS pct_used,
          CASE
            WHEN COALESCE(ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)), 0) >= bl.limit_amount THEN 'over'
            WHEN COALESCE(ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)), 0) >= bl.limit_amount * 0.8 THEN 'warn'
            ELSE 'ok'
          END AS status
        FROM budget_limits bl
        JOIN categories c ON c.id = bl.category_id
        LEFT JOIN transactions t ON t.category_id = bl.category_id
          AND t.family_id = bl.family_id AND t.is_deleted = 0
          AND t.amount < 0 AND t.transaction_date >= ? AND t.transaction_date <= ?
        WHERE bl.family_id = ? AND bl.month = ? AND bl.year = ?
        GROUP BY bl.id ORDER BY pct_used DESC
      `).bind(dateFrom, dateTo, familyId, mo, yr).all();
      return json(results);
    }

    if (path === '/budgets' && method === 'POST') {
      const { familyId, categoryId, month, year, limitAmount } = await request.json();
      const t = now();
      await env.DB.prepare(`
        INSERT INTO budget_limits (id, family_id, category_id, month, year, limit_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(family_id, category_id, month, year)
        DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = excluded.updated_at
      `).bind(genId(), familyId, categoryId, month, year, parseFloat(limitAmount), t, t).run();
      return json({ ok: true });
    }

    if (path === '/budgets' && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM budget_limits WHERE family_id=? AND category_id=? AND month=? AND year=?')
        .bind(q.get('familyId'), q.get('categoryId'), parseInt(q.get('month')), parseInt(q.get('year'))).run();
      return json({ ok: true });
    }

    // ── Goals ─────────────────────────────────────────────────────────────

    if (path === '/goals' && method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT *, ROUND(saved_amount / target_amount * 100, 1) AS pct_done
        FROM goals WHERE family_id = ? AND is_deleted = 0 ORDER BY created_at
      `).bind(q.get('familyId')).all();
      return json(results);
    }

    if (path === '/goals' && method === 'POST') {
      const { familyId, title, category, targetAmount, savedAmount, deadline, tone } = await request.json();
      const id = genId(); const t = now();
      const row = await env.DB.prepare(`
        INSERT INTO goals (id, family_id, title, category, target_amount, saved_amount, deadline, tone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
      `).bind(id, familyId, title, category, parseFloat(targetAmount), parseFloat(savedAmount ?? 0), deadline || null, tone, t, t).first();
      return json(row, 201);
    }

    const goalContribM = path.match(/^\/goals\/([^/]+)\/contributions$/);
    if (goalContribM && method === 'POST') {
      const goalId = goalContribM[1];
      const { memberId, amount, notes } = await request.json();
      const t = now();
      await env.DB.prepare('INSERT INTO goal_contributions (id, goal_id, member_id, amount, contributed_at, notes) VALUES (?, ?, ?, ?, ?, ?)').bind(genId(), goalId, memberId, parseFloat(amount), t, notes ?? null).run();
      await env.DB.prepare('UPDATE goals SET saved_amount = saved_amount + ?, updated_at = ? WHERE id = ?').bind(parseFloat(amount), t, goalId).run();
      return json({ ok: true }, 201);
    }

    const goalM = path.match(/^\/goals\/([^/]+)$/);
    if (goalM && method === 'DELETE') {
      await env.DB.prepare('UPDATE goals SET is_deleted = 1, updated_at = ? WHERE id = ?').bind(now(), goalM[1]).run();
      return json({ ok: true });
    }

    // ── Savings ───────────────────────────────────────────────────────────

    if (path === '/savings' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM savings WHERE family_id = ? ORDER BY year DESC, month DESC LIMIT 24').bind(q.get('familyId')).all();
      return json(results);
    }

    if (path === '/savings' && method === 'POST') {
      const { familyId, month, year, amount, notes } = await request.json();
      const t = now();
      await env.DB.prepare(`
        INSERT INTO savings (id, family_id, month, year, amount, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(family_id, month, year)
        DO UPDATE SET amount = excluded.amount, notes = excluded.notes, updated_at = excluded.updated_at
      `).bind(genId(), familyId, month, year, parseFloat(amount), notes ?? null, t, t).run();
      return json({ ok: true });
    }

    // ── Insights ──────────────────────────────────────────────────────────

    if (path === '/insights' && method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM insights WHERE family_id = ? AND is_dismissed = 0 ORDER BY created_at DESC LIMIT 1').bind(q.get('familyId')).first();
      return json(row ?? null);
    }

    const insightM = path.match(/^\/insights\/([^/]+)\/dismiss$/);
    if (insightM && method === 'PATCH') {
      await env.DB.prepare('UPDATE insights SET is_dismissed = 1 WHERE id = ?').bind(insightM[1]).run();
      return json({ ok: true });
    }

    // ── Transfers ─────────────────────────────────────────────────────────

    if (path === '/transfers' && method === 'GET') {
      const row = await env.DB.prepare(`
        SELECT t.*, mf.name AS from_member_name, mf.color AS from_member_color,
          mt.name AS to_member_name, mt.color AS to_member_color
        FROM transfers t
        LEFT JOIN members mf ON mf.id = t.from_member_id
        LEFT JOIN members mt ON mt.id = t.to_member_id
        WHERE t.family_id = ? AND t.month = ? AND t.year = ? LIMIT 1
      `).bind(q.get('familyId'), parseInt(q.get('month')), parseInt(q.get('year'))).first();
      if (!row) return json(null);
      return json({
        ...row,
        from_member: { name: row.from_member_name, color: row.from_member_color },
        to_member: { name: row.to_member_name, color: row.to_member_color },
      });
    }

    const transferM = path.match(/^\/transfers\/([^/]+)\/settle$/);
    if (transferM && method === 'PATCH') {
      const t = now();
      await env.DB.prepare('UPDATE transfers SET is_settled = 1, settled_at = ?, updated_at = ? WHERE id = ?').bind(t, t, transferM[1]).run();
      return json({ ok: true });
    }

    // ── Analytics ─────────────────────────────────────────────────────────

    if (path === '/analytics/monthly-spending' && method === 'GET') {
      const familyId = q.get('familyId');
      const mo = parseInt(q.get('month')); const yr = parseInt(q.get('year'));
      const dateFrom = `${yr}-${String(mo).padStart(2, '0')}-01`;
      const dateTo = new Date(yr, mo, 0).toISOString().slice(0, 10);
      const { results } = await env.DB.prepare(`
        SELECT c.id AS category_id, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
          ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)) AS total_spent,
          SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS total_income,
          ? AS month, ? AS year
        FROM transactions t JOIN categories c ON c.id = t.category_id
        WHERE t.family_id = ? AND t.is_deleted = 0
          AND t.transaction_date >= ? AND t.transaction_date <= ?
        GROUP BY c.id ORDER BY total_spent DESC
      `).bind(mo, yr, familyId, dateFrom, dateTo).all();
      return json(results);
    }

    if (path === '/analytics/member-balances' && method === 'GET') {
      const familyId = q.get('familyId');
      const mo = parseInt(q.get('month')); const yr = parseInt(q.get('year'));
      const dateFrom = `${yr}-${String(mo).padStart(2, '0')}-01`;
      const dateTo = new Date(yr, mo, 0).toISOString().slice(0, 10);
      const { results } = await env.DB.prepare(`
        SELECT m.id AS member_id, m.name AS member_name, m.color AS member_color, m.monthly_income,
          ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)) AS total_spent,
          m.monthly_income - ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)) AS balance,
          ? AS month, ? AS year
        FROM members m
        LEFT JOIN transactions t ON t.member_id = m.id AND t.is_deleted = 0
          AND t.transaction_date >= ? AND t.transaction_date <= ?
        WHERE m.family_id = ? AND m.is_deleted = 0 GROUP BY m.id
      `).bind(mo, yr, dateFrom, dateTo, familyId).all();
      return json(results);
    }

    if (path === '/analytics/spending-history' && method === 'GET') {
      const familyId = q.get('familyId');
      const months = parseInt(q.get('months') ?? '6');
      const { results } = await env.DB.prepare(`
        SELECT CAST(strftime('%Y', transaction_date) AS INTEGER) AS year,
          CAST(strftime('%m', transaction_date) AS INTEGER) AS month,
          ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS total_spent,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_income
        FROM transactions WHERE family_id = ? AND is_deleted = 0
        GROUP BY year, month ORDER BY year DESC, month DESC LIMIT ?
      `).bind(familyId, months).all();
      return json(results);
    }

    return err('Not found', 404);
  }
};
