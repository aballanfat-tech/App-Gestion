// supabase-services.js
(function () {
  "use strict";

  async function initServices() {
    const supabaseClient = await window.SupabaseReady;

    // ========================================
    // AUTH (repris de ton fichier actuel)
    // ========================================
    class Auth {
      static async login(email, password) {
        try {
          console.log("Connexion pour:", email);

          const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
          });

          if (error) {
            console.error("Erreur login:", error);
            throw error;
          }

          console.log("✅ Connexion réussie");
          return data.user;
        } catch (error) {
          console.error("Erreur login:", error);
          throw error;
        }
      }

      static async logout() {
        try {
          await supabaseClient.auth.signOut();
          window.location.href = "login.html";
        } catch (error) {
          console.error("Erreur logout:", error);
        }
      }

      static async getCurrentUser() {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          return user;
        } catch (error) {
          return null;
        }
      }

      static async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user !== null;
      }

      static async requireAuth() {
        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
          window.location.href = "login.html";
          return false;
        }
        return true;
      }
    }

    // ========================================
    // CLIENTS (repris)
    // ========================================
    class ClientsAPI {
      static async getAll() {
        try {
          const { data, error } = await supabaseClient
            .from("clients")
            .select("*")
            .order("name");

          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error("Erreur getAll clients:", error);
          return [];
        }
      }

      static async getByName(name) {
        try {
          const { data, error } = await supabaseClient
            .from("clients")
            .select("*")
            .eq("name", name)
            .maybeSingle();

          if (error) throw error;
          return data;
        } catch (error) {
          console.error("Erreur getByName:", error);
          return null;
        }
      }

      static async create(name) {
        try {
          const { data, error } = await supabaseClient
            .from("clients")
            .insert({ name: name })
            .select()
            .single();

          if (error) throw error;
          return data;
        } catch (error) {
          console.error("Erreur create client:", error);
          return null;
        }
      }
    }

    // ========================================
    // GRILLES (repris)
    // ========================================
    class GrillesAPI {

      static async getOne(clientName, year) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) return null;

          const { data, error } = await supabaseClient
            .from("grilles")
            .select("*")
            .eq("client_id", client.id)
            .eq("year", year)
            .single();

          if (error && error.code === "PGRST116") return null; // pas trouvé
          if (error) throw error;

          return data;
        } catch (error) {
          console.error("Erreur getOne grille:", error);
          return null;
        }
      }

      static async create(clientName, year, data = {}, tva = 10) {
        try {
          let client = await ClientsAPI.getByName(clientName);
          if (!client) {
            client = await ClientsAPI.create(clientName);
            if (!client) throw new Error("Impossible de créer le client");
          }

          const { data: result, error } = await supabaseClient
            .from("grilles")
            .insert({
              client_id: client.id,
              year: year,
              data: data,
              tva: tva
            })
            .select()
            .single();

          if (error) throw error;
          return result;
        } catch (error) {
          console.error("Erreur create grille:", error);
          throw error;
        }
      }

      static async update(clientName, year, data, tva = 10) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) throw new Error("Client introuvable");

          const { data: result, error } = await supabaseClient
            .from("grilles")
            .update({
              data: data,
              tva: tva,
              updated_at: new Date().toISOString()
            })
            .eq("client_id", client.id)
            .eq("year", year)
            .select()
            .single();

          if (error) throw error;
          return result;
        } catch (error) {
          console.error("Erreur update grille:", error);
          throw error;
        }
      }

      static async save(clientName, year, data, tva = 10) {
        try {
          const existing = await this.getOne(clientName, year);
          if (existing) {
            return await this.update(clientName, year, data, tva);
          } else {
            return await this.create(clientName, year, data, tva);
          }
        } catch (error) {
          console.error("Erreur save grille:", error);
          throw error;
        }
      }

      static async duplicate(clientName, fromYear, toYear) {
        try {
          const existing = await this.getOne(clientName, fromYear);
          if (!existing) throw new Error("Grille source introuvable");

          // vérifie si la grille cible existe déjà
          const target = await this.getOne(clientName, toYear);
          if (target) throw new Error("Grille cible déjà existante");

          return await this.create(clientName, toYear, existing.data, existing.tva);
        } catch (error) {
          console.error("Erreur duplicate grille:", error);
          throw error;
        }
      }

      static async getAllForClient(clientName) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) return [];

          const { data, error } = await supabaseClient
            .from("grilles")
            .select("*")
            .eq("client_id", client.id)
            .order("year", { ascending: false });

          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error("Erreur getAllForClient:", error);
          return [];
        }
      }

      static async delete(clientName, year) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) throw new Error("Client introuvable");

          const { error } = await supabaseClient
            .from("grilles")
            .delete()
            .eq("client_id", client.id)
            .eq("year", year);

          if (error) throw error;
          return true;
        } catch (error) {
          console.error("Erreur delete grille:", error);
          throw error;
        }
      }

    }

    // ========================================
    // Export global (compat totale)
    // ========================================
    window.Auth = Auth;
    window.ClientsAPI = ClientsAPI;
    window.GrillesAPI = GrillesAPI;
    window.SupabaseClient = supabaseClient;

    console.log("✅ Supabase SERVICES prêt (Auth/ClientsAPI/GrillesAPI)");
  }

  initServices().catch((e) => {
    console.error("❌ initServices error:", e.message);
  });

})();
