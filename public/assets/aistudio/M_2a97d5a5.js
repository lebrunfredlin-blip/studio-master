state.isRunning = false;
state.stopRequested = false;
$('stop-floating').classList.remove('visible');
document.body.classList.remove('has-floating-btn');
updateLaunchButton();
await deactivateWakeLock();