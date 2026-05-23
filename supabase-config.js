(function () {
  /** Données injectées au boot Docker (voir docker-entrypoint.sh) ou métas facultatives avant ce script */
  var rt =
    typeof window.SHOPSENEGAL_RUNTIME === "object" &&
    window.SHOPSENEGAL_RUNTIME !== null &&
    !Array.isArray(window.SHOPSENEGAL_RUNTIME)
      ? window.SHOPSENEGAL_RUNTIME
      : {};

  var metaUrlEl = document.querySelector('meta[name="shopsenegal-supabase-url"]');
  var metaAnonEl = document.querySelector('meta[name="shopsenegal-supabase-anon-key"]');
  var metaUrl = typeof metaUrlEl?.content === "string" ? metaUrlEl.content.trim() : "";
  var metaAnon = typeof metaAnonEl?.content === "string" ? metaAnonEl.content.trim() : "";

  var fromRtUrl = typeof rt.SUPABASE_URL === "string" ? rt.SUPABASE_URL.trim() : "";
  var fromRtAnon = typeof rt.SUPABASE_ANON_KEY === "string" ? rt.SUPABASE_ANON_KEY.trim() : "";

  window.SUPABASE_CONFIG = {
    url: fromRtUrl || metaUrl || localStorage.getItem("shopsenegal.supabase.url") || "",
    anonKey: fromRtAnon || metaAnon || localStorage.getItem("shopsenegal.supabase.anonKey") || ""
  };
})();
