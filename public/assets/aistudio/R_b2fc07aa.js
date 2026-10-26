const launchBtn = $('launch-floating');
if(launchBtn) launchBtn.addEventListener('click', runPipeline);
const stopBtn = $('stop-floating');
if(stopBtn) stopBtn.addEventListener('click', () => {
  state.stopRequested = true;
  stopTTS();
  consoleLog('warn','ARRÊT','Demandé');
  setStatus('Arrêt en cours…');
});