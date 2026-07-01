<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWeilaStore } from '../../stores/weila'
import { storeToRefs } from 'pinia'
import GroupList from './GroupList.vue'
import CreateGroupModal from './CreateGroupModal.vue'
import type { GroupItem } from '../../queries/groups'
import type { WL_IDbGroupMember, WL_IDbGroup } from '@vois/weila-sdk-core'
import { WL_IDbSessionType, WL_IDbGroupType, WL_IDbGroupPublicType } from '@vois/weila-sdk-core'

const router = useRouter()
const weila = useWeilaStore()
const { core: weilaCore, userInfo } = storeToRefs(weila)

const selectedGroup = ref<GroupItem | null>(null)
const members = ref<WL_IDbGroupMember[]>([])
const loadingMembers = ref(false)
const groupDetail = ref<WL_IDbGroup | null>(null)

const showCreateModal = ref(false)
const createModalRef = ref<InstanceType<typeof CreateGroupModal> | null>(null)

async function loadMembers(groupId: string) {
  if (!weilaCore.value) return
  loadingMembers.value = true
  try {
    members.value = await weilaCore.value.weila_getGroupMembers(groupId)
    const detail = await weilaCore.value.weila_getGroup(groupId)
    if (detail) {
      groupDetail.value = detail
    }
  } catch (err) {
    console.error('[GroupsPanel] Failed to load members:', err)
  } finally {
    loadingMembers.value = false
  }
}

function handleSelectGroup(group: GroupItem) {
  selectedGroup.value = group
  loadMembers(group.groupId)
}

function handleCreateGroup() {
  showCreateModal.value = true
}

async function handleGroupCreated(groupName: string, isPublic: boolean) {
  if (!weilaCore.value) return
  createModalRef.value?.setCreating(true)
  try {
    // Get current user ID to include as first member
    const currentUserId = userInfo.value?.userId
    const group = await weilaCore.value.weila_createGroup(
      groupName,
      WL_IDbGroupType.GROUP_NORMAL,
      null,
      isPublic ? WL_IDbGroupPublicType.GROUP_PUBLIC_OPEN : WL_IDbGroupPublicType.GROUP_PUBLIC_CLOSE,
      currentUserId ? [currentUserId] : [],
    )
    createModalRef.value?.handleCreated()
    // Select the newly created group directly - avoid redundant loadMembers call
    selectedGroup.value = {
      groupId: group.groupId,
      name: group.name,
      avatar: group.avatar || undefined,
      memberCount: group.memberCount,
      isPublic: group.publicType === WL_IDbGroupPublicType.GROUP_PUBLIC_OPEN,
    }
    groupDetail.value = group
    // Load members for the new group
    loadMembers(group.groupId)
  } catch (err) {
    console.error('[GroupsPanel] Failed to create group:', err)
    createModalRef.value?.handleCreateFailed('创建群组失败')
  }
}

function handleCloseDetail() {
  selectedGroup.value = null
  members.value = []
  groupDetail.value = null
}

async function handleQuitGroup(groupId: string) {
  if (!weilaCore.value) return
  try {
    await weilaCore.value.weila_quitGroup(groupId)
    handleCloseDetail()
  } catch (err) {
    console.error('[GroupsPanel] Failed to quit group:', err)
  }
}

async function handleJoinGroup(groupId: string) {
  if (!weilaCore.value) return
  try {
    await weilaCore.value.weila_joinGroup(groupId)
  } catch (err) {
    console.error('[GroupsPanel] Failed to join group:', err)
  }
}

async function handleEnterChat() {
  if (!weilaCore.value || !selectedGroup.value) return
  try {
    const session = await weilaCore.value.weila_startNewSession(
      selectedGroup.value.groupId,
      WL_IDbSessionType.SESSION_GROUP_TYPE,
    )
    router.push({ path: '/chat', query: { sessionId: session.sessionId } })
  } catch (err) {
    console.error('[GroupsPanel] Failed to start session:', err)
  }
}

