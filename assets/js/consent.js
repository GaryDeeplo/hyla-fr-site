/* hyla.fr — consentement cookies (CookieConsent 3.3, MIT, hébergé dans assets/vendor) et Google Analytics 4.
   GA (G-NV2BBFCT5L, propriété de l'ancien site : l'historique continue) ne se charge qu'après « Accepter »,
   et seulement sur hyla.fr en production (pas sur apercu.hyla.fr ni en local). Refuser ou retirer son accord
   efface les cookies _ga et recharge la page. Choix conservé 6 mois (recommandation CNIL). */
(function () {
  var GA = 'G-NV2BBFCT5L';
  var hote = window.location.hostname;
  var PROD = hote === 'www.hyla.fr' || hote === 'hyla.fr';
  var script = document.currentScript;
  var confidentialite = (script && script.getAttribute('data-confidentialite')) || '/politique-de-confidentialite/';
  var gaCharge = false;

  function chargerGA() {
    if (gaCharge || !PROD) return;
    gaCharge = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
    document.head.appendChild(s);
  }
  function appliquer() { if (window.CookieConsent.acceptedCategory('analytics')) chargerGA(); }

  if (!window.CookieConsent) return;
  window.CookieConsent.run({
    cookie: { name: 'cc_cookie', expiresAfterDays: 182 },
    guiOptions: {
      consentModal: { layout: 'box', position: 'bottom left', equalWeightButtons: true, flipButtons: false },
      preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false }
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: { autoClear: { cookies: [{ name: /^_ga/ }, { name: '_gid' }], reloadPage: true } }
    },
    onConsent: appliquer,
    onChange: appliquer,
    language: {
      default: 'fr',
      translations: {
        fr: {
          consentModal: {
            title: 'Mesure d’audience',
            description: 'Avec votre accord, nous utilisons Google Analytics pour savoir comment le site est consulté et l’améliorer. Vous pouvez changer d’avis à tout moment avec le lien « Gestion des cookies » en bas de page.',
            acceptAllBtn: 'Accepter',
            acceptNecessaryBtn: 'Refuser',
            showPreferencesBtn: 'Personnaliser',
            footer: '<a href="' + confidentialite + '">Politique de confidentialité</a>'
          },
          preferencesModal: {
            title: 'Gestion des cookies',
            acceptAllBtn: 'Tout accepter',
            acceptNecessaryBtn: 'Tout refuser',
            savePreferencesBtn: 'Enregistrer mes choix',
            closeIconLabel: 'Fermer',
            sections: [
              {
                title: 'Votre choix',
                description: 'Les cookies de mesure d’audience ne sont déposés qu’avec votre accord. Refuser n’a aucune incidence sur votre visite.'
              },
              {
                title: 'Indispensables',
                description: 'Un seul cookie, « cc_cookie », conserve votre choix pendant 6 mois. Il ne sert à rien d’autre.',
                linkedCategory: 'necessary'
              },
              {
                title: 'Mesure d’audience (Google Analytics)',
                description: 'Statistiques de fréquentation : pages vues, durée de visite, provenance. Fournisseur : Google Ireland Limited. Cookies « _ga » et « _ga_* », conservés 13 mois au plus.',
                linkedCategory: 'analytics'
              },
              {
                title: 'En savoir plus',
                description: 'Voir notre <a href="' + confidentialite + '">politique de confidentialité</a>.'
              }
            ]
          }
        }
      }
    }
  });
})();
