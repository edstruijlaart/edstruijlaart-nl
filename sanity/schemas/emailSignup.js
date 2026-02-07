export default {
  name: 'emailSignup',
  title: 'Email Signup',
  type: 'document',
  fields: [
    {
      name: 'firstName',
      title: 'Voornaam',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'show',
      title: 'Show',
      type: 'reference',
      to: [{ type: 'show' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'syncedToListmonk',
      title: 'Gesynchroniseerd naar Listmonk',
      type: 'boolean',
      initialValue: false
    },
    {
      name: 'signedUpAt',
      title: 'Aangemeld op',
      type: 'datetime'
    },
    {
      name: 'source',
      title: 'Bron',
      type: 'string',
      options: {
        list: [
          { title: 'Email-gate (ter plekke)', value: 'email-gate' },
          { title: 'Ticket Tailor', value: 'ticket-tailor' },
        ],
      },
      initialValue: 'email-gate',
    },
  ],
  preview: {
    select: {
      title: 'email',
      subtitle: 'firstName',
      show: 'show.title'
    }
  }
}
