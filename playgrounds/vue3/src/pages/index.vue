<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWeilaStore } from '../stores/weila'

const router = useRouter()
const weila = useWeilaStore()

const loginMethod = ref<'account' | 'phone'>('account')

const account = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const countryCode = computed(() => loginMethod.value === 'account' ? '0' : '86')
const accountLabel = computed(() => loginMethod.value === 'account' ? 'account' : 'phone number')
const accountPlaceholder = computed(() => loginMethod.value === 'account' ? 'weila number' : 'phone number')

async function handleLogin() {
  if (!account.value || !password.value) {
    error.value = 'Please enter account and password'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await weila.login(account.value, password.value, countryCode.value)
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
  <div class="flex items-center justify-center h-screen bg-neutral-50">
    <div class="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
      <h1 class="text-2xl font-bold text-neutral-800 mb-6 text-center">Weila SDK Playground</h1>

      <div class="flex mb-4 border-b border-neutral-200">
        <button type="button" @click="loginMethod = 'account'" :class="[
          'flex-1 py-2 text-sm font-medium transition-colors',
          loginMethod === 'account'
            ? 'text-blue-500 border-b-2 border-blue-500'
            : 'text-neutral-500 hover:text-neutral-700'
        ]">
          Account
        </button>
        <button type="button" @click="loginMethod = 'phone'" :class="[
          'flex-1 py-2 text-sm font-medium transition-colors',
          loginMethod === 'phone'
            ? 'text-blue-500 border-b-2 border-blue-500'
            : 'text-neutral-500 hover:text-neutral-700'
        ]">
          Phone
        </button>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">{{ accountLabel }}</label>
          <input v-model="account" type="text" :placeholder="accountPlaceholder"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Password</label>
          <input v-model="password" type="password" placeholder="Password"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

        <button type="submit" :disabled="loading"
          class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>
