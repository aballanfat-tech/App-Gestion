// supabase-core.js
(function () {
  "use strict";

  // ✅ Anti double init
  if (window.__SUPABASE_CORE_INITIALIZED__) {
    console.warn("⚠️ supabase-core déjà initialisé, skip");
    return;
  }
  window.__SUPABASE_CORE_INITIALIZED__ = true;

  // ✅ On réutilise les variables globales si elles existent déjà
  // (compatibilité avec ton ancien supabase-config.js)
  const SUPABASE_URL = window.SUPABASE_URL || "https://ayzouplmnnlooofcxbsz.supabase.co";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5em91cGxtbm5sb29vZmN4YnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzE2OTAsImV4cCI6MjA4MjUwNzY5MH0.RUs4_g2k0c0n62fEZQAKdG4FtfoqFcFULxrZESopZ4k';

  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  // ✅ Charge le SDK une seule fois
  function loadSupabaseSDK() {
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve();

      // Si un chargement est déjà en cours, on attend
      if (window.__SUPABASE_SDK_LOADING__) {
        const t = setInterval(() => {
          if (window.supabase && window.supabase.createClient) {
            clearInterval(t);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(t);
          reject(new Error("Timeout chargement supabase-js"));
        }, 8000);
        return;
      }
      window.__SUPABASE_SDK_LOADING__ = true;

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Impossible de charger supabase-js"));
      document.head.appendChild(script);
    });
  }

  async function initClient() {
    await loadSupabaseSDK();

    // ✅ Client unique global
    if (!window.SupabaseClient) {
      window.SupabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
      console.log("✅ Supabase CORE prêt (client unique créé)");
    } else {
      console.log("✅ Supabase CORE prêt (client déjà existant)");
    }

    return window.SupabaseClient;
  }

  // ✅ Promesse globale (utilisée partout)
  window.SupabaseReady = initClient();

})();
