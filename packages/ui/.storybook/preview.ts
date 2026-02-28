import type { Preview } from '@storybook/vue3-vite'
// eslint-disable-next-line import/no-unassigned-import
import '../src/style.postcss.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
}

export default preview
