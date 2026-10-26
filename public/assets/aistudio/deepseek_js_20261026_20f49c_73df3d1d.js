// ══════════════════════════════════════════════════════════════════
// TUTORIEL JEU VIDÉO — Étapes d'accueil
// ══════════════════════════════════════════════════════════════════
const TUTORIAL_STORAGE = 'studio_master_tour_v52';

const TOUR_STEPS = [
  {
    icon: '✏️',
    title: 'Écris ton idée',
    text: 'Commence par décrire <strong>ce que tu veux raconter</strong>. Un personnage, un lieu, une action. Sois précis, l\'IA fera le reste.',
    targetId: 'subject-input',
    arrowDirection: 'down'
  },
  {
    icon: '🎨',
    title: 'Choisis un style',
    text: 'Tu as <strong>90 styles</strong> disponibles. TikTok pour du court, Films pour du long. Clique sur celui qui te plaît.',
    targetId: 'mode-categories',
    arrowDirection: 'down'
  },
  {
    icon: '▶️',
    title: 'Lance la génération',
    text: 'Appuie sur <strong>le bouton flottant en bas</strong>. L\'IA écrit le scénario, dessine les images et crée les vidéos en 3 à 10 minutes.',
    targetId: 'launch-floating',
    arrowDirection: 'down'
  },
  {
    icon: '🤖',
    title: 'Besoin d\'aide ?',
    text: 'Clique sur <strong>la bulle Assistant</strong> en bas à droite. Il répond à toutes tes questions sur l\'app.',
    targetId: 'assistant-bubble',
    arrowDirection: 'down'
  }
];

let tourCurrentStep = 0;

