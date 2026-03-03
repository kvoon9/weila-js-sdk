import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { RouterView } from 'vue-router'
// eslint-disable-next-line import/no-unassigned-import
import './style.css'
// eslint-disable-next-line import/no-unassigned-import
import '@weilasdk/ui/dist/index.css'
import router from './router'

const app = createApp(RouterView)
const pinia = createPinia()
app.use(pinia)
app.use(PiniaColada)
app.use(router)
app.mount('#app')
