import { createApp } from 'vue'
import { RouterView } from 'vue-router'
import './style.css'
import router from './router'

createApp(RouterView).use(router).mount('#app')
