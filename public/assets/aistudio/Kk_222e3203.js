try { initAssistant(); } catch(e){ consoleLog('error','INIT','initAssistant : ' + e.message); }
try { attachAssistantEvents(); } catch(e){ consoleLog('error','INIT','attachAssistantEvents : ' + e.message); }

// ⭐ Avertir si fermeture pendant une génération
window.addEventListener('beforeunload', (e) => {
  if(state.isRunning){
    e.preventDefault();
    e.returnValue = 'Une génération est en cours. Si vous quittez, elle sera perdue.';
    return e.returnValue;
  }
});

// ⭐ Arrêter le clignotement au premier clic
document.addEventListener('click', () => {
  if(window.__SM.stopTitleBlink) window.__SM.stopTitleBlink();
});