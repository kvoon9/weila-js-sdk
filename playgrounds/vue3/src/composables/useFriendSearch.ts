import { ref } from 'vue'
import type { Ref } from 'vue'
import type { WeilaCore } from '@vois/weila-sdk-core'

export function useFriendSearch(weilaCore: Ref<WeilaCore | null>) {
  const searchResults = ref<Array<{ userId: string; name: string; avatar?: string }>>([])
  const searching = ref(false)

  async function search(key: string) {
    if (!weilaCore.value || !key.trim()) {
      searchResults.value = []
      return
    }

    searching.value = true
    try {
      const users = await weilaCore.value.weila_searchUserInfos(key)
      searchResults.value = users.map((u) => ({
        userId: String(u.userId),
        name: u.nick || u.userId.toString(),
        avatar: u.avatar,
      }))
    } catch (err) {
      console.error('[FriendSearch] Search failed:', err)
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }

  function clearSearch() {
    searchResults.value = []
  }

  return { searchResults, searching, search, clearSearch }
}
