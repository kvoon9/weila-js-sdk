<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useWeilaStore } from '../../stores/weila'
import { useFriends } from '../../queries/friends'
import { useFriendSearch } from '../../composables/useFriendSearch'

const emit = defineEmits<{
  selectChat: [userId: string]
}>()

const weila = useWeilaStore()
const { core: weilaCore } = storeToRefs(weila)

const { data: friends, refetch: refetchFriends } = useFriends()
const { searching, search, clearSearch } = useFriendSearch(weilaCore)

// Online friends state
const onlineFriendIds = ref<Set<number>>(new Set())

// Fetch online friends periodically or on refresh
async function refreshOnlineFriends() {
  if (!weilaCore.value) return
  try {
    const onlineFriends = await weilaCore.value.weila_getOnlineFriends()
    onlineFriendIds.value = new Set(
      onlineFriends.map((f) => f.userInfo?.userId ?? f.friendInfo.userId),
    )
  } catch (err) {
    console.error('[ContactList] Failed to get online friends:', err)
  }
}

// Refresh online friends when friends change or on mount
watch(friends, () => refreshOnlineFriends(), { immediate: true })

// Filter state: 'all' | 'online' | 'offline'
const filterTab = ref<'all' | 'online' | 'offline'>('all')
const searchQuery = ref('')

// Transform friends to ContactItem
const contactItems = computed(() => {
  return (friends.value ?? []).map((f) => {
    const userId = f.userInfo?.userId ?? f.friendInfo.userId
    const isOnline = onlineFriendIds.value.has(userId)
    let lastMsgTime: number | undefined
    if (f.friendInfo.extension) {
      try {
        lastMsgTime = JSON.parse(f.friendInfo.extension).lastMsgTime
      } catch {
        // ignore invalid JSON
      }
    }
    return {
      userId: String(userId),
      name: f.userInfo?.nick || `User ${userId}`,
      avatar: f.userInfo?.avatar,
      remark: f.friendInfo.remark,
      isOnline,
      lastMsgTime,
    }
  })
})

// Filtered contacts based on search and tab
const displayedContacts = computed(() => {
  let items = contactItems.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.remark?.toLowerCase().includes(q) ||
        c.userId.includes(q),
    )
  }

  // Apply online/offline filter
  if (filterTab.value === 'online') {
    items = items.filter((c) => c.isOnline)
  } else if (filterTab.value === 'offline') {
    items = items.filter((c) => !c.isOnline)
  }

  return items
})

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
function handleSearchInput(val: string) {
  searchQuery.value = val
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (val.trim()) {
      search(val)
    } else {
      clearSearch()
    }
  }, 300)
}

onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

// Add friend modal
const showAddFriendModal = ref(false)
const addFriendUserId = ref('')
const addFriendRemark = ref('')
const addFriendLoading = ref(false)
const addFriendError = ref('')

function openAddFriendModal() {
  addFriendUserId.value = ''
  addFriendRemark.value = ''
  addFriendError.value = ''
  showAddFriendModal.value = true
}

function closeAddFriendModal() {
  showAddFriendModal.value = false
}

async function handleAddFriend() {
  if (!weilaCore.value || !addFriendUserId.value.trim()) return
  addFriendLoading.value = true
  addFriendError.value = ''
  try {
    await weilaCore.value.weila_inviteFriend(
      parseInt(addFriendUserId.value),
      '',
      addFriendRemark.value,
    )
    closeAddFriendModal()
    await refetchFriends()
  } catch (err) {
    console.error('[ContactList] Add friend failed:', err)
    addFriendError.value = 'Failed to add friend. Please check the User ID.'
  } finally {
    addFriendLoading.value = false
  }
}

// Delete friend
async function handleDeleteFriend(userId: string) {
  if (!weilaCore.value) return
  try {
    await weilaCore.value.weila_deleteFriends([parseInt(userId)])
    await refetchFriends()
  } catch (err) {
    console.error('[ContactList] Delete friend failed:', err)
  }
}

// Start private chat
function handleContactClick(userId: string) {
  emit('selectChat', userId)
}

