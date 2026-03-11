import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { RouterView } from 'vue-router'
// eslint-disable-next-line import/no-unassigned-import
import './style.css'
import '@weilasdk/ui/dist/index.css'
import router from './router'

// eslint-disable-next-line no-extend-native, typescript-eslint/unbound-method
// Monkey-patch AudioWorklet.addModule to redirect worklet loading
// Solves Vite + webpack worklet-loader (inline: true) incompatibility:
// SDK creates blob: URLs for worklets, but blob: URLs can't resolve
// relative ES module imports (import opus from './opus'), causing silent failure.
// We redirect to pre-built IIFE versions in public/ that have no imports.
// eslint-disable-next-line typescript-eslint/unbound-method
const originalAddModule = AudioWorklet.prototype.addModule
const workletRedirects = ['/weila_player.worklet.iife.js', '/weila_recorder.worklet.iife.js']
let workletCallIndex = 0

// eslint-disable-next-line no-extend-native
AudioWorklet.prototype.addModule = async function (moduleURL: string, ...args: any[]) {
  // Blob URLs from webpack worklet-loader can't resolve internal imports
  if (moduleURL.startsWith('blob:') && workletCallIndex < workletRedirects.length) {
    const redirectTarget = workletRedirects[workletCallIndex++]
    console.log(
      '[Weila] Redirecting worklet:',
      moduleURL.slice(0, 40) + '...',
      '->',
      redirectTarget,
    )
    return originalAddModule.call(this, redirectTarget, ...args)
  }

  // Fallback: filename-based matching for non-blob URLs
  const workletMap: Record<string, string> = {
    'weila_player.worklet.js': '/weila_player.worklet.iife.js',
    'weila_recorder.worklet.js': '/weila_recorder.worklet.iife.js',
  }
  const fileName = moduleURL.split('/').pop()
  if (fileName && workletMap[fileName]) {
    console.log('[Weila] Redirecting worklet:', fileName, '->', workletMap[fileName])
    return originalAddModule.call(this, workletMap[fileName], ...args)
  }

  return originalAddModule.call(this, moduleURL, ...args)
}

const app = createApp(RouterView)
const pinia = createPinia()
app.use(pinia)
app.use(PiniaColada)
app.use(router)
app.mount('#app')
