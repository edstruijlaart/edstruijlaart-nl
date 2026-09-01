// Toets op de show-herkenning achter de theater-QR.
//
// Draaien:  npx tsx scripts/toets-show-uit-tijdstip.mjs
//
// Deze logica is subtiel genoeg om niet op goed vertrouwen te laten staan: de
// tour loopt over de omschakeling naar wintertijd heen (25 okt) en Emmen heeft
// twee voorstellingen op één avond. Beide gingen bij het bouwen een keer mis.

import { showOpMoment } from '../src/lib/show-uit-tijdstip.ts';

const gevallen = [
  ["24 sep 21:30 NL (pauze HIA)",        "2026-09-24T19:30:00Z", "Hendrik-Ido-Ambacht"],
  ["24 sep 18:00 NL (te vroeg, 2u voor)","2026-09-24T16:00:00Z", "Hendrik-Ido-Ambacht"],
  ["24 sep 14:00 NL (middag, geen show)","2026-09-24T12:00:00Z", null],
  ["25 sep 01:00 NL (thuis op de bank)", "2026-09-24T23:00:00Z", "Hendrik-Ido-Ambacht"],
  ["25 sep 12:00 NL (dag erna, te laat)","2026-09-25T10:00:00Z", null],
  ["17 okt 19:45 NL (Emmen vroege show)","2026-10-17T17:45:00Z", "Emmen|19:00"],
  ["17 okt 21:45 NL (Emmen late show)",  "2026-10-17T19:45:00Z", "Emmen|21:15"],
  ["2 okt 21:00 NL (Capelle)",           "2026-10-02T19:00:00Z", "Capelle aan den IJssel"],
  ["16 dec 21:00 NL (wintertijd!)",      "2026-12-16T20:00:00Z", "Heerhugowaard"],
];

let fout = 0;
for (const [label, iso, verwacht] of gevallen) {
  const r = showOpMoment(new Date(iso));
  const stad = r ? (verwacht && verwacht.includes("|") ? `${r.show.city}|${r.show.time}` : r.show.city) : null;
  const tijd = r ? r.show.time : "-";
  const ok = stad === verwacht;
  if (!ok) fout++;
  console.log(`${ok ? "OK  " : "FOUT"} ${label.padEnd(38)} -> ${stad ?? "geen"} ${tijd}`);
}
console.log(fout === 0 ? "\nalles klopt" : `\n${fout} fout(en)`);
process.exit(fout === 0 ? 0 : 1);