// Get avatar initials
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search Bar -->
    <div class="p-3 border-b border-neutral-200">
      <div class="relative">
        <span class="icon-[carbon--search] absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"></span>
        <input
          :value="searchQuery"
          type="text"
          placeholder="Search contacts..."
          class="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          @input="(e) => handleSearchInput((e.target as HTMLInputElement).value)"
        />
        <span v-if="searching" class="icon-[carbon--in-progress] absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin"></span>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center justify-between p-3 border-b border-neutral-100">
      <div class="flex gap-2">
        <button
          v-for="tab in ['all', 'online', 'offline'] as const"
          :key="tab"
          :class="[
            'px-3 py-1 text-sm rounded-full transition-colors',
            filterTab === tab ? 'bg-blue-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
          ]"
          @click="filterTab = tab"
        >
          {{ tab === 'all' ? 'All' : tab === 'online' ? 'Online' : 'Offline' }}
        </button>
      </div>
      <button
        class="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        @click="openAddFriendModal"
      >
        <span class="icon-[carbon--add]"></span>
        Add
      </button>
    </div>

    <!-- Contact List -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="displayedContacts.length === 0" class="flex items-center justify-center h-full text-neutral-400 text-sm">
        <span v-if="searchQuery">No contacts found</span>
        <span v-else>No contacts yet</span>
      </div>

      <div v-else class="divide-y divide-neutral-100">
        <div
          v-for="contact in displayedContacts"
          :key="contact.userId"
          class="flex items-center gap-3 p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
          @click="handleContactClick(contact.userId)"
        >
          <!-- Avatar -->
          <div class="relative flex-shrink-0">
            <div
              v-if="contact.avatar"
              class="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden"
            >
              <img :src="contact.avatar" :alt="contact.name" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium"
            >
              {{ getInitials(contact.name) }}
            </div>
            <!-- Online indicator -->
            <span
              :class="[
                'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                contact.isOnline ? 'bg-green-500' : 'bg-neutral-400',
              ]"
            ></span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-medium text-neutral-900 text-sm truncate">
                {{ contact.remark || contact.name }}
              </span>
              <span v-if="contact.lastMsgTime" class="text-xs text-neutral-400">
                {{ new Date(contact.lastMsgTime).toLocaleDateString() }}
              </span>
            </div>
            <div v-if="contact.remark" class="text-xs text-neutral-400 truncate">
              {{ contact.name }}
            </div>
          </div>

          <!-- Actions dropdown would go here -->
          <button
            class="p-1 text-neutral-400 hover:text-red-500 transition-colors"
            @click.stop="handleDeleteFriend(contact.userId)"
            title="Delete friend"
          >
            <span class="icon-[carbon--trash-can]"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add Friend Modal -->
    <Teleport to="body">
      <div
        v-if="showAddFriendModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeAddFriendModal"></div>

        <!-- Modal Content -->
        <div class="relative bg-white rounded-lg shadow-xl w-80 max-w-[90vw]">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 class="text-lg font-semibold text-neutral-900">Add Friend</h3>
            <button
              class="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
              @click="closeAddFriendModal"
            >
              <span class="icon-[carbon--close] text-lg"></span>
            </button>
          </div>

          <!-- Body -->
          <div class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">User ID</label>
              <input
                v-model="addFriendUserId"
                type="text"
                placeholder="Enter user ID"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keyup.enter="handleAddFriend"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Remark (optional)</label>
              <input
                v-model="addFriendRemark"
                type="text"
                placeholder="Enter remark"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keyup.enter="handleAddFriend"
              />
            </div>
            <p v-if="addFriendError" class="text-sm text-red-500">{{ addFriendError }}</p>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 px-4 py-3 border-t border-neutral-200 bg-neutral-50 rounded-b-lg">
            <button
              class="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              @click="closeAddFriendModal"
            >
              Cancel
            </button>
            <button
              :disabled="addFriendLoading || !addFriendUserId.trim()"
              class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="handleAddFriend"
            >
              {{ addFriendLoading ? 'Adding...' : 'Add' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
