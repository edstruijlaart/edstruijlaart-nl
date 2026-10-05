// Toets op de veiligheidslogica van de huiskamerconcert-flow (audit 5 okt 2026: #9, #22, #23, #42, #43).
//
// Draaien:  node scripts/toets-show-veiligheid.mjs     (Node 23.6+ leest TypeScript zelf)
//      of:  npx tsx scripts/toets-show-veiligheid.mjs
//
// Geen netwerk, geen Sanity, geen mail: alleen de pure functies en de mailtemplate.

import {
  escapeHtml,
  binnenAanmeldvenster,
  isGestart,
  isActieveShow,
  magLateHerinneringSturen,
  planHerinneringen,
  geheimKlopt,
  bootlegToken,
  bootlegDownloadPad,
  moderatieToken,
  isGeldigeItemKey,
  isGeldigDocId,
  hashEmail,
  isGastheer,
} from '../src/lib/show-veiligheid.ts';
import { buildReminderEmail } from '../src/lib/email-templates.ts';

let fout = 0;
function toets(label, ok) {
  if (!ok) fout++;
  console.log(`${ok ? 'OK  ' : 'FOUT'} ${label}`);
}

// --- Escaping (#9, #42) ---
toets('escapeHtml maakt tags en quotes onschadelijk',
  escapeHtml(`<a href="https://phish.example">Klik</a> & 'x'`) ===
  '&lt;a href=&quot;https://phish.example&quot;&gt;Klik&lt;/a&gt; &amp; &#39;x&#39;');
toets('escapeHtml van null/undefined is leeg', escapeHtml(null) === '' && escapeHtml(undefined) === '');

const kwaadaardig = '<a href="https://phish.example">Sanity: log opnieuw in</a>';
const mail = buildReminderEmail({
  firstName: kwaadaardig,
  city: 'Vught<script>alert(1)</script>',
  hostName: '<b>Gastheer</b>',
  showSlug: 'vught-2026-03-01',
  showId: 'show-1',
  signupId: 'signup-1',
  bootlegUrl: 'https://cdn.sanity.io/files/x/y/opname.m4a',
  bootlegExpiresAt: '2026-04-01T00:00:00Z',
  email: 'gast@example.test',
  cronSecret: 'test-geheim',
});
toets('mail bevat geen ruwe link uit de voornaam', !mail.html.includes('<a href="https://phish.example"'));
toets('mail bevat de voornaam ge-escaped', mail.html.includes('&lt;a href=&quot;https://phish.example&quot;&gt;'));
toets('mail bevat geen script uit de stad', !mail.html.includes('<script>'));
toets('mail bevat geen <b> uit de gastheernaam', !mail.html.includes('<b>Gastheer</b>'));
toets('mail linkt niet naar de kale CDN-URL', !mail.html.includes('cdn.sanity.io/files'));
toets('mail linkt naar persoonlijke downloadlink',
  mail.html.includes(escapeHtml(bootlegDownloadPad('show-1', 'signup-1', 'test-geheim'))));
toets('onderwerp heeft geen regeleinden',
  !/[\r\n]/.test(buildReminderEmail({ firstName: 'A', city: 'X\r\nBcc: iemand', showSlug: 's' }).subject));
const zonderSignup = buildReminderEmail({ firstName: 'A', city: 'X', showSlug: 's', showId: 'show-1',
  bootlegUrl: 'https://cdn.sanity.io/files/x/y/z.m4a', cronSecret: 'g' });
toets('zonder signupId valt de downloadknop terug op de showpagina',
  zonderSignup.html.includes('https://edstruijlaart.nl/shows/s') && !zonderSignup.html.includes('cdn.sanity.io/files'));

// --- Aanmeldvenster en status (#9, #22) ---
const start = '2026-10-10T20:00:00+02:00';
const t = (iso) => new Date(iso);
toets('aanmelden een uur voor aanvang: nee', !binnenAanmeldvenster(start, t('2026-10-10T19:00:00+02:00')));
toets('aanmelden 10 min voor aanvang: ja (speling)', binnenAanmeldvenster(start, t('2026-10-10T19:50:00+02:00')));
toets('aanmelden tijdens het concert: ja', binnenAanmeldvenster(start, t('2026-10-10T21:30:00+02:00')));
toets('aanmelden 24u20 na aanvang: ja (speling)', binnenAanmeldvenster(start, t('2026-10-11T20:20:00+02:00')));
toets('aanmelden 2 dagen later: nee', !binnenAanmeldvenster(start, t('2026-10-12T20:00:00+02:00')));
toets('aanmelden zonder geldige starttijd: nee', !binnenAanmeldvenster(undefined, t('2026-10-10T21:00:00+02:00')));
toets('gastenboek voor aanvang dicht', !isGestart(start, t('2026-10-09T21:00:00+02:00')));
toets('gastenboek een week later nog open', isGestart(start, t('2026-10-17T21:00:00+02:00')));
toets('draft, live, past en zonder status tellen als actief',
  ['draft', 'live', 'past', undefined].every((status) => isActieveShow({ status })));
