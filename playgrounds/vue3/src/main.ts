import { createApp } from 'vue'
import { RouterView } from 'vue-router'
// eslint-disable-next-line import/no-unassigned-import
import './style.css'
import router from './router'

createApp(RouterView).use(router).mount('#app')
