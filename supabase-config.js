// ========================================
// CONFIGURATION SUPABASE V2
// Grille Tarifaire Autocars Ballanfat
// NOUVEAU PROJET - Compatible GitHub Pages
// ========================================

(function() {
  'use strict';

  // Configuration - NOUVELLES CLÉS
  const SUPABASE_CONFIG = {
    url: 'https://kcmofhnbwcryrtwhjrtf.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbW9maG5id2NyeXJ0d2hqcnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDQ1NjgsImV4cCI6MjA4MTkyMDU2OH0.zPeT3HRSfoHeCjH7tqK12yDLN1u69apXz1ARIZfnBFI'
  };

  // Attendre que la bibliothèque Supabase soit chargée
  function initSupabase() {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.error('❌ Bibliothèque Supabase non chargée');
      return;
    }

    // Initialisation client Supabase
    const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

    // ========================================
    // AUTHENTIFICATION
    // ========================================

    class Auth {
      static async login(email, password) {
        try {
          const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
          });
          
          if (error) throw error;
          return data.user;
        } catch (error) {
          console.error('Erreur login:', error);
          throw error;
        }
      }

      static async logout() {
        try {
          const { error } = await supabaseClient.auth.signOut();
          if (error) throw error;
          window.location.href = 'login.html';
        } catch (error) {
          console.error('Erreur logout:', error);
          throw error;
        }
      }

      static async getCurrentUser() {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          return user;
        } catch (error) {
          console.error('Erreur getCurrentUser:', error);
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
          window.location.href = 'login.html';
          return false;
        }
        return true;
      }
    }

    // ========================================
    // GESTION CLIENTS
    // ========================================

    class ClientsAPI {
      static async getAll() {
        try {
          const { data, error } = await supabaseClient
            .from('clients')
            .select('*')
            .order('name');
          
          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error('Erreur getAll clients:', error);
          return [];
        }
      }

      static async getByName(name) {
        try {
          const { data, error } = await supabaseClient
            .from('clients')
            .select('*')
            .eq('name', name)
            .single();
          
          if (error) throw error;
          return data;
        } catch (error) {
          console.error('Erreur getByName:', error);
          return null;
        }
      }

      static async create(name) {
        try {
          const user = await Auth.getCurrentUser();
          
          const { data, error } = await supabaseClient
            .from('clients')
            .insert({
              name: name,
              created_by: user?.id
            })
            .select()
            .single();
          
          if (error) throw error;
          return data;
        } catch (error) {
          console.error('Erreur create client:', error);
          throw error;
        }
      }
    }

    // ========================================
    // GESTION GRILLES TARIFAIRES
    // ========================================

    class GrillesAPI {
      static async getOne(clientName, year) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) {
            console.log(`Client ${clientName} non trouvé`);
            return null;
          }

          const { data, error } = await supabaseClient
            .from('grilles')
            .select('*')
            .eq('client_id', client.id)
            .eq('year', year)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') {
              return null;
            }
            throw error;
          }
          
          return data;
        } catch (error) {
          console.error('Erreur getOne:', error);
          return null;
        }
      }

      static async create(clientName, year, data, tva = 10.0) {
        try {
          const user = await Auth.getCurrentUser();
          
          let client = await ClientsAPI.getByName(clientName);
          
          if (!client) {
            client = await ClientsAPI.create(clientName);
          }

          const { data: result, error } = await supabaseClient
            .from('grilles')
            .insert({
              client_id: client.id,
              year: year,
              data: data,
              tva: tva,
              created_by: user?.id,
              updated_by: user?.id
            })
            .select()
            .single();
          
          if (error) throw error;
          return result;
        } catch (error) {
          console.error('Erreur create grille:', error);
          throw error;
        }
      }

      static async update(clientName, year, data, tva) {
        try {
          const user = await Auth.getCurrentUser();
          
          const client = await ClientsAPI.getByName(clientName);
          if (!client) {
            throw new Error(`Client ${clientName} non trouvé`);
          }

          const { data: result, error } = await supabaseClient
            .from('grilles')
            .update({
              data: data,
              tva: tva,
              updated_by: user?.id,
              updated_at: new Date().toISOString()
            })
            .eq('client_id', client.id)
            .eq('year', year)
            .select()
            .single();
          
          if (error) throw error;
          return result;
        } catch (error) {
          console.error('Erreur update grille:', error);
          throw error;
        }
      }

      static async save(clientName, year, data, tva) {
        try {
          const existing = await this.getOne(clientName, year);
          
          if (existing) {
            return await this.update(clientName, year, data, tva);
          } else {
            return await this.create(clientName, year, data, tva);
          }
        } catch (error) {
          console.error('Erreur save grille:', error);
          throw error;
        }
      }

      static async duplicate(clientName, fromYear, toYear) {
        try {
          const source = await this.getOne(clientName, fromYear);
          if (!source) {
            throw new Error(`Grille ${clientName} ${fromYear} non trouvée`);
          }

          return await this.create(clientName, toYear, source.data, source.tva);
        } catch (error) {
          console.error('Erreur duplicate:', error);
          throw error;
        }
      }

      static async getAllForClient(clientName) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) return [];

          const { data, error } = await supabaseClient
            .from('grilles')
            .select('*')
            .eq('client_id', client.id)
            .order('year', { ascending: false });
          
          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error('Erreur getAllForClient:', error);
          return [];
        }
      }

      static async delete(clientName, year) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) return;

          const { error } = await supabaseClient
            .from('grilles')
            .delete()
            .eq('client_id', client.id)
            .eq('year', year);
          
          if (error) throw error;
        } catch (error) {
          console.error('Erreur delete:', error);
          throw error;
        }
      }
    }

    // ========================================
    // EXPORT GLOBAL
    // ========================================

    window.Auth = Auth;
    window.ClientsAPI = ClientsAPI;
    window.GrillesAPI = GrillesAPI;
    window.SupabaseClient = supabaseClient;

    console.log('✅ Supabase API V2 chargée - Nouveau projet');
  }

  // Initialiser dès que possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
  } else {
    initSupabase();
  }

})();