toets('archived telt niet als actief', !isActieveShow({ status: 'archived' }) && !isActieveShow(null));
toets('late herinnering pas na de ronde en 12u na aanvang',
  magLateHerinneringSturen({ reminderSent: true, startDateTime: start }, t('2026-10-11T09:00:00+02:00')) &&
  !magLateHerinneringSturen({ reminderSent: true, startDateTime: start }, t('2026-10-10T22:00:00+02:00')) &&
  !magLateHerinneringSturen({ reminderSent: false, startDateTime: start }, t('2026-10-11T09:00:00+02:00')));

// --- Ontdubbelen herinneringsmail (#23) ---
const plan = planHerinneringen([
  { _id: 'a', email: 'Gast@Example.test' },
  { _id: 'b', email: ' gast@example.test ' },          // tweede apparaat
  { _id: 'c', email: 'ander@example.test' },
  { _id: 'd', email: 'eerder@example.test', reminderSentAt: '2026-10-11T07:00:00Z' },
  { _id: 'e', email: 'EERDER@example.test' },           // adres had in een eerdere run al een mail
  { _id: 'f', email: '' },
]);
toets('één mail per adres', plan.versturen.map((r) => r._id).join(',') === 'a,c');
toets('dubbele adressen worden gemarkeerd, niet gemaild', plan.dubbel.map((r) => r._id).join(',') === 'b,e');
toets('al verstuurd wordt overgeslagen', !plan.versturen.some((r) => r._id === 'd'));
toets('tweede run na volledige run verstuurt niets',
  planHerinneringen([{ _id: 'a', email: 'x@y.z', reminderSentAt: 'iets' }]).versturen.length === 0);

// --- Geheimen en tokens (#43, admin) ---
toets('geheimKlopt: juist', geheimKlopt('abc', 'abc'));
toets('geheimKlopt: fout of leeg', !geheimKlopt('abd', 'abc') && !geheimKlopt('', 'abc') && !geheimKlopt(null, 'abc'));
toets('geheimKlopt: geen geheim ingesteld = altijd nee', !geheimKlopt('', '') && !geheimKlopt('x', undefined));
const tok = bootlegToken('show-1', 'signup-1', 'geheim');
toets('bootlegtoken hangt aan show en aanmelding',
  tok !== bootlegToken('show-2', 'signup-1', 'geheim') && tok !== bootlegToken('show-1', 'signup-2', 'geheim'));
toets('bootlegtoken hangt aan het geheim', tok !== bootlegToken('show-1', 'signup-1', 'ander'));
toets('downloadpad bevat show, aanmelding en token',
  bootlegDownloadPad('show-1', 'signup-1', 'geheim') === `/api/show/bootleg-download?show=show-1&s=signup-1&t=${tok}`);
toets('moderatietoken is per item',
  moderatieToken('s', 'guestbook', 'k1', 'g') !== moderatieToken('s', 'photo', 'k1', 'g') &&
  moderatieToken('s', 'guestbook', 'k1', 'g') !== moderatieToken('s', 'guestbook', 'k2', 'g'));
toets('item-keys: alleen base36', isGeldigeItemKey('ab12cd34') && !isGeldigeItemKey('a"]') && !isGeldigeItemKey(''));
toets('doc-ids: geen GROQ-tekens', isGeldigDocId('drafts.abc-123_X') && !isGeldigDocId('x"] || true') && !isGeldigDocId(null));


// Gastheer herkennen via hash (dataset is publiek; geen leesbaar hostEmail meer). Moet exact gelijk
// zijn aan host_email_hash() in sanity_sync.py van de Gig Manager.
toets('hashEmail gelijk aan Python (trim + lowercase + sha256)', hashEmail('  Gastheer@Example.test ') === '0432f39c9d466f292707e2f304e85bc6b46443ff68577214e0ba032bf193f24b');
toets('isGastheer herkent via hash', isGastheer({ hostEmailHash: '0432f39c9d466f292707e2f304e85bc6b46443ff68577214e0ba032bf193f24b' }, 'GASTHEER@example.test'));
toets('isGastheer: ander adres is geen gastheer', !isGastheer({ hostEmailHash: '0432f39c9d466f292707e2f304e85bc6b46443ff68577214e0ba032bf193f24b' }, 'gast@example.test'));
toets('isGastheer: oud document met leesbaar hostEmail werkt nog', isGastheer({ hostEmail: 'Gastheer@Example.test' }, 'gastheer@example.test'));
toets('isGastheer: zonder gegevens nooit gastheer', !isGastheer({}, 'gastheer@example.test'));

console.log(fout === 0 ? '\nalles klopt' : `\n${fout} fout(en)`);
process.exit(fout === 0 ? 0 : 1);
