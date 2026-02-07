export default {
  name: 'song',
  title: 'Nummer',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Titel',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'artist',
      title: 'Artiest',
      type: 'string',
      description: 'Originele artiest (of "Ed Struijlaart" voor eigen werk)',
      validation: Rule => Rule.required()
    },
    {
      name: 'spotifyUri',
      title: 'Spotify URI',
      type: 'string',
      description: 'spotify:track:XXXXX — voor automatische playlist-generatie',
    },
    {
      name: 'spotifyUrl',
      title: 'Spotify URL',
      type: 'url',
      description: 'https://open.spotify.com/track/XXXXX — voor links in de mail',
    },
    {
      name: 'isOriginal',
      title: 'Eigen nummer',
      type: 'boolean',
      initialValue: false,
      description: 'Is dit een eigen nummer van Ed?'
    },
    {
      name: 'isActive',
      title: 'Actief in pool',
      type: 'boolean',
      initialValue: true,
      description: 'Wordt dit nummer momenteel gespeeld bij concerten?'
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'artist',
      isOriginal: 'isOriginal'
    },
    prepare({ title, subtitle, isOriginal }) {
      return {
        title: title,
        subtitle: isOriginal ? `${subtitle} ★ eigen` : subtitle
      }
    }
  },
  orderings: [
    {
      title: 'Titel A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }]
    },
    {
      title: 'Artiest A-Z',
      name: 'artistAsc',
      by: [{ field: 'artist', direction: 'asc' }]
    }
  ]
}
