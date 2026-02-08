export default {
  name: 'show',
  title: 'Show',
  type: 'document',
  fields: [
    // --- BASIS ---
    {
      name: 'title',
      title: 'Titel',
      type: 'string',
      description: 'Bijv. "Huiskamerconcert Vlaardingen — 7 februari 2026"',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: (doc) => {
          const date = new Date(doc.startDateTime)
          const dateStr = date.toISOString().split('T')[0]
          return `${doc.city}-${dateStr}`
        },
        slugify: input => input.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'startDateTime',
      title: 'Starttijd concert',
      type: 'datetime',
      description: 'Datum en tijd waarop het concert begint. Dit is het scharnierpunt voor de paginafase.',
      validation: Rule => Rule.required(),
      options: {
        timeStep: 15
      }
    },

    // --- LOCATIE ---
    {
      name: 'city',
      title: 'Stad',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'hostName',
      title: 'Naam gastheer',
      type: 'string',
    },
    {
      name: 'hostEmail',
      title: 'Email gastheer',
      type: 'string',
      description: 'Niet zichtbaar op de pagina, alleen voor interne communicatie'
    },
    {
      name: 'privateAddress',
      title: 'Adres (privé)',
      type: 'text',
      rows: 2,
      description: 'Wordt NOOIT getoond op de pagina. Alleen voor eigen administratie.'
    },

    // --- CONTENT (fase 1: promo) ---
    {
      name: 'heroImage',
      title: 'Hero afbeelding',
      type: 'image',
      options: { hotspot: true },
      description: 'Sfeervolle foto voor bovenaan de pagina'
    },
    {
      name: 'introText',
      title: 'Intro tekst',
      type: 'text',
      rows: 3,
      description: 'Korte intro. Valt terug op standaardtekst als leeg.'
    },
    {
      name: 'youtubeVideos',
      title: 'YouTube video\'s',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'url', title: 'YouTube URL', type: 'url' },
          { name: 'caption', title: 'Bijschrift', type: 'string' }
        ]
      }],
      validation: Rule => Rule.max(2),
      description: 'Maximaal 2 video\'s'
    },
    {
      name: 'spotifyEmbed',
      title: 'Spotify embed URL',
      type: 'url',
      description: 'Artiest-profiel of playlist URL'
    },
    {
      name: 'reviews',
      title: 'Reviews',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'quote', title: 'Quote', type: 'text', rows: 2 },
          { name: 'author', title: 'Auteur', type: 'string' }
        ]
      }],
      description: 'Valt terug op standaard-reviews als leeg'
    },
    {
      name: 'practicalInfo',
      title: 'Praktische info',
      type: 'text',
      rows: 4,
      description: 'Bijv. "Neem je eigen drankje mee." Valt terug op standaardtekst als leeg.'
    },

    // --- SETLIST ---
    {
      name: 'setlist',
      title: 'Setlist',
      type: 'array',
      of: [{
        type: 'reference',
        to: [{ type: 'song' }]
      }],
      description: 'Vink na de show aan welke nummers zijn gespeeld'
    },
    {
      name: 'spotifyPlaylistUrl',
      title: 'Spotify playlist URL',
      type: 'url',
      description: 'Wordt idealiter automatisch gegenereerd op basis van setlist'
    },

    // --- BOOTLEG ---
    {
      name: 'bootlegUrl',
      title: 'Bootleg opname URL',
      type: 'url',
      description: 'Wordt automatisch ingevuld na upload via iOS Shortcut'
    },
    {
      name: 'bootlegExpiresAt',
      title: 'Bootleg vervaldatum',
      type: 'datetime',
      description: 'Download-link verloopt na deze datum (standaard 30 dagen na upload)',
      readOnly: true
    },
    {
      name: 'bootlegFileSize',
      title: 'Bestandsgrootte',
      type: 'string',
      readOnly: true,
      description: 'Automatisch ingevuld bij upload'
    },
    {
      name: 'bootlegDownloads',
      title: 'Bootleg downloads',
      type: 'number',
      readOnly: true,
      initialValue: 0,
      description: 'Aantal keer dat de bootleg is gedownload'
    },

    // --- GASTENBOEK ---
    {
      name: 'guestbookEntries',
      title: 'Gastenboek',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', title: 'Naam', type: 'string' },
          { name: 'email', title: 'Email', type: 'string' },
          { name: 'message', title: 'Bericht', type: 'text', rows: 2 },
          {
            name: 'approved',
            title: 'Goedgekeurd',
            type: 'boolean',
            initialValue: true // MVP: direct zichtbaar
          },
          { name: 'submittedAt', title: 'Ingezonden', type: 'datetime', readOnly: true }
        ]
      }],
      description: 'Berichten van gasten. MVP: direct zichtbaar (approved=true).'
    },

    // --- FOTO'S ---
    {
      name: 'guestPhotos',
      title: 'Gast-foto\'s',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'image', title: 'Foto', type: 'image' },
          { name: 'uploadedBy', title: 'Geüpload door', type: 'string' },
          { name: 'message', title: 'Bericht bij foto', type: 'text', rows: 2 },
          {
            name: 'approved',
            title: 'Goedgekeurd',
            type: 'boolean',
            initialValue: true
          },
          { name: 'uploadedAt', title: 'Geüpload op', type: 'datetime', readOnly: true }
        ],
        preview: {
          select: {
            title: 'uploadedBy',
            subtitle: 'message',
            media: 'image'
          }
        }
      }],
      description: 'Foto\'s van gasten met optioneel bericht.'
    },

    // --- META ---
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Concept', value: 'draft' },
          { title: 'Live', value: 'live' },
          { title: 'Gearchiveerd', value: 'archived' }
        ]
      },
      initialValue: 'draft'
    },
    {
      name: 'emailsSent',
      title: 'Emails verzameld',
      type: 'number',
      readOnly: true,
      initialValue: 0,
      description: 'Aantal emails verzameld via de email-gate'
    },
    {
      name: 'reminderSent',
      title: 'Herinneringsmail verstuurd',
      type: 'boolean',
      initialValue: false,
      readOnly: true
    },

    // --- TICKET TAILOR ---
    {
      name: 'ticketTailorEventId',
      title: 'Ticket Tailor Event ID',
      type: 'string',
      description: 'Automatisch gevuld bij sync. Niet handmatig wijzigen.',
      readOnly: true,
    },
    {
      name: 'ticketTailorSeriesId',
      title: 'Ticket Tailor Series ID',
      type: 'string',
      readOnly: true,
    },
    {
      name: 'ticketUrl',
      title: 'Ticket URL',
      type: 'url',
      description: 'Link naar de Ticket Tailor ticketpagina',
    },
  ],

  preview: {
    select: {
      title: 'title',
      city: 'city',
      date: 'startDateTime',
      status: 'status'
    },
    prepare({ title, city, date, status }) {
      const statusEmoji = { draft: '📝', live: '🟢', archived: '📦' }
      return {
        title: title || city,
        subtitle: `${statusEmoji[status] || ''} ${new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
      }
    }
  },

  orderings: [
    {
      title: 'Datum (nieuwste eerst)',
      name: 'dateDesc',
      by: [{ field: 'startDateTime', direction: 'desc' }]
    }
  ]
}
