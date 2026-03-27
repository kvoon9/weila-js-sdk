import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'index',
    component: () => import('./pages/index.vue'),
    meta: { title: 'Weila SDK' },
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('./pages/chat.vue'),
    meta: { title: 'Chat' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  document.title = (to.meta.title as string) || 'Weila SDK'
})

export default router
