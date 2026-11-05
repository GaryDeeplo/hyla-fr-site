<?php
/*
 * hyla.fr — formulaire de contact (PHP 7.4 compatible, hébergement mutualisé OVH).
 *
 * Chaque demande valide est :
 *   1. ajoutée au registre _demandes/demandes.log (dossier fermé au web) : aucune demande perdue
 *      même si l'envoi d'e-mail échoue ;
 *   2. envoyée par e-mail au destinataire : en SMTP authentifié si _demandes/smtp.php existe
 *      (OVH bloque progressivement mail() non authentifié), sinon par mail().
 *
 * _demandes/smtp.php (non versionné) :
 *   <?php return ['host' => 'ssl0.ovh.net', 'port' => 465, 'user' => 'contact@hyla.fr', 'pass' => '...'];
 */

const DESTINATAIRE = 'info@hyla-est.fr';
const EXPEDITEUR = 'noreply@hyla.fr';        // domaine attaché à l'hébergement (règle OVH)
const NOM_EXPEDITEUR = 'Site hyla.fr';

$dossier = __DIR__ . '/_demandes';
$retour = function ($etat) {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') || (($_SERVER['SERVER_PORT'] ?? '') == 443);
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $hote = preg_replace('/[^A-Za-z0-9.\-:]/', '', $_SERVER['HTTP_HOST'] ?? 'www.hyla.fr');
    header('Location: ' . ($https ? 'https' : 'http') . '://' . $hote . $base . '/contact/?envoi=' . $etat . '#formulaire', true, 303);
    exit;
};

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    $retour('erreur');
}

$champ = function ($nom, $max) {
    $v = isset($_POST[$nom]) ? (string) $_POST[$nom] : '';
    $v = trim(str_replace("\0", '', $v));
    if (function_exists('mb_substr')) {
        $v = mb_substr($v, 0, $max, 'UTF-8');
    } else {
        $v = substr($v, 0, $max);
    }
    return $v;
};
$ligne = function ($v) { return trim(preg_replace('/[\r\n\t]+/', ' ', $v)); };

// Robots : seul le champ piège rempli rejette la demande (réponse neutre). Un envoi trop rapide ou sans
// JavaScript (durée absente) est gardé mais marqué « à vérifier » : aucune vraie demande n'est perdue.
if ($champ('site_web', 200) !== '') {
    $retour('ok');
}
$duree = (int) ($_POST['duree'] ?? 0);
$suspect = $duree < 3000;

$d = [
    'nom' => $ligne($champ('nom', 80)),
    'prenom' => $ligne($champ('prenom', 80)),
    'ville' => $ligne($champ('ville', 80)),
    'departement' => $ligne($champ('departement', 40)),
    'telephone' => $ligne($champ('telephone', 30)),
    'email' => $ligne($champ('email', 120)),
    'interet' => $champ('interet', 20) === 'carriere' ? 'Carrière' : 'Produit',
    'message' => $champ('message', 4000),
];
$consent = ($_POST['consentement'] ?? '') === 'oui';
foreach ($d as $v) {
    if ($v === '') { $retour('erreur'); }
}
if (!$consent || !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
    $retour('erreur');
}

// 1. Registre (une ligne JSON par demande)
if (!is_dir($dossier)) {
    @mkdir($dossier, 0750, true);
}
if (!is_file($dossier . '/.htaccess')) {
    @file_put_contents($dossier . '/.htaccess', "Require all denied\n");
}
$entree = $d + ['date' => date('c'), 'ip' => $_SERVER['REMOTE_ADDR'] ?? '', 'a_verifier' => $suspect, 'envoi' => ''];

