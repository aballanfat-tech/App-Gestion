// ========================================
// CONFIGURATION SUPABASE V4
// Grille Tarifaire Autocars Ballanfat
// PROJET FONCTIONNEL - Authentification validée
// ========================================

(function() {
  'use strict';

const SUPABASE_CONFIG = {
  url: 'https://ayzouplmnnlooofcxbsz.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5em91cGxtbm5sb29vZmN4YnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzE2OTAsImV4cCI6MjA4MjUwNzY5MH0.RUs4_g2k0c0n62fEZQAKdG4FtfoqFcFULxrZESopZ4k'
};

window.SUPABASE_URL = SUPABASE_CONFIG.url;
window.SUPABASE_ANON_KEY = SUPABASE_CONFIG.key;

function initSupabase() {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('❌ Supabase non chargé');
    return;
  }

  // ✅ IMPORTANT : on crée supabaseClient (utilisé partout dans le fichier)
  const supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.key
  );

  // ✅ on expose aussi pour les autres pages si besoin
  window.SupabaseClient = supabaseClient;



    // ========================================
    // AUTHENTIFICATION
    // ========================================

    class Auth {
      static async login(email, password) {
        try {
          console.log('Connexion pour:', email);
          
          const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
          });
          
          if (error) {
            console.error('Erreur login:', error);
            throw error;
          }
          
          console.log('✅ Connexion réussie');
          return data.user;
          
        } catch (error) {
          console.error('Erreur login:', error);
          throw error;
        }
      }

      static async logout() {
        try {
          await supabaseClient.auth.signOut();
          window.location.href = 'login.html';
        } catch (error) {
          console.error('Erreur logout:', error);
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
          window.location.href = 'login.html';
          return false;
        }
        return true;
      }
    }

    // ========================================
    // CLIENTS
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
          const { data, error } = await supabaseClient
            .from('clients')
            .insert({ name: name })
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
    // GRILLES TARIFAIRES
    // ========================================

    class GrillesAPI {
      static async getOne(clientName, year) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) return null;

          const { data, error } = await supabaseClient
            .from('grilles')
            .select('*')
            .eq('client_id', client.id)
            .eq('year', year)
            .single();
          
          if (error && error.code === 'PGRST116') return null;
          if (error) throw error;
          
          return data;
        } catch (error) {
          console.error('Erreur getOne:', error);
          return null;
        }
      }

      static async create(clientName, year, data, tva = 10.0) {
        try {
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
              tva: tva
            })
            .select()
            .single();
          
          if (error) throw error;
          return result;
        } catch (error) {
          console.error('Erreur create:', error);
          throw error;
        }
      }

      static async update(clientName, year, data, tva) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) throw new Error('Client non trouvé');

          const { data: result, error } = await supabaseClient
            .from('grilles')
            .update({
              data: data,
              tva: tva,
              updated_at: new Date().toISOString()
            })
            .eq('client_id', client.id)
            .eq('year', year)
            .select()
            .single();
          
          if (error) throw error;
          return result;
        } catch (error) {
          console.error('Erreur update:', error);
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
          console.error('Erreur save:', error);
          throw error;
        }
      }

      static async duplicate(clientName, fromYear, toYear) {
        try {
          const source = await this.getOne(clientName, fromYear);
          if (!source) throw new Error('Grille source non trouvée');
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
          return [];
        }
      }

      static async delete(clientName, year) {
        try {
          const client = await ClientsAPI.getByName(clientName);
          if (!client) return;

          await supabaseClient
            .from('grilles')
            .delete()
            .eq('client_id', client.id)
            .eq('year', year);
        } catch (error) {
          console.error('Erreur delete:', error);
        }
      }
    }

    window.Auth = Auth;
    window.ClientsAPI = ClientsAPI;
    window.GrillesAPI = GrillesAPI;
    window.SupabaseClient = supabaseClient;

    console.log('✅ Supabase V4 chargé - Authentification validée');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
  } else {
    initSupabase();
  }

})();
