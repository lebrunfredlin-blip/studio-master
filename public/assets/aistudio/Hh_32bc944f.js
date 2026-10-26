const done = state.videos.filter(v => v.status === 'done').length;
consoleLog('success','TERMINÉ', done + '/' + script.scenes.length + ' vidéos prêtes');
setStatus('✦ Terminé — ' + done + '/' + script.scenes.length + ' vidéos ✦');
await sleep(2500);
setStatus(null);
showToast(done + ' vidéo(s) générée(s) ✓', 'success', 3000);

// ⭐ Notification de fin
try {
  if(window.__SM.notifyGenerationComplete && done > 0){
    window.__SM.notifyGenerationComplete(done);
  }
} catch(e){ consoleLog('warn','NOTIF', e.message); }