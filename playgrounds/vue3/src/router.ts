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
    component: () => import('./layouts/DashboardLayout.vue'),
    meta: { title: 'Chat' },
    children: [
      {
        path: '',
        name: 'chat-panel',
        component: () => import('./components/dashboard/ChatPanel.vue'),
      },
      {
        path: 'contacts',
        name: 'contacts-panel',
        component: () => import('./components/dashboard/ContactPanel.vue'),
      },
      {
        path: 'groups',
        name: 'groups-panel',
        component: () => import('./components/dashboard/GroupsPanel.vue'),
      },
    ],
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
