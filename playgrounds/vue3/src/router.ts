import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'login',
    component: () => import('./pages/index.vue'),
    meta: { title: 'Login' },
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('./layouts/DashboardLayout.vue'),
    meta: { title: 'Dashboard' },
    children: [
      {
        path: '',
        name: 'chat-index',
        component: () => import('./components/dashboard/ChatPanel.vue'),
        meta: { title: 'Chats' },
      },
      {
        path: 'contacts',
        name: 'chat-contacts',
        component: () => import('./components/dashboard/ContactPanel.vue'),
        meta: { title: 'Contacts' },
      },
      {
        path: 'groups',
        name: 'chat-groups',
        component: () => import('./components/dashboard/GroupsPanel.vue'),
        meta: { title: 'Groups' },
      },
      {
        path: 'settings',
        name: 'chat-settings',
        component: () => import('./components/dashboard/SettingsPanel.vue'),
        meta: { title: 'Settings' },
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
