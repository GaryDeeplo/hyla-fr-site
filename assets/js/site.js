/* hyla.fr — menu mobile, apparitions au défilement, accroches qui glissent (comme hyla.com). */
(function () {
  document.documentElement.classList.add('js');

  // Menu burger (< 992 px)
  var header = document.querySelector('.hy-header');
  var burger = header && header.querySelector('.hy-burger');
  if (burger) {
    var label = burger.querySelector('.hy-burger__label');
    var setMenu = function (open) {
      header.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? 'Fermer' : 'Menu';
    };
    burger.addEventListener('click', function () { setMenu(!header.classList.contains('open')); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 992px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Apparition douce des blocs
  var blocs = document.querySelectorAll('.hy-reveal');
  if ('IntersectionObserver' in window && !reduit.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    blocs.forEach(function (b) { io.observe(b); });
  } else {
    blocs.forEach(function (b) { b.classList.add('is-in'); });
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

  // Formulaire de contact : retour de l'envoi (?envoi=ok|erreur)
  var statut = document.querySelector('[data-form-status]');
  if (statut) {
    var p = new URLSearchParams(window.location.search).get('envoi');
    if (p === 'ok') { statut.hidden = false; statut.className = 'hy-form__status hy-form__status--ok'; statut.textContent = 'Merci, votre message a bien été envoyé. Nous vous recontactons rapidement.'; }
    else if (p === 'erreur') { statut.hidden = false; statut.className = 'hy-form__status hy-form__status--err'; statut.textContent = "Votre message n'a pas pu être envoyé. Vérifiez les champs obligatoires ou écrivez-nous à info@hyla-est.fr."; }
    if (p) statut.scrollIntoView({ block: 'center' });
  }
})();
