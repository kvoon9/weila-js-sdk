<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWeilaStore } from '../stores/weila'

const router = useRouter()
const weila = useWeilaStore()

const COUNTRY_CODE = '86'

const account = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!account.value || !password.value) {
    error.value = 'Please enter account and password'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await weila.login(account.value, password.value, COUNTRY_CODE)
    router.push('/chat')
  } catch (err) {
    console.error('Login failed:', err)
    error.value = 'Login failed. Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center h-screen bg-gray-50">
    <div class="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
      <h1 class="text-2xl font-bold text-gray-800 mb-6 text-center">Weila SDK Playground</h1>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <input
            v-model="account"
            type="text"
            placeholder="Weila number or phone"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>
