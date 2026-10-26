function updateLaunchButton(){
  const btn = $('launch-floating');
  if(!btn) return;
  const hasKey = hasActiveKey();
  const subjectEl = $('subject-input');
  const hasSubject = subjectEl && subjectEl.value.trim().length >= 5;
  const hasMode = !!state.activeMode;

  btn.disabled = !hasKey || !hasSubject || !hasMode || state.isRunning;

  if(state.isRunning){
    btn.classList.remove('visible');
  } else if(!hasKey){
    btn.textContent = '🔗 Connectez votre compte IA';
    btn.classList.add('visible');
  } else if(!hasMode){
    btn.textContent = '🎯 Choisissez un style';
    btn.classList.add('visible');
  } else if(!hasSubject){
    btn.textContent = '💡 Décrivez votre sujet';
    btn.classList.add('visible');
  } else {
    btn.textContent = '▶ Lancer la génération';
    btn.classList.add('visible');
  }
}