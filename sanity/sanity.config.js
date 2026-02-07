import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import show from './schemas/show'
import song from './schemas/song'
import emailSignup from './schemas/emailSignup'

export default defineConfig({
  name: 'edstruijlaart',
  title: 'Ed Struijlaart',

  // ⚠️ Vul hier je project ID in na het aanmaken op sanity.io
  projectId: 'q407odag',
  dataset: 'production',

  plugins: [structureTool()],

  schema: {
    types: [show, song, emailSignup],
  },
})