// 2. E-mail
$sujet = '[hyla.fr]' . ($suspect ? ' [à vérifier]' : '') . ' Demande ' . ($d['interet'] === 'Carrière' ? 'carrière' : 'produit / démonstration') . ' — ' . $d['prenom'] . ' ' . $d['nom'];
$corps = "Nouvelle demande depuis le formulaire de contact de hyla.fr\n\n"
    . "Nom : {$d['nom']}\nPrénom : {$d['prenom']}\nVille : {$d['ville']}\nDépartement : {$d['departement']}\n"
    . "Téléphone : {$d['telephone']}\nE-mail : {$d['email']}\nCentre d'intérêt : {$d['interet']}\n\n"
    . "Message :\n{$d['message']}\n\n— Consentement à la politique de confidentialité : oui\n";

$sujetEnc = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($sujet, 'UTF-8', 'B', "\r\n") : '=?UTF-8?B?' . base64_encode($sujet) . '?=';
$nomExp = '=?UTF-8?B?' . base64_encode(NOM_EXPEDITEUR) . '?=';
$entetes = [
    'From' => $nomExp . ' <' . EXPEDITEUR . '>',
    'Reply-To' => $d['email'],
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'X-Mailer' => 'hyla.fr',
];

$smtpConf = $dossier . '/smtp.php';
$ok = false;
if (is_file($smtpConf)) {
    $c = include $smtpConf;
    $ok = envoyer_smtp($c, DESTINATAIRE, $sujetEnc, $entetes, $corps);
    $entree['envoi'] = $ok ? 'smtp' : 'smtp-echec';
}
if (!$ok) {
    $h = '';
    foreach ($entetes as $k => $v) { $h .= $k . ': ' . $v . "\r\n"; }
    $ok = @mail(DESTINATAIRE, $sujetEnc, $corps, $h, '-f' . EXPEDITEUR);
    $entree['envoi'] .= ($entree['envoi'] ? ' + ' : '') . ($ok ? 'mail' : 'mail-echec');
}

@file_put_contents($dossier . '/demandes.log', json_encode($entree, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
// La demande est enregistrée : le visiteur voit un succès même si l'e-mail a échoué (relevé dans le registre).
$retour('ok');

function envoyer_smtp($c, $a, $sujetEnc, $entetes, $corps)
{
    $hote = ($c['port'] == 465 ? 'ssl://' : '') . $c['host'];
    $s = @stream_socket_client($hote . ':' . $c['port'], $errno, $errstr, 15);
    if (!$s) { return false; }
    stream_set_timeout($s, 15);
    $lire = function () use ($s) {
        $r = '';
        while (($l = fgets($s, 515)) !== false) { $r .= $l; if (isset($l[3]) && $l[3] === ' ') { break; } }
        return $r;
    };
    $cmd = function ($ligne, $attendu) use ($s, $lire) {
        fwrite($s, $ligne . "\r\n");
        return strpos($lire(), (string) $attendu) === 0;
    };
    $ok = strpos($lire(), '220') === 0
        && $cmd('EHLO hyla.fr', 250)
        && $cmd('AUTH LOGIN', 334)
        && $cmd(base64_encode($c['user']), 334)
        && $cmd(base64_encode($c['pass']), 235)
        && $cmd('MAIL FROM:<' . $c['user'] . '>', 250)
        && $cmd('RCPT TO:<' . $a . '>', 250)
        && $cmd('DATA', 354);
    if ($ok) {
        $entetes['From'] = preg_replace('/<[^>]+>/', '<' . $c['user'] . '>', $entetes['From']);
        $msg = 'To: ' . $a . "\r\nSubject: " . $sujetEnc . "\r\nDate: " . date('r') . "\r\n";
        foreach ($entetes as $k => $v) { $msg .= $k . ': ' . $v . "\r\n"; }
        $msg .= "\r\n" . preg_replace('/^\./m', '..', str_replace("\n", "\r\n", str_replace("\r\n", "\n", $corps)));
        $ok = $cmd($msg . "\r\n.", 250);
    }
    @fwrite($s, "QUIT\r\n");
    fclose($s);
    return $ok;
}