function positionTourElements(targetEl){
  if(!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const spotlight = $('tour-spotlight');
  const arrow = $('tour-arrow');

  if(spotlight){
    const padding = 8;
    spotlight.style.top = (rect.top - padding) + 'px';
    spotlight.style.left = (rect.left - padding) + 'px';
    spotlight.style.width = (rect.width + padding * 2) + 'px';
    spotlight.style.height = (rect.height + padding * 2) + 'px';
    spotlight.classList.add('visible');
  }

  if(arrow){
    const arrowSize = 60;
    arrow.style.top = (rect.bottom + 8) + 'px';
    arrow.style.left = (rect.left + rect.width/2 - arrowSize/2) + 'px';
    arrow.textContent = '👆';
    arrow.classList.add('visible');
  }
}

function showTourStep(step){
  const data = TOUR_STEPS[step];
  if(!data) return;

  const target = $(data.targetId);
  if(!target){ nextTourStep(); return; }

  // Mettre à jour le contenu de la carte
  const badge = $('tour-step-badge');
  const icon = $('tour-icon');
  const title = $('tour-title');
  const text = $('tour-text');
  const prevBtn = $('tour-btn-prev');
  const nextBtn = $('tour-btn-next');
  const progress = $('tour-progress');

  if(badge) badge.textContent = 'Étape ' + (step + 1) + '/' + TOUR_STEPS.length;
  if(icon) icon.textContent = data.icon;
  if(title) title.textContent = data.title;
  if(text) text.innerHTML = data.text;
  if(prevBtn) prevBtn.disabled = (step === 0);
  if(nextBtn) nextBtn.textContent = (step === TOUR_STEPS.length - 1) ? 'C\'est parti ! 🚀' : 'Suivant →';

  // Progress dots
  if(progress){
    progress.innerHTML = TOUR_STEPS.map((_, i) => {
      const cls = i === step ? 'active' : (i < step ? 'done' : '');
      return '<span class="tour-progress-dot ' + cls + '"></span>';
    }).join('');
  }

  // Scroll vers la cible
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Attendre le scroll puis positionner
  setTimeout(() => positionTourElements(target), 500);
}

function nextTourStep(){
  if(tourCurrentStep < TOUR_STEPS.length - 1){
    tourCurrentStep++;
    showTourStep(tourCurrentStep);
  } else {
    closeTour();
  }
}

function prevTourStep(){
  if(tourCurrentStep > 0){
    tourCurrentStep--;
    showTourStep(tourCurrentStep);
  }
}

function closeTour(){
  const overlay = $('tour-overlay');
  const cardOverlay = $('tour-card-overlay');
  const spotlight = $('tour-spotlight');
  const arrow = $('tour-arrow');
  if(overlay) overlay.classList.remove('visible');
  if(cardOverlay) cardOverlay.classList.remove('visible');
  if(spotlight) spotlight.classList.remove('visible');
  if(arrow) arrow.classList.remove('visible');
  safeLocalStorage.set(TUTORIAL_STORAGE, '1');
  consoleLog('info','TUTORIEL','Terminé');
}

function initTour(){
  const seen = safeLocalStorage.get(TUTORIAL_STORAGE);
  if(seen === '1') return;

  // Attendre que la page soit rendue
  setTimeout(() => {
    tourCurrentStep = 0;

    const overlay = $('tour-overlay');
    const cardOverlay = $('tour-card-overlay');
    if(overlay) overlay.classList.add('visible');
    if(cardOverlay) cardOverlay.classList.add('visible');

    showTourStep(0);
  }, 800);
}

function attachTourEvents(){
  const nextBtn = $('tour-btn-next');
  if(nextBtn) nextBtn.addEventListener('click', nextTourStep);
  const prevBtn = $('tour-btn-prev');
  if(prevBtn) prevBtn.addEventListener('click', prevTourStep);
  const skipBtn = $('tour-skip-btn');
  if(skipBtn) skipBtn.addEventListener('click', closeTour);

  // Repositionner au resize/scroll
  window.addEventListener('resize', () => {
    if(tourCurrentStep >= 0 && $('tour-spotlight')?.classList.contains('visible')){
      const target = $(TOUR_STEPS[tourCurrentStep].targetId);
      if(target) positionTourElements(target);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// BULLES D'AIDE CONTEXTUELLES
// ══════════════════════════════════════════════════════════════════
const HELP_CONTENT = {
  subject: {
    icon: '✏️',
    title: 'Le sujet',
    body: 'C\'est <strong>l\'idée de ton histoire</strong>. Décris un personnage, un lieu, une action. Plus c\'est précis, meilleur sera le résultat. <br><br>❌ À éviter : "une vidéo sympa"<br>✅ À faire : "Un chaton astronaute découvre une planète pastel"',
    example: 'Ex : "La campagne municipale de La France insoumise à Roubaix" ou "Un chaton détective enquête dans un Paris rétrofuturiste".'
  },
  style: {
    icon: '🎨',
    title: 'Les styles',
    body: 'Il y a <strong>90 styles</strong> au total :<br>• <strong>📱 TikTok</strong> = 3 scènes × 15s (format court)<br>• <strong>🎬 Films & Séries</strong> = 6 à 10 scènes × 8s (format long)<br><br>Chaque style a son ambiance visuelle unique (Wes Anderson, Cyberpunk, Film Noir…).',
    example: 'Pour un test rapide → TikTok. Pour une vraie histoire → Films & Séries.'
  },
  script: {
    icon: '📜',
    title: 'Le scénario',
    body: 'Une fois la génération lancée, l\'IA écrit d\'abord <strong>l\'histoire complète</strong> : un titre, une accroche, des personnages et des scènes. Tu peux voir le détail en cliquant sur "Voir le détail des scènes".',
    example: 'Chaque scène contient : décor, personnage, dialogue FR, mouvement de caméra.'
  },
  videos: {
    icon: '🎞️',
    title: 'Les vidéos',
    body: 'Une fois les scènes générées, tu vois chaque vidéo apparaître avec un <strong>bouton vert "Télécharger"</strong>. Tu peux aussi tout télécharger en une fois avec le bouton "Tout télécharger (ZIP)" en bas.',
    example: 'Les vidéos sont en MP4, lisibles partout (téléphone, ordinateur, tablette).'
  },
  account: {
    icon: '🔗',
    title: 'Le compte IA',
    body: 'Pour que l\'IA puisse générer tes vidéos, elle a besoin d\'une <strong>autorisation gratuite</strong>. C\'est ce qu\'on appelle un "compte IA" (ou clé API).<br><br>1. Clique sur "Créer un compte gratuit"<br>2. Inscris-toi sur platform.agnes-ai.com<br>3. Copie ton code de connexion (sk-...)<br>4. Colle-le ici et clique "Connecter"',
    example: 'Tu ne le fais qu\'une seule fois. Ensuite, toutes les générations sont automatiques.'
  },
  params: {
    icon: '⚙️',
    title: 'Paramètres avancés',
    body: 'Ces réglages contrôlent <strong>le nombre de scènes et leur durée</strong>. Laisse les valeurs par défaut pour un résultat optimal. Si tu changes, sache que :<br>• Plus de scènes = plus long à générer<br>• Scènes plus longues = plus immersif',
    example: 'Par défaut : 3 scènes × 8s pour TikTok, 10 scènes × 8s pour Films.'
  }
};

function openHelpPopover(key, anchorEl){
  const data = HELP_CONTENT[key];
  if(!data) return;

  const popover = $('help-popover');
  const title = $('help-popover-title');
  const body = $('help-popover-body');
  const example = $('help-popover-example');

  if(!popover) return;

  if(title) title.innerHTML = data.icon + ' ' + data.title;
  if(body) body.innerHTML = data.body;
  if(example){
    if(data.example){
      example.textContent = data.example;
      example.style.display = 'block';
    } else {
      example.style.display = 'none';
    }
  }

  // Positionner le popover près de l'ancre
  if(anchorEl){
    const rect = anchorEl.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top = rect.bottom + 8;
    let left = rect.left + rect.width/2 - 170; // centré sur l'ancre

    // Ajuster si dépasse à droite
    if(left + 340 > viewportW - 16) left = viewportW - 340 - 16;
    if(left < 16) left = 16;

    // Ajuster si dépasse en bas
    if(top + 200 > viewportH - 16){
      top = rect.top - 200 - 8;
    }

    popover.style.top = top + 'px';
    popover.style.left = left + 'px';
  }

  popover.classList.add('visible');
}

function closeHelpPopover(){
  const popover = $('help-popover');
  if(popover) popover.classList.remove('visible');
}

function attachHelpEvents(){
  // Boutons "?"
  document.querySelectorAll('[data-help]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.help;
      const popover = $('help-popover');
      if(popover && popover.classList.contains('visible')){
        closeHelpPopover();
      } else {
        openHelpPopover(key, btn);
      }
    });
  });

  // Fermer au clic ailleurs
  document.addEventListener('click', (e) => {
    const popover = $('help-popover');
    if(!popover || !popover.classList.contains('visible')) return;
    if(popover.contains(e.target)) return;
    if(e.target.closest && e.target.closest('[data-help]')) return;
    closeHelpPopover();
  });

  // Bouton fermer
  const closeBtn = $('help-popover-close');
  if(closeBtn) closeBtn.addEventListener('click', closeHelpPopover);

  // Échap
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeHelpPopover();
  });
}

// Exposer pour le bloc 3
window.__SM.initTour = initTour;
window.__SM.attachTourEvents = attachTourEvents;
window.__SM.closeTour = closeTour;
window.__SM.attachHelpEvents = attachHelpEvents;
window.__SM.openHelpPopover = openHelpPopover;
window.__SM.closeHelpPopover = closeHelpPopover;