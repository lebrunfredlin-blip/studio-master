if(state.isRunning) btn.textContent = '⏳ Génération en cours…';
else if(!hasKey) btn.textContent = '🔗 Connectez votre compte IA';
else if(!hasMode) btn.textContent = '🎯 Choisissez un style';
else if(!hasSubject) btn.textContent = '💡 Décrivez votre sujet';
else btn.textContent = '▶ Lancer la génération';