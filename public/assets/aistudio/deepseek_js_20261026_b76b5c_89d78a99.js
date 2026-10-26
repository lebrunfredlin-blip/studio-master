// ⭐ Tutoriel jeu vidéo + bulles d'aide
try { attachTourEvents(); } catch(e){ consoleLog('error','INIT','attachTourEvents : ' + e.message); }
try { attachHelpEvents(); } catch(e){ consoleLog('error','INIT','attachHelpEvents : ' + e.message); }

// Lancer le tutoriel après un petit délai
setTimeout(() => {
  try { initTour(); } catch(e){ consoleLog('error','INIT','initTour : ' + e.message); }
}, 1000);