function getMemberRole(member: WL_IDbGroupMember): 'owner' | 'admin' | 'member' {
  if (groupDetail.value && member.memberInfo.userId === groupDetail.value.ownerId) {
    return 'owner'
  }
  if (member.memberInfo.memberType === 0x02) {
    return 'admin'
  }
  return 'member'
}

function getMemberDisplayName(member: WL_IDbGroupMember): string {
  return member.userInfo?.nick || member.userInfo?.weilaNum || `User ${member.memberInfo.userId}`
}
</script>

<template>
  <div class="h-full flex">
    <!-- Group List (left sidebar) -->
    <div class="w-80 border-r border-neutral-200 bg-white overflow-hidden flex flex-col">
      <GroupList @select="handleSelectGroup" @create="handleCreateGroup" />
    </div>

    <!-- Right Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Empty State -->
      <div v-if="!selectedGroup" class="flex-1 flex items-center justify-center text-neutral-400">
        <div class="text-center">
          <span class="icon-[carbon--group] text-5xl mb-3 block"></span>
          <p class="text-sm">选择一个群组查看详情</p>
        </div>
      </div>

      <!-- Group Detail -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
              <img v-if="selectedGroup.avatar" :src="selectedGroup.avatar" :alt="selectedGroup.name"
                class="w-full h-full object-cover" />
              <span v-else class="icon-[carbon--group] text-2xl text-neutral-400"></span>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-neutral-900">{{ selectedGroup.name }}</h2>
              <p class="text-sm text-neutral-500">
                {{ selectedGroup.memberCount }} 位成员
                <span v-if="selectedGroup.isPublic" class="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">公开群</span>
                <span v-else class="ml-2 px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-xs">私有群</span>
              </p>
            </div>
          </div>
          <button @click="handleCloseDetail" class="p-1.5 rounded hover:bg-neutral-100 text-neutral-500">
            <span class="icon-[carbon--close] text-xl"></span>
          </button>
        </div>

        <!-- Members List -->
        <div class="flex-1 overflow-y-auto p-6">
          <h3 class="text-sm font-medium text-neutral-700 mb-3">成员列表</h3>
          <div v-if="loadingMembers" class="text-center py-8 text-neutral-500">
            加载中...
          </div>
          <div v-else-if="members.length === 0" class="text-center py-8 text-neutral-400">
            暂无成员
          </div>
          <div v-else class="space-y-2">
            <div v-for="member in members" :key="member.memberInfo.combo_gid_uid"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50">
              <div class="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
                <img v-if="member.userInfo?.avatar" :src="member.userInfo.avatar" :alt="getMemberDisplayName(member)"
                  class="w-full h-full object-cover" />
                <span v-else class="icon-[carbon--user] text-lg text-neutral-400"></span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ getMemberDisplayName(member) }}</p>
                <p class="text-xs text-neutral-500">ID: {{ member.memberInfo.userId }}</p>
              </div>
              <span v-if="getMemberRole(member) === 'owner'"
                class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">群主</span>
              <span v-else-if="getMemberRole(member) === 'admin'"
                class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">管理员</span>
            </div>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="px-6 py-4 border-t border-neutral-200 bg-white shrink-0 flex gap-3">
          <button @click="handleEnterChat"
            class="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center justify-center gap-2">
            <span class="icon-[carbon--chat]"></span>
            进入群聊
          </button>
          <button v-if="!selectedGroup.isPublic" @click="handleJoinGroup(selectedGroup.groupId)"
            class="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 text-sm font-medium">
            加入群组
          </button>
          <button @click="handleQuitGroup(selectedGroup.groupId)"
            class="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">
            退出群组
          </button>
        </div>
      </div>
    </div>

    <!-- Create Group Modal -->
    <CreateGroupModal ref="createModalRef" :visible="showCreateModal" @close="showCreateModal = false"
      @created="handleGroupCreated" />
  </div>
</template>
