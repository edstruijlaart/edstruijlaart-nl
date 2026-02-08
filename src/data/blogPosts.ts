export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content?: string[];
  cta?: { label: string; href: string };
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'huiskamerconcerten-ed-struijlaart-2026',
    title: 'Huiskamerconcerten Ed Struijlaart 2026',
    description: 'Boek een huiskamerconcert met Ed Struijlaart. Een intieme avond vol muziek en verhalen bij jou thuis. Geschikt voor 10 tot 50 personen.',
    content: [
      'Een huiskamerconcert met Ed Struijlaart is een unieke muzikale ervaring. In de intimiteit van jouw eigen huis, tuin of bijzondere locatie speelt Ed een avondvullend programma vol eigen songs, covers en persoonlijke verhalen.',
      'Ed staat bekend om zijn warme stem, sterke gitaarspel en zijn vermogen om een publiek van begin tot eind mee te nemen. Of het nu gaat om een verjaardagsfeest, een bedrijfsevenement of gewoon een bijzondere avond met vrienden — een huiskamerconcert is altijd een onvergetelijke ervaring.',
      'Een huiskamerconcert is geschikt voor groepen van 10 tot 50 personen. Ed brengt zijn eigen geluidsinstallatie mee, zodat je je nergens zorgen over hoeft te maken. Het enige wat je nodig hebt is een ruimte, stoelen en een publiek.',
      'De kosten voor een huiskamerconcert zijn afhankelijk van de locatie, het aantal gasten en de gewenste invulling. Neem vrijblijvend contact op voor een offerte op maat.',
      'Ed heeft al honderden huiskamerconcerten gespeeld door heel Nederland en België. Van woonkamers tot schuren, van tuinen tot bedrijfskantines — overal waar mensen samenkomen voor muziek is Ed in zijn element.',
    ],
    cta: { label: 'Boek nu jouw huiskamerconcert', href: 'https://boeken.edstruijlaart.nl' },
  },
  {
    slug: 'boek-nu-jouw-eigen-huiskamerconcert-met-ed-struijlaart',
    title: 'Boek nu jouw eigen huiskamerconcert met Ed Struijlaart',
    description: 'Wil je een unieke muzikale avond bij jou thuis? Boek Ed Struijlaart voor een huiskamerconcert. Geschikt voor 10 tot 50 personen.',
    content: [
      'Ben je op zoek naar een bijzondere muzikale belevenis? Boek dan een huiskamerconcert met Ed Struijlaart! In de intimiteit van jouw eigen woonkamer, tuin of speciale locatie brengt Ed een avond vol muziek, verhalen en verbinding.',
      'Wat maakt een huiskamerconcert zo bijzonder? De afstand tussen artiest en publiek verdwijnt. Je zit letterlijk op de eerste rij. Ed speelt zijn mooiste eigen nummers, vertelt de verhalen erachter en speelt op verzoek ook covers van je favoriete artiesten.',
      'Praktische informatie: een huiskamerconcert duurt ongeveer anderhalf tot twee uur, inclusief pauze. Ed verzorgt zelf de complete geluidsinstallatie. Het enige wat jij hoeft te regelen is een ruimte en een enthousiast publiek van 10 tot 50 personen.',
      'Interesse? Neem contact op via ed@earswantmusic.nl of gebruik het contactformulier. Ed neemt zo snel mogelijk contact met je op om de mogelijkheden te bespreken.',
    ],
    cta: { label: 'Neem contact op', href: 'https://boeken.edstruijlaart.nl' },
  },
  {
    slug: 'gitaarmannen-3-john-mayer',
    title: 'Gitaarmannen 3: John Mayer',
    description: 'De derde editie van Gitaarmannen is een feit! Dit keer duikt Ed in het universum van John Mayer.',
    content: [
      'Na het succes van Gitaarmannen 1 en Gitaarmannen 2: Clapton Unplugged is er nu Gitaarmannen 3: John Mayer. In deze avondvullende theatervoorstelling duikt Ed Struijlaart in het universum van een van de grootste gitaristen van deze generatie.',
      'Van de eerste blueslicks tot de inmiddels iconische songs — Ed neemt je mee door het complete oeuvre van John Mayer, aangevuld met persoonlijke verhalen en anekdotes over de man achter de muziek.',
    ],
    cta: { label: 'Bekijk alle data', href: '/tour/gitaarmannen-3-john-mayer/' },
  },
  {
    slug: 'nieuwe-single-make-it-on-your-own',
    title: 'Nieuwe single: Make It On Your Own',
    description: 'Make It On Your Own is de platina single van Ed Struijlaart, met inmiddels meer dan 2 miljoen streams.',
  },
  {
    slug: 'nieuwe-single-house-on-fire',
    title: 'Nieuwe single: House on Fire',
    description: 'House on Fire is de nieuwste single van Ed Struijlaart. Beluister de single nu op alle streamingplatforms.',
  },
  {
    slug: 'gitaarmannen-3-john-mayer-theatertour',
    title: 'Gitaarmannen 3: John Mayer — Theatertour',
    description: 'Alle data en theaters van de Gitaarmannen 3: John Mayer theatertour door Nederland.',
    cta: { label: 'Bekijk alle data', href: '/tour/gitaarmannen-3-john-mayer/' },
  },
];
