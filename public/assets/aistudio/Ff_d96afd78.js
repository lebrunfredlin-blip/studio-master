// ══════════════════════════════════════════════════════════════════
// NOTIFICATION DE FIN
// ══════════════════════════════════════════════════════════════════
let titleBlinkInterval = null;
const originalTitle = document.title;

function startTitleBlink(count){
  if(titleBlinkInterval) return;
  let show = true;
  titleBlinkInterval = setInterval(() => {
    document.title = show ? '🎉 ' + count + ' vidéo(s) prête(s) !' : originalTitle;
    show = !show;
  }, 1000);
}

function stopTitleBlink(){
  if(titleBlinkInterval){
    clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
    document.title = originalTitle;
  }
}

function playSuccessSound(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.frequency.value = 1320; osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc2.start(); osc2.stop(ctx.currentTime + 0.4);
    }, 200);
  } catch(e){}
}

async function requestNotificationPermission(){
  if(!('Notification' in window)) return false;
  if(Notification.permission === 'granted') return true;
  if(Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch(e){ return false; }
}

async function notifyGenerationComplete(count){
  const canNotify = await requestNotificationPermission();
  if(canNotify && document.visibilityState === 'hidden'){
    try {
      new Notification('🎬 Studio Master', {
        body: count + ' vidéo(s) prête(s) à télécharger !',
        tag: 'studio-master-done'
      });
    } catch(e){}
  }
  startTitleBlink(count);
  playSuccessSound();
}

document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible'){
    stopTitleBlink();
  }
});

window.__SM.notifyGenerationComplete = notifyGenerationComplete;
window.__SM.stopTitleBlink = stopTitleBlink;