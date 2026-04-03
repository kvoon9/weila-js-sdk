<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWeilaStore } from '../../stores/weila'
import { storeToRefs } from 'pinia'

const router = useRouter()
const weila = useWeilaStore()
const { core, userInfo } = storeToRefs(weila)

// General settings toggles
const doNotDisturb = ref(false)
const ttsEnabled = ref(false)
const locationSharing = ref(false)

// Device list
interface Device {
  id: string
  name: string
  type: string
  isCurrent?: boolean
}

const devices = ref<Device[]>([])

// Helper to get device name
function getDeviceName(ext: { info: { productName: string } }): string {
  return ext.info?.productName || 'Unknown Device'
}

// Load general settings
async function loadGeneralSettings() {
  if (!core.value) return
  try {
    // Default to false, actual implementation would call weila_getGeneralSetting
    doNotDisturb.value = false
    ttsEnabled.value = false
    locationSharing.value = false
  } catch (e) {
    console.error('Failed to load general settings:', e)
  }
}

// Update general setting
async function updateGeneralSetting(key: string, value: boolean) {
  if (!core.value) return
  try {
    console.log(`Updated ${key} to ${value}`)
  } catch (e) {
    console.error(`Failed to update ${key}:`, e)
  }
}

// Load device list
async function loadDevices() {
  if (!core.value) return
  try {
    const extensions = await core.value.weila_getExtensions()
    devices.value = (extensions || []).map((ext) => ({
      id: ext.info?.imei || '',
      name: ext.info?.productName || 'Unknown Device',
      type: String(ext.info?.extensionType || ''),
    }))
  } catch (e) {
    console.error('Failed to load devices:', e)
  }
}

// Handle logout
async function handleLogout() {
  await weila.logout()
  router.push('/')
}

onMounted(() => {
  loadGeneralSettings()
  loadDevices()
})
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-2xl mx-auto p-6">
      <h1 class="text-2xl font-semibold text-gray-800 mb-6">Settings</h1>

      <!-- General Settings -->
      <section class="mb-8">
        <h2 class="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
          <span class="icon-[carbon--settings]"></span>
          General Settings
        </h2>
        <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <!-- Do Not Disturb -->
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="icon-[carbon--notification-off] text-gray-500"></span>
              <div>
                <div class="font-medium text-gray-800">Do Not Disturb</div>
                <div class="text-sm text-gray-500">Mute all notifications</div>
              </div>
            </div>
            <button
              @click="doNotDisturb = !doNotDisturb; updateGeneralSetting('dnd', doNotDisturb)"
              :class="[
                'relative w-12 h-6 rounded-full transition-colors duration-200',
                doNotDisturb ? 'bg-blue-500' : 'bg-gray-300'
              ]"
            >
              <span
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                  doNotDisturb ? 'translate-x-7' : 'translate-x-1'
                ]"
              ></span>
            </button>
          </div>

          <!-- TTS -->
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="icon-[carbon--microphone] text-gray-500"></span>
              <div>
                <div class="font-medium text-gray-800">Text-to-Speech</div>
                <div class="text-sm text-gray-500">Enable voice synthesis</div>
              </div>
            </div>
            <button
              @click="ttsEnabled = !ttsEnabled; updateGeneralSetting('tts', ttsEnabled)"
              :class="[
                'relative w-12 h-6 rounded-full transition-colors duration-200',
                ttsEnabled ? 'bg-blue-500' : 'bg-gray-300'
              ]"
            >
              <span
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                  ttsEnabled ? 'translate-x-7' : 'translate-x-1'
                ]"
              ></span>
            </button>
          </div>

          <!-- Location Sharing -->
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="icon-[carbon--location] text-gray-500"></span>
              <div>
                <div class="font-medium text-gray-800">Location Sharing</div>
                <div class="text-sm text-gray-500">Share your location with contacts</div>
              </div>
            </div>
            <button
              @click="locationSharing = !locationSharing; updateGeneralSetting('location', locationSharing)"
              :class="[
                'relative w-12 h-6 rounded-full transition-colors duration-200',
                locationSharing ? 'bg-blue-500' : 'bg-gray-300'
              ]"
            >
              <span
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                  locationSharing ? 'translate-x-7' : 'translate-x-1'
                ]"
              ></span>
            </button>
          </div>
        </div>
      </section>

      <!-- Session Settings -->
      <section class="mb-8">
        <h2 class="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
          <span class="icon-[carbon--chat]"></span>
          Session Settings
        </h2>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-gray-500 text-sm">
            Session-specific settings will appear here when you select a conversation.
          </p>
          <!-- Future: Session selector and per-session settings -->
        </div>
      </section>

      <!-- Account Info -->
      <section class="mb-8">
        <h2 class="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
          <span class="icon-[carbon--user]"></span>
          Account Info
        </h2>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="flex items-center gap-4 mb-4">
            <img
              v-if="userInfo?.avatar"
              :src="userInfo.avatar"
              class="w-16 h-16 rounded-full"
            />
            <div v-else class="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span class="text-xl text-gray-600">{{ userInfo?.nick?.[0] || 'U' }}</span>
            </div>
            <div>
              <div class="font-semibold text-lg text-gray-800">{{ userInfo?.nick || 'User' }}</div>
              <div class="text-gray-500">Weila ID: {{ userInfo?.weilaNum || 'N/A' }}</div>
            </div>
          </div>
          <div class="space-y-2 text-sm text-gray-600">
            <div v-if="userInfo?.phone">Phone: {{ userInfo.phone }}</div>
            <div v-if="userInfo?.email">Email: {{ userInfo.email }}</div>
            <div>User ID: {{ userInfo?.userId || 'N/A' }}</div>
          </div>
        </div>
      </section>

      <!-- Device Management -->
      <section class="mb-8">
        <h2 class="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
          <span class="icon-[carbon--collaborate]"></span>
          Device Management
        </h2>
        <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div
            v-for="device in devices"
            :key="device.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <span class="icon-[carbon--mobile] text-gray-500"></span>
            <div class="flex-1">
              <div class="font-medium text-gray-800">{{ device.name || 'Unknown Device' }}</div>
              <div class="text-sm text-gray-500">{{ device.type || 'Device' }}</div>
            </div>
            <span
              v-if="device.isCurrent"
              class="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full"
            >
              Current
            </span>
          </div>
          <div v-if="devices.length === 0" class="px-4 py-3 text-gray-500 text-sm">
            No linked devices found.
          </div>
        </div>
      </section>

      <!-- Logout -->
      <section>
        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
        >
          <span class="icon-[carbon--logout]"></span>
          <span class="font-medium">Logout</span>
        </button>
      </section>
    </div>
  </div>
</template>
