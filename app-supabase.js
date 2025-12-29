// app-supabase.js
// Logique Supabase séparée

console.log('📦 app-supabase.js chargé');

// ========================================
// AUTHENTIFICATION
// ========================================
window.addEventListener('DOMContentLoaded', async function() {
  await new Promise(r => setTimeout(r, 1000));
  
  if (typeof Auth !== 'undefined') {
    const ok = await Auth.isAuthenticated();
    if (!ok) {
      console.log('❌ Non authentifié, redirection...');
      window.location.href = 'login.html';
      return;
    }
    console.log('✅ Authentifié');
    updateStatusIndicator('local');
  } else {
    console.warn('⚠️ Auth non disponible (mode local)');
  }
});

// Fonction logout
async function handleLogout() {
  if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
    if (typeof Auth !== 'undefined') {
      await Auth.logout();
    } else {
      window.location.href = 'login.html';
    }
  }
}

// ========================================
// INDICATEUR DE STATUT
// ========================================
function createStatusIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'status-indicator';
  indicator.style.cssText = 'position:fixed;top:80px;right:40px;display:flex;align-items:center;gap:8px;padding:8px 12px;background:white;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.1);font-size:12px;z-index:998;';
  indicator.innerHTML = '<div id="status-dot" style="width:8px;height:8px;border-radius:50%;background:#999;"></div><span id="status-text">Init...</span>';
  document.body.appendChild(indicator);
}

function updateStatusIndicator(status) {
  let dot = document.getElementById('status-dot');
  let text = document.getElementById('status-text');
  
  if (!dot || !text) {
    createStatusIndicator();
    dot = document.getElementById('status-dot');
    text = document.getElementById('status-text');
  }
  
  switch(status) {
    case 'cloud':
      dot.style.background = '#10b981';
      text.textContent = '☁️ Cloud';
      break;
    case 'local':
      dot.style.background = '#f59e0b';
      text.textContent = '💾 Local';
      break;
    case 'error':
      dot.style.background = '#ef4444';
      text.textContent = '⚠️ Erreur';
      break;
  }
}

window.addEventListener('DOMContentLoaded', function() {
  setTimeout(createStatusIndicator, 500);
});

// ========================================
// SAUVEGARDE HYBRIDE
// ========================================
// Wrapper de la fonction saveData
(function() {
  let attempts = 0;
  const maxAttempts = 10;
  
  function wrapSaveData() {
    if (typeof window.saveData === 'function') {
      console.log('✅ saveData trouvée, wrapping...');
      
      const originalSaveData = window.saveData;
      
      window.saveData = async function() {
        // 1. Sauvegarder en local d'abord
        if (typeof originalSaveData === 'function') {
          originalSaveData.call(this);
        }
        
        // 2. Tenter Supabase
        try {
          if (typeof GrillesAPI !== 'undefined' && 
              typeof getCurrentClient === 'function' && 
              typeof getCurrentYear === 'function') {
            
            const client = getCurrentClient();
            const year = getCurrentYear();
            const tva = parseFloat(document.getElementById('tva')?.value) || 10.0;
            
            const data = {
              destinations: window.destinations || [],
              transferts: window.transferts || [],
              majorations: document.getElementById('conditionsText')?.value || ''
            };
            
            await GrillesAPI.save(client, year, data, tva);
            console.log('☁️ Cloud OK');
            updateStatusIndicator('cloud');
          } else {
            updateStatusIndicator('local');
          }
        } catch (error) {
          console.warn('⚠️ Cloud error:', error.message);
          updateStatusIndicator('local');
        }
      };
      
    } else {
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`⏳ saveData pas encore définie, retry ${attempts}/${maxAttempts}...`);
        setTimeout(wrapSaveData, 1000);
      } else {
        console.warn('⚠️ saveData jamais trouvée');
      }
    }
  }
  
  // Démarrer après chargement
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(wrapSaveData, 2000);
  });
})();

console.log('✅ app-supabase.js initialisé');
