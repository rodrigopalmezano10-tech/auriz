(function () {
  const { supabaseUrl, supabaseAnonKey } = window.AURIZ_CONFIG;
  window.sb = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });
})();
