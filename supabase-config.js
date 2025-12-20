// ========================================
// CONFIGURATION SUPABASE
// Grille Tarifaire Autocars Ballanfat
// ========================================

// Configuration - VOS IDENTIFIANTS
const SUPABASE_CONFIG = {
    url: 'https://bgkpjrjnbhhozalmiogg.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJna3BqcmpuYmhob3phbG1pb2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDEzMzAsImV4cCI6MjA4MTYxNzMzMH0.Oy3TESDOSt-bt4wTem-HYsjgnufqGT-ziYTfZKy24e8'
};

// Initialisation client Supabase
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

// ========================================
// AUTHENTIFICATION
// ========================================

class Auth {
    // Connexion
    static async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
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

    // Déconnexion
    static async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erreur logout:', error);
            throw error;
        }
    }

    // Utilisateur connecté
    static async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('Erreur getCurrentUser:', error);
            return null;
        }
    }

    // Vérifier si connecté
    static async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user !== null;
    }

    // Rediriger vers login si non authentifié
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
    // Liste tous les clients
    static async getAll() {
        try {
            const { data, error } = await supabase
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

    // Récupérer un client par nom
    static async getByName(name) {
        try {
            const { data, error } = await supabase
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

    // Créer un client
    static async create(name) {
        try {
            const user = await Auth.getCurrentUser();
            
            const { data, error } = await supabase
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
    // Récupérer une grille spécifique (client + année)
    static async getOne(clientName, year) {
        try {
            // D'abord trouver le client
            const client = await ClientsAPI.getByName(clientName);
            if (!client) {
                console.log(`Client ${clientName} non trouvé`);
                return null;
            }

            // Puis chercher la grille
            const { data, error } = await supabase
                .from('grilles')
                .select('*')
                .eq('client_id', client.id)
                .eq('year', year)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // Pas de grille trouvée, c'est normal
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

    // Créer une nouvelle grille
    static async create(clientName, year, data, tva = 10.0) {
        try {
            const user = await Auth.getCurrentUser();
            
            // Trouver le client
            let client = await ClientsAPI.getByName(clientName);
            
            // Si le client n'existe pas, le créer
            if (!client) {
                client = await ClientsAPI.create(clientName);
            }

            const { data: result, error } = await supabase
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

    // Mettre à jour une grille existante
    static async update(clientName, year, data, tva) {
        try {
            const user = await Auth.getCurrentUser();
            
            // Trouver le client
            const client = await ClientsAPI.getByName(clientName);
            if (!client) {
                throw new Error(`Client ${clientName} non trouvé`);
            }

            const { data: result, error } = await supabase
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

    // Sauvegarder (créer ou mettre à jour)
    static async save(clientName, year, data, tva) {
        try {
            // Vérifier si la grille existe
            const existing = await this.getOne(clientName, year);
            
            if (existing) {
                // Mise à jour
                return await this.update(clientName, year, data, tva);
            } else {
                // Création
                return await this.create(clientName, year, data, tva);
            }
        } catch (error) {
            console.error('Erreur save grille:', error);
            throw error;
        }
    }

    // Dupliquer une grille (pour une nouvelle année)
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

    // Lister toutes les grilles d'un client
    static async getAllForClient(clientName) {
        try {
            const client = await ClientsAPI.getByName(clientName);
            if (!client) return [];

            const { data, error } = await supabase
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

    // Supprimer une grille
    static async delete(clientName, year) {
        try {
            const client = await ClientsAPI.getByName(clientName);
            if (!client) return;

            const { error } = await supabase
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
window.supabase = supabase;

console.log('✅ Supabase API chargée - Version 1.0');
