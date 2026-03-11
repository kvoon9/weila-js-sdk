import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { RouterView } from 'vue-router'
// eslint-disable-next-line import/no-unassigned-import
import './style.css'
import '@weilasdk/ui/dist/index.css'
import router from './router'

// Monkey patch AudioWorklet.addModule to redirect worklet loading
// This solves Vite + webpack worklet-loader incompatibility issue
const originalAddModule = window.AudioContext?.prototype?.addModule
if (originalAddModule) {
  window.AudioContext.prototype.addModule = async function (moduleURL: string) {
    const workletMap: Record<string, string> = {
      'weila_player.worklet.js': '/weila_player.worklet.iife.js',
      'weila_recorder.worklet.js': '/weila_recorder.worklet.iife.js',
    }
    const fileName = moduleURL.split('/').pop()
    if (fileName && workletMap[fileName]) {
      console.log('[Weila] Redirecting worklet:', fileName, '->', workletMap[fileName])
      return originalAddModule.call(this, workletMap[fileName])
    }
    return originalAddModule.call(this, moduleURL)
  }
}

const app = createApp(RouterView)
const pinia = createPinia()
app.use(pinia)
app.use(PiniaColada)
app.use(router)
app.mount('#app')
