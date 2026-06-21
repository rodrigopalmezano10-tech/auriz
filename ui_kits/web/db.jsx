/* eslint-disable */
// Auriz — Camada de dados (Cloudflare Worker + D1)

const DB = {

  // ── Auth ──────────────────────────────────────────────────────────────
  async getSession() {
    const token = API.getToken();
    return token ? { token } : null;
  },

  async signIn(email, password) {
    const data = await API.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    API.setToken(data.token);
    return data;
  },

  async signOut() {
    API.setToken(null);
  },

  async signUp(email, password) {
    const data = await API.fetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    API.setToken(data.token);
    return data;
  },

  // ── Família ───────────────────────────────────────────────────────────
  async getFamilyByUserId() {
    return await API.fetch('/families/mine');
  },

  async createFamily(name, _userId, memberName, color, income) {
    return await API.fetch('/families', {
      method: 'POST',
      body: JSON.stringify({ name, memberName, color, income }),
    });
  },

  // ── Membros ───────────────────────────────────────────────────────────
  async getMembers(familyId) {
    return await API.fetch(`/members?familyId=${familyId}`);
  },

  async addMember({ familyId, name, color, monthlyIncome }) {
    return await API.fetch('/members', {
      method: 'POST',
      body: JSON.stringify({ familyId, name, color, monthlyIncome }),
    });
  },

  async updateMember(id, { name, color, monthlyIncome }) {
    return await API.fetch(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, color, monthlyIncome }),
    });
  },

  async softDeleteMember(id) {
    return await API.fetch(`/members/${id}`, { method: 'DELETE' });
  },

  // ── Categorias ────────────────────────────────────────────────────────
  async getCategories(familyId) {
    return await API.fetch(`/categories?familyId=${familyId}`);
  },

  async addCategory({ familyId, name, icon, color, isIncome }) {
    return await API.fetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ familyId, name, icon, color, isIncome }),
    });
  },

  async softDeleteCategory(id) {
    return await API.fetch(`/categories/${id}`, { method: 'DELETE' });
  },

  // ── Transações ────────────────────────────────────────────────────────
  async getTransactions(familyId, month, year) {
    return await API.fetch(`/transactions?familyId=${familyId}&month=${month}&year=${year}`);
  },

  async addTransaction({ familyId, memberId, categoryId, description, amount, date, method, isShared, isRecurring, installmentCurrent, installmentTotal, notes }) {
    return await API.fetch('/transactions', {
      method: 'POST',
      body: JSON.stringify({ familyId, memberId, categoryId, description, amount, date, method, isShared, isRecurring, installmentCurrent, installmentTotal, notes }),
    });
  },

  async softDeleteTransaction(id) {
    return await API.fetch(`/transactions/${id}`, { method: 'DELETE' });
  },

  // ── Teto de Gastos ────────────────────────────────────────────────────
  async getBudgetStatus(familyId, month, year) {
    return await API.fetch(`/budgets?familyId=${familyId}&month=${month}&year=${year}`);
  },

  async upsertBudgetLimit({ familyId, categoryId, month, year, limitAmount }) {
    return await API.fetch('/budgets', {
      method: 'POST',
      body: JSON.stringify({ familyId, categoryId, month, year, limitAmount }),
    });
  },

  async deleteBudgetLimit(familyId, categoryId, month, year) {
    return await API.fetch(`/budgets?familyId=${familyId}&categoryId=${categoryId}&month=${month}&year=${year}`, {
      method: 'DELETE',
    });
  },

  // ── Metas ─────────────────────────────────────────────────────────────
  async getGoals(familyId) {
    return await API.fetch(`/goals?familyId=${familyId}`);
  },

  async addGoal({ familyId, title, category, targetAmount, savedAmount, deadline, tone }) {
    return await API.fetch('/goals', {
      method: 'POST',
      body: JSON.stringify({ familyId, title, category, targetAmount, savedAmount, deadline, tone }),
    });
  },

  async addGoalContribution({ goalId, memberId, amount, notes }) {
    return await API.fetch(`/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify({ memberId, amount, notes }),
    });
  },

  async softDeleteGoal(id) {
    return await API.fetch(`/goals/${id}`, { method: 'DELETE' });
  },

  // ── Economias ─────────────────────────────────────────────────────────
  async getSavings(familyId) {
    return await API.fetch(`/savings?familyId=${familyId}`);
  },

  async upsertSavings({ familyId, month, year, amount, notes }) {
    return await API.fetch('/savings', {
      method: 'POST',
      body: JSON.stringify({ familyId, month, year, amount, notes }),
    });
  },

  // ── Insights ──────────────────────────────────────────────────────────
  async getActiveInsight(familyId) {
    return await API.fetch(`/insights?familyId=${familyId}`);
  },

  async dismissInsight(id) {
    return await API.fetch(`/insights/${id}/dismiss`, { method: 'PATCH' });
  },

  // ── Transferência ─────────────────────────────────────────────────────
  async getTransfer(familyId, month, year) {
    return await API.fetch(`/transfers?familyId=${familyId}&month=${month}&year=${year}`);
  },

  async settleTransfer(id) {
    return await API.fetch(`/transfers/${id}/settle`, { method: 'PATCH' });
  },

  // ── Admin: Usuários & Acesso ──────────────────────────────────────────
  async createUserAndLink(email, password, memberId, isAdmin = false) {
    return await API.fetch('/admin/create-user', {
      method: 'POST',
      body: JSON.stringify({ email, password, memberId, isAdmin }),
    });
  },

  async setAdminStatus(memberId, isAdmin) {
    return await API.fetch(`/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isAdmin }),
    });
  },

  async unlinkMember(memberId) {
    return await API.fetch(`/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'unlink' }),
    });
  },

  // ── Analytics ─────────────────────────────────────────────────────────
  async getMonthlySpending(familyId, month, year) {
    return await API.fetch(`/analytics/monthly-spending?familyId=${familyId}&month=${month}&year=${year}`);
  },

  async getMemberBalances(familyId, month, year) {
    return await API.fetch(`/analytics/member-balances?familyId=${familyId}&month=${month}&year=${year}`);
  },

  async getSpendingHistory(familyId, months = 6) {
    return await API.fetch(`/analytics/spending-history?familyId=${familyId}&months=${months}`);
  },
};

window.DB = DB;
