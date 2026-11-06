/* hyla.fr — menu mobile, apparitions au défilement, accroches qui glissent (comme hyla.com). */
(function () {
  document.documentElement.classList.add('js');

  // Menu burger (< 992 px)
  var header = document.querySelector('.hy-header');
  var burger = header && header.querySelector('.hy-burger');
  if (burger) {
    var label = burger.querySelector('.hy-burger__label');
    var nav = header.querySelector('.hy-nav');
    var autour = document.querySelectorAll('.hy-annonce, main, footer');
    var setMenu = function (open) {
      header.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? 'Fermer' : 'Menu';
      // Le menu commence sous le bouton (le bandeau de publication peut le décaler) ; le reste de la page devient inerte
      if (open) nav.style.paddingTop = Math.round(burger.getBoundingClientRect().bottom + 32) + 'px';
      autour.forEach(function (el) { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
      if (open) { var premier = nav.querySelector('a'); if (premier) premier.focus(); } else if (header.contains(document.activeElement) || !document.activeElement || document.activeElement === document.body) burger.focus();
    };
    burger.addEventListener('click', function () { setMenu(!header.classList.contains('open')); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && header.classList.contains('open')) setMenu(false); });
    window.matchMedia('(min-width: 992px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Apparitions au défilement : les cibles sont choisies ici (pas de classe à poser à la main dans les pages).
  // Ordre de priorité : listes (cascade), médias (ouverture), accroches (fondu), titres (flou), textes.
  // Exclus : hero et en-tête de page (animés à l'entrée), texte du jugement (lecture), en-tête et pied de page.
  var REGLES = [
    ['.hy-tiles > li, .hy-facts > li, .hy-avis > li, .hy-checks > li, .hy-press > li, .hy-certs > li, .hy-news > li', 'item'],
    ['.hy-edito__media, .hy-video, .hy-feature', 'media'],
    ['.hy-edito__accroche', 'fondu'],
    ['main h2, .hy-quote', 'titre'],
    ['.hy-lead, .hy-edito__text, .hy-edito__content > .hy-btn, .hy-publi__head > :not(h2), .hy-publi__card, .hy-cta, .hy-quote-by, '
      + '.hy-contact__infos > :not(h2), .hy-form, .hy-avis-note, .hy-video-note, .hy-prose > :not(h2), .hy-article__aside, '
      + 'main .hy-section .hy-wrap > .hy-btn, .hy-split > div > .hy-btn, .hy-certs + .hy-btn, .hy-press + .hy-btn', 'texte']
  ];
  var EXCLUS = '.hy-hero, .hy-pagehead, .hy-legal, header, footer';
  var cibles = [];
  REGLES.forEach(function (r) {
    document.querySelectorAll(r[0]).forEach(function (el) {
      if (el.hasAttribute('data-anim') || el.closest(EXCLUS)) return;
      var p = el.parentElement;
      while (p && p !== document.body) { if (p.hasAttribute('data-anim')) return; p = p.parentElement; }
      el.setAttribute('data-anim', r[1]);
      cibles.push(el);
    });
  });
  // Cascade : rang parmi les frères animés du même parent (plafonné pour ne jamais faire attendre)
  cibles.forEach(function (el) {
    var freres = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-anim'); });
    var i = freres.indexOf(el);
    if (i > 0) el.style.setProperty('--i', Math.min(i, el.getAttribute('data-anim') === 'item' ? 5 : 3));
  });
  var arriver = function (el) {
    el.classList.add('is-in');
    window.setTimeout(function () { el.classList.add('is-fini'); }, 1800 + 90 * (parseInt(el.style.getPropertyValue('--i'), 10) || 0));
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { arriver(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    cibles.forEach(function (el) { io.observe(el); });
  } else {
    cibles.forEach(arriver);
  }

  // Grandes accroches corail : glissent à l'horizontale au défilement (≥ 1200 px)
  var large = window.matchMedia('(min-width: 1200px)');
  var accroches = Array.prototype.map.call(document.querySelectorAll('.hy-edito__accroche'), function (el) {
    var s = el.closest('.hy-edito');
    return { el: el, sens: s && s.classList.contains('hy-edito--img-right') ? -1 : 1 };
  });
  var attente = false;
  function maj() {
    attente = false;
    var actif = large.matches && !reduit.matches;
    var vh = window.innerHeight, amp = window.innerWidth * 0.3;
    accroches.forEach(function (a) {
      if (!actif) { a.el.style.transform = ''; return; }
      var r = a.el.getBoundingClientRect();
      var e = (0.6 * vh - (r.top + r.height / 2)) / (vh + r.height);
      e = Math.min(0.6, Math.max(-0.6, e));
      a.el.style.transform = 'translate3d(' + (e * 2 * amp * a.sens).toFixed(1) + 'px,0,0)';
    });
  }
  function demander() { if (!attente) { attente = true; window.requestAnimationFrame(maj); } }
  if (accroches.length) {
    window.addEventListener('scroll', demander, { passive: true });
    window.addEventListener('resize', demander);
    maj();
  }

  // Pied de page façon hyla.com (repères ScrollTrigger de leur site, sans GSAP) : en arrivant en bas de page,
  // les colonnes descendent de 300 px en passant de 90 à 100 %, le grand logotype de 900 px (400 px sur
  // téléphone), la ligne du bas de 50 px ; le fond coupe ce qui dépasse.
  var pied = document.querySelector('[data-hf]');
  if (pied) {
    var grand = window.matchMedia('(min-width: 992px)');
    var borne = function (v) { return Math.min(1, Math.max(0, v)); };
    var lisse = function (p) { return 1 - (1 - p) * (1 - p); }; // « power1.out » de GSAP
    var poser = function (liste, y, e) {
      liste.forEach(function (el) { el.style.transform = (y === 0 && e === 1) ? '' : 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + e.toFixed(4) + ')'; });
    };
    var a1 = pied.querySelectorAll('.hf-ani-1'), a2 = pied.querySelectorAll('.hf-ani-2'), a3 = pied.querySelectorAll('.hf-ani-3');
    var attPied = false;
    var majPied = function () {
      attPied = false;
      if (reduit.matches) { poser(a1, 0, 1); poser(a2, 0, 1); poser(a3, 0, 1); return; }
      var vh = window.innerHeight, r = pied.getBoundingClientRect(), h = Math.max(1, r.height);
      var p1 = lisse(borne((0.7 * vh - r.top) / (0.7 * vh)));
      var p3 = lisse(borne((0.1 * vh - r.top) / Math.max(1, h - 0.9 * vh)));
      if (grand.matches) {
        poser(a1, -300 * (1 - p1), 0.9 + 0.1 * p1);
        poser(a2, -900 * (1 - lisse(borne((vh - r.top) / h))), 0.9 + 0.1 * lisse(borne((vh - r.top) / h)));
      } else {
        poser(a1, -300 * (1 - p1), 1);
        poser(a2, -400 * (1 - lisse(borne((0.8 * vh - r.top) / Math.max(1, h - 0.2 * vh)))), 1);
      }
      poser(a3, -50 * (1 - p3), 1);
    };
    var demPied = function () { if (!attPied) { attPied = true; window.requestAnimationFrame(majPied); } };
    window.addEventListener('scroll', demPied, { passive: true });
    window.addEventListener('resize', demPied);
    majPied();
  }

  // Vidéos YouTube : l'iframe (youtube-nocookie) n'est chargée qu'au clic
  document.querySelectorAll('[data-youtube]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-youtube') + '?autoplay=1&rel=0';
      f.title = b.getAttribute('data-titre') || 'Vidéo';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      var cadre = document.createElement('div');
      cadre.className = 'hy-video';
      cadre.appendChild(f);
      b.replaceWith(cadre);
    });
  });

  // « Copier l'adresse » (messageries en ligne : le lien mailto n'ouvre rien)
  document.querySelectorAll('[data-copier]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ok = function () { b.textContent = 'Adresse copiée'; b.setAttribute('data-copie', ''); window.setTimeout(function () { b.textContent = 'Copier l’adresse'; b.removeAttribute('data-copie'); }, 2500); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute('data-copier')).then(ok, function () {});
    });
  });
})();
