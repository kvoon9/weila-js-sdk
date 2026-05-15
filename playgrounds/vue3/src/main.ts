import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { installWeilaAudioRuntimePatch } from '@weilasdk/core'
// eslint-disable-next-line import/no-unassigned-import
import './style.css'
import router from './router'
import App from './App.vue'

// oxlint-disable-next-line import/no-unassigned-import - it is css file
import '@weilasdk/ui/index.css'
// oxlint-disable-next-line import/no-unassigned-import - it is css file
import 'floating-vue/dist/style.css'

installWeilaAudioRuntimePatch()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(PiniaColada)
app.use(router)
app.mount('#app')
