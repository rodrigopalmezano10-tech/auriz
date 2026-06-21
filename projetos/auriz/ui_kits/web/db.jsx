/* eslint-disable */
// Auriz — Camada de dados (todas as operações com Supabase)

const DB = {

  // ── Auth ──────────────────────────────────────────────────────────────
  async getSession() {
    const { data } = await sb.auth.getSession();
    return data?.session ?? null;
  },

  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  },

  async signOut() {
    await sb.auth.signOut();
  },

  async signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  // ── Família ───────────────────────────────────────────────────────────
  async getFamilyByUserId(userId) {
    const { data } = await sb.from('members')
      .select('family_id, families(id, name, slug)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();
    return data?.families ?? null;
  },

  async createFamily(name, userId, memberName, color, income) {
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data: family, error: fe } = await sb.from('families')
      .insert({ name, slug }).select().single();
    if (fe) throw fe;

    const { error: me } = await sb.from('members').insert({
      family_id: family.id, user_id: userId,
      name: memberName, color, monthly_income: income,
    });
    if (me) throw me;
    return family;
  },

  // ── Membros ───────────────────────────────────────────────────────────
  async getMembers(familyId) {
    const { data } = await sb.from('members')
      .select('*').eq('family_id', familyId).eq('is_deleted', false)
      .order('created_at');
    return data ?? [];
  },

  async addMember({ familyId, name, color, monthlyIncome }) {
    const { data, error } = await sb.from('members').insert({
      family_id: familyId, name, color, monthly_income: monthlyIncome,
    }).select().single();
    if (error) throw error;
    return data;
  },

  async updateMember(id, { name, color, monthlyIncome }) {
    const { error } = await sb.from('members')
      .update({ name, color, monthly_income: monthlyIncome }).eq('id', id);
    if (error) throw error;
  },

  async softDeleteMember(id) {
    await sb.from('members').update({ is_deleted: true }).eq('id', id);
  },

  // ── Categorias ────────────────────────────────────────────────────────
  async getCategories(familyId) {
    const { data } = await sb.from('categories')
      .select('*')
      .or(`family_id.is.null,family_id.eq.${familyId}`)
      .eq('is_deleted', false)
      .order('is_default', { ascending: false })
      .order('name');
    return data ?? [];
  },

  async addCategory({ familyId, name, icon, color, isIncome }) {
    const { data, error } = await sb.from('categories').insert({
      family_id: familyId, name, icon, color, is_income: isIncome ?? false,
    }).select().single();
    if (error) throw error;
    return data;
  },

  async softDeleteCategory(id) {
    await sb.from('categories').update({ is_deleted: true }).eq('id', id);
  },

  // ── Transações ────────────────────────────────────────────────────────
  async getTransactions(familyId, month, year) {
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const dateTo   = new Date(year, month, 0).toISOString().slice(0, 10);
    const { data } = await sb.from('v_transactions')
      .select('*').eq('family_id', familyId)
      .gte('transaction_date', dateFrom).lte('transaction_date', dateTo)
      .order('transaction_date', { ascending: false });
    return data ?? [];
  },

  async addTransaction({ familyId, memberId, categoryId, description, amount, date, method, isShared, isRecurring, installmentCurrent, installmentTotal, notes }) {
    const payload = {
      family_id: familyId, member_id: memberId, category_id: categoryId,
      description, amount: parseFloat(amount), transaction_date: date,
      method, is_shared: isShared ?? false, is_recurring: isRecurring ?? false, notes: notes ?? null,
      installment_current: installmentTotal > 1 ? parseInt(installmentCurrent ?? 1) : null,
      installment_total:   installmentTotal > 1 ? parseInt(installmentTotal)       : null,
    };
    const { data, error } = await sb.from('transactions').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async softDeleteTransaction(id) {
    const { error } = await sb.from('transactions').update({ is_deleted: true }).eq('id', id);
    if (error) throw error;
  },

  // ── Teto de Gastos ────────────────────────────────────────────────────
  async getBudgetStatus(familyId, month, year) {
    const { data } = await sb.from('v_budget_status')
      .select('*').eq('family_id', familyId).eq('month', month).eq('year', year)
      .order('pct_used', { ascending: false });
    return data ?? [];
  },

  async upsertBudgetLimit({ familyId, categoryId, month, year, limitAmount }) {
    const { error } = await sb.from('budget_limits').upsert({
      family_id: familyId, category_id: categoryId,
      month, year, limit_amount: parseFloat(limitAmount),
    }, { onConflict: 'family_id,category_id,month,year' });
    if (error) throw error;
  },

  async deleteBudgetLimit(familyId, categoryId, month, year) {
    const { error } = await sb.from('budget_limits')
      .delete().eq('family_id', familyId).eq('category_id', categoryId)
      .eq('month', month).eq('year', year);
    if (error) throw error;
  },

  // ── Metas ─────────────────────────────────────────────────────────────
  async getGoals(familyId) {
    const { data } = await sb.from('v_goals_progress')
      .select('*').eq('family_id', familyId).order('created_at');
    return data ?? [];
  },

  async addGoal({ familyId, title, category, targetAmount, savedAmount, deadline, tone }) {
    const { data, error } = await sb.from('goals').insert({
      family_id: familyId, title, category,
      target_amount: parseFloat(targetAmount),
      saved_amount:  parseFloat(savedAmount ?? 0),
      deadline: deadline || null, tone,
    }).select().single();
    if (error) throw error;
    return data;
  },

  async addGoalContribution({ goalId, memberId, amount, notes }) {
    const { error: ce } = await sb.from('goal_contributions').insert({
      goal_id: goalId, member_id: memberId, amount: parseFloat(amount), notes: notes ?? null,
    });
    if (ce) throw ce;

    const { data: goal } = await sb.from('goals').select('saved_amount').eq('id', goalId).single();
    const newSaved = parseFloat(goal.saved_amount) + parseFloat(amount);
    await sb.from('goals').update({ saved_amount: newSaved }).eq('id', goalId);
  },

  async softDeleteGoal(id) {
    await sb.from('goals').update({ is_deleted: true }).eq('id', id);
  },

  // ── Economias ─────────────────────────────────────────────────────────
  async getSavings(familyId) {
    const { data } = await sb.from('savings')
      .select('*').eq('family_id', familyId)
      .order('year', { ascending: false }).order('month', { ascending: false })
      .limit(24);
    return data ?? [];
  },

  async upsertSavings({ familyId, month, year, amount, notes }) {
    const { error } = await sb.from('savings').upsert({
      family_id: familyId, month, year,
      amount: parseFloat(amount), notes: notes ?? null,
    }, { onConflict: 'family_id,month,year' });
    if (error) throw error;
  },

  // ── Insights ──────────────────────────────────────────────────────────
  async getActiveInsight(familyId) {
    const { data } = await sb.from('insights')
      .select('*').eq('family_id', familyId).eq('is_dismissed', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data ?? null;
  },

  async dismissInsight(id) {
    await sb.from('insights').update({ is_dismissed: true }).eq('id', id);
  },

  // ── Transferência ─────────────────────────────────────────────────────
  async getTransfer(familyId, month, year) {
    const { data } = await sb.from('transfers')
      .select('*, from_member:from_member_id(name,color), to_member:to_member_id(name,color)')
      .eq('family_id', familyId).eq('month', month).eq('year', year).maybeSingle();
    return data ?? null;
  },

  async settleTransfer(id) {
    await sb.from('transfers')
      .update({ is_settled: true, settled_at: new Date().toISOString() }).eq('id', id);
  },

  // ── Admin: Usuários & Acesso ──────────────────────────────────
  async createUserAndLink(email, password, memberId, isAdmin = false) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) throw new Error("Usuário criado mas ID não retornado. Verifique o e-mail de confirmação.");
    const { error: ue } = await sb.from('members')
      .update({ user_id: userId, is_admin: isAdmin }).eq('id', memberId);
    if (ue) throw ue;
    return data;
  },

  async setAdminStatus(memberId, isAdmin) {
    const { error } = await sb.from('members').update({ is_admin: isAdmin }).eq('id', memberId);
    if (error) throw error;
  },

  async unlinkMember(memberId) {
    const { error } = await sb.from('members').update({ user_id: null, is_admin: false }).eq('id', memberId);
    if (error) throw error;
  },

  // ── Analytics ─────────────────────────────────────────────────────────
  async getMonthlySpending(familyId, month, year) {
    const { data } = await sb.from('v_monthly_spending')
      .select('*').eq('family_id', familyId).eq('month', month).eq('year', year)
      .order('total_spent', { ascending: false });
    return data ?? [];
  },

  async getMemberBalances(familyId, month, year) {
    const { data } = await sb.from('v_member_balances')
      .select('*').eq('family_id', familyId).eq('month', month).eq('year', year);
    return data ?? [];
  },

  async getSpendingHistory(familyId, months = 6) {
    const { data } = await sb.from('v_monthly_spending')
      .select('year, month, total_spent, total_income')
      .eq('family_id', familyId)
      .order('year', { ascending: false }).order('month', { ascending: false })
      .limit(months * 15);
    return data ?? [];
  },
};

window.DB = DB;
