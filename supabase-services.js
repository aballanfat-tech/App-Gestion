// supabase-services.js
(function () {
  "use strict";

  async function initServices() {
    const supabaseClient = await window.SupabaseReady;

    class Auth {
      static async login(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
      }
      static async logout() {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
      }
      static async getCurrentUser() {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          return user;
        } catch { return null; }
      }
      static async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user !== null;
      }
      static async requireAuth() {
        const ok = await this.isAuthenticated();
        if (!ok) window.location.href = "login.html";
        return ok;
      }
    }

    class ClientsAPI {
      static async getAll() {
        const { data, error } = await supabaseClient.from("clients").select("*").order("name");
        if (error) return [];
        return data || [];
      }
      static async getByName(name) {
        const { data, error } = await supabaseClient.from("clients").select("*").eq("name", name).maybeSingle();
        if (error) return null;
        return data;
      }
      static async create(name) {
        const { data, error } = await supabaseClient.from("clients").insert({ name }).select().single();
        if (error) return null;
        return data;
      }
    }

    class GrillesAPI {
      static async getOne(clientName, year) {
        const client = await ClientsAPI.getByName(clientName);
        if (!client) return null;
        const { data, error } = await supabaseClient
          .from("grilles")
          .select("*")
          .eq("client_id", client.id)
          .eq("year", year)
          .single();
        if (error) return null;
        return data;
      }

      static async create(clientName, year, data = {}, tva = 10) {
        let client = await ClientsAPI.getByName(clientName);
        if (!client) client = await ClientsAPI.create(clientName);
        const { data: result, error } = await supabaseClient
          .from("grilles")
          .insert({ client_id: client.id, year, data, tva })
          .select()
          .single();
        if (error) throw error;
        return result;
      }

      static async update(clientName, year, data, tva = 10) {
        const client = await ClientsAPI.getByName(clientName);
        const { data: result, error } = await supabaseClient
          .from("grilles")
          .update({ data, tva, updated_at: new Date().toISOString() })
          .eq("client_id", client.id)
          .eq("year", year)
          .select()
          .single();
        if (error) throw error;
        return result;
      }

      static async save(clientName, year, data, tva = 10) {
        const existing = await this.getOne(clientName, year);
        return existing ? this.update(clientName, year, data, tva) : this.create(clientName, year, data, tva);
      }

      static async duplicate(clientName, fromYear, toYear) {
        const existing = await this.getOne(clientName, fromYear);
        if (!existing) throw new Error("Grille source introuvable");
        const target = await this.getOne(clientName, toYear);
        if (target) throw new Error("Grille cible déjà existante");
        return this.create(clientName, toYear, existing.data, existing.tva);
      }

      static async getAllForClient(clientName) {
        const client = await ClientsAPI.getByName(clientName);
        if (!client) return [];
        const { data, error } = await supabaseClient.from("grilles").select("*").eq("client_id", client.id).order("year", { ascending: false });
        if (error) return [];
        return data || [];
      }

      static async delete(clientName, year) {
        const client = await ClientsAPI.getByName(clientName);
        const { error } = await supabaseClient.from("grilles").delete().eq("client_id", client.id).eq("year", year);
        if (error) throw error;
        return true;
      }
    }

    window.Auth = Auth;
    window.ClientsAPI = ClientsAPI;
    window.GrillesAPI = GrillesAPI;
    window.SupabaseClient = supabaseClient;

    console.log("✅ Supabase SERVICES prêt (Auth/ClientsAPI/GrillesAPI)");
  }

  initServices().catch(e => console.error("❌ initServices:", e.message));
})();
