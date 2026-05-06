window.SUPABASE_CONFIG = {
  // Renseignez ces 2 valeurs depuis votre projet Supabase.
  // Exemple:
  // url: "https://xxxxxx.supabase.co",
  // anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  url: localStorage.getItem("shopsenegal.supabase.url") || "",
  anonKey: localStorage.getItem("shopsenegal.supabase.anonKey") || ""
};
