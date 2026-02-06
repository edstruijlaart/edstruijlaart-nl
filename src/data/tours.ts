export interface Tour {
  slug: string;
  title: string;
  subtitle?: string;
  year: string;
  shortDescription: string;
  description: string[];
  credits?: string;
  posterImage: string;
  current: boolean;
  setlist?: string[];
  spotifyPlaylistUri?: string;
}

export const tours: Tour[] = [
  {
    slug: 'gitaarmannen-3-john-mayer',
    title: 'Gitaarmannen 3',
    subtitle: 'John Mayer',
    year: '2024 — 2026',
    shortDescription: 'Gitaarmannen 3: John Mayer is een muzikale ode aan een van de meest invloedrijke gitaristen en songwriters van deze generatie.',
    description: [
      'Gitaarmannen 3: John Mayer is een theatervoorstelling waarin Ed Struijlaart samen met zijn band een eerbetoon brengt aan een van de meest invloedrijke gitaristen en songwriters van de afgelopen decennia.',
      'In deze voorstelling wordt het publiek meegenomen in de muzikale reis van John Mayer. Van zijn doorbraak als pop-singer-songwriter tot zijn ontwikkeling als gerespecteerd gitarist die moeiteloos schakelt tussen blues, pop, rock en Americana. Door live-uitvoeringen van Mayers repertoire te combineren met verhalen over zijn muzikale invloeden, carrierekeuzes en speelstijl ontstaat een voorstelling die zowel een concert als een inkijk in artistieke groei is.',
      'Een belangrijk onderdeel van Gitaarmannen 3 is de zoektocht naar nieuw gitaartalent in Nederland. Met dit element laat de voorstelling zien hoe muziek generaties verbindt en hoe inspiratie wordt doorgegeven van artiest naar artiest. Deze zoektocht mondt uit in de ontdekking van nieuw talent dat een podium krijgt binnen het Gitaarmannen-verhaal.',
      'Gitaarmannen 3 bouwt voort op de succesvolle combinatie van livemuziek, storytelling en educatie die het concept kenmerkt. Tegelijk laat de voorstelling zien hoe de rol van de gitarist zich blijft ontwikkelen binnen de moderne popmuziek en hoe een artiest als John Mayer daarin een brug slaat tussen traditie en vernieuwing.',
    ],
    credits: 'Regie: Erris van Ginkel',
    posterImage: 'gitaarmannen-3-poster.png',
    current: true,
    setlist: [],
    spotifyPlaylistUri: '0XALcsmURQkFcLasrfOQZm',
  },
  {
    slug: 'gitaarmannen-2-clapton',
    title: 'Gitaarmannen 2',
    subtitle: 'Eric Clapton Unplugged',
    year: '2022 — 2024',
    shortDescription: 'Gitaarmannen 2: Eric Clapton Unplugged was een ode aan het legendarische livealbum dat wereldwijd wordt gezien als een van de meest invloedrijke akoestische gitaarplaten ooit.',
    description: [
      'Gitaarmannen 2: Eric Clapton Unplugged was een muzikale en persoonlijke ode aan het iconische livealbum dat in 1992 verscheen en uitgroeide tot een van de best verkochte en meest invloedrijke liveplaten aller tijden.',
      'In deze voorstelling onderzocht Ed Struijlaart samen met zijn band waarom juist dit album zo\'n enorme impact heeft gehad op de muziekwereld en op gitaristen wereldwijd. Het album betekende een keerpunt in Claptons carriere en liet zien hoe krachtig muziek kan zijn wanneer arrangementen worden teruggebracht tot de essentie.',
      'Tijdens de voorstelling werd het repertoire van Unplugged live uitgevoerd, aangevuld met verhalen over Claptons muzikale ontwikkeling, zijn invloeden uit de blues en de persoonlijke gebeurtenissen die ten grondslag lagen aan de plaat. Daarmee ontstond een voorstelling die niet alleen een eerbetoon was aan een legendarisch album, maar ook een inkijk gaf in de rol van kwetsbaarheid en storytelling binnen muziek.',
      'Gitaarmannen 2 liet zien hoe een akoestische setting de emotionele kracht van liedjes kan versterken en hoe een livealbum generaties muzikanten en luisteraars kan blijven inspireren. De voorstelling bouwde voort op het succes van het eerste Gitaarmannen-programma en verstevigde de positie van het concept als combinatie van muziektheater, educatie en livemuziek.',
    ],
    credits: 'Regie: Erris van Ginkel',
    posterImage: 'gitaarmannen-2-bg.png',
    current: false,
    setlist: [],
  },
  {
    slug: 'alles-op-rood',
    title: 'Alles op Rood',
    year: '2020 — 2022',
    shortDescription: 'Alles op Rood is een persoonlijke theatervoorstelling over durven kiezen voor wat je het meest lief is.',
    description: [
      'Alles op Rood is een persoonlijke en muzikale theatervoorstelling waarin Ed Struijlaart het publiek meeneemt in de keuzes die hem hebben gevormd als artiest en mens.',
      'De titel verwijst naar het moment waarop hij besloot, net als in een casino, alles op rood te zetten. Rood als symbool voor hartstocht, liefde en het volgen van intuitie. In de voorstelling blikt Ed terug op de momenten waarop hij moest kiezen tussen zekerheid en het najagen van zijn passie voor muziek.',
      'Tijdens deze zoektocht kijkt hij terug langs zijn familielijnen en ontdekt hij opvallende parallellen met zijn overgrootvader Pieter Magito, de eerste circusdirecteur van Nederland. Ook hij koos ooit voor een leven vol risico en avontuur, gedreven door liefde voor het vak en de drang om mensen te raken en te vermaken.',
      'Een belangrijk en kwetsbaar onderdeel van de voorstelling is het verhaal over het vroegtijdig overlijden van Eds vader. Deze gebeurtenis confronteerde hem met de vraag hoe kort en onvoorspelbaar het leven kan zijn en versterkte zijn overtuiging om keuzes te maken vanuit het hart.',
      'In Alles op Rood verweeft Ed eigen liedjes met persoonlijke verhalen en reflecties. De voorstelling laat zien hoe muziek kan helpen om richting te geven aan het leven en hoe het volgen van een passie vaak gepaard gaat met twijfel, risico en moed. Het resultaat is een eerlijke en herkenbare theaterervaring waarin muziek en storytelling samenkomen in een intiem en oprecht portret van een artiest die ervoor koos om zijn hart te volgen.',
    ],
    credits: 'Regie: Erris van Ginkel',
    posterImage: 'alles-op-rood-poster.png',
    current: false,
    setlist: [],
  },
  {
    slug: 'gitaarmannen-1',
    title: 'Gitaarmannen 1',
    subtitle: 'van Clapton tot Sheeran',
    year: '2018 — 2020',
    shortDescription: 'Gitaarmannen 1: Van Clapton tot Sheeran was de eerste theatervoorstelling binnen het Gitaarmannen-concept.',
    description: [
      'Gitaarmannen 1: Van Clapton tot Sheeran vormde het startpunt van het succesvolle Gitaarmannen-concept en markeerde het begin van een nieuwe theatervorm waarin livemuziek, storytelling en liefde voor het gitaarspel samenkomen.',
      'In deze voorstelling nam Ed Struijlaart het publiek mee op een muzikale reis langs gitaristen en singer-songwriters die het gezicht van de popmuziek hebben bepaald. Vanuit de blues en classic rock bouwde de show zich op richting moderne pop en singer-songwritermuziek. Door muziek van onder anderen Eric Clapton, John Mayer en Ed Sheeran te combineren met persoonlijke verhalen en achtergrondinformatie ontstond een voorstelling die zowel een concert als een muzikale ontdekkingstocht was.',
      'De voorstelling liet niet alleen horen hoe verschillende generaties gitaristen elkaar hebben beinvloed, maar gaf ook inzicht in hoe het instrument zich heeft ontwikkeld en waarom de gitaar nog altijd zo\'n belangrijke rol speelt in de popcultuur.',
      'Tijdens de reprise van deze voorstelling ontstond het idee voor Gitaarmannen, de podcast. Wat begon als een logisch verlengstuk van het theaterconcept groeide uit tot een populair platform waarin Ed in gesprek gaat met nationale en internationale gitaristen over hun speelstijl, inspiratie en carriere. Daarmee werd Gitaarmannen meer dan een voorstelling en groeide het uit tot een breed muzikaal merk met een trouwe en betrokken achterban.',
    ],
    credits: 'Regie: Erris van Ginkel',
    posterImage: 'gitaarmannen-1-poster.png',
    current: false,
    setlist: [],
  },
];
