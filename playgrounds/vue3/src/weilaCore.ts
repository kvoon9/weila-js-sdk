import { shallowRef } from 'vue'
import { computedAsync } from '@vueuse/core'
import { WeilaCore, initLogger, setLoggerEnabled, WL_ExtEventID } from '@weilasdk/core'
import type { WL_IDbUserInfo, WL_IDbSession } from '@weilasdk/core'

// ---- HMR 持久化：模块级单例 ----
let _core: WeilaCore | null = null
let _ready: Promise<WL_IDbUserInfo> | null = null

if (import.meta.hot) {
  if (import.meta.hot.data.core) {
    _core = import.meta.hot.data.core
    _ready = import.meta.hot.data.ready
  }
  import.meta.hot.dispose((data) => {
    data.core = _core
    data.ready = _ready
  })
}

// ---- 响应式状态 ----
export const sessions = shallowRef<WL_IDbSession[]>([])
export const userInfo = shallowRef<WL_IDbUserInfo | null>(null)

export const weilaCore = computedAsync<WeilaCore | null>(async () => {
  if (_core) {
    // HMR 恢复：同步用户信息
    if (_ready) userInfo.value = await _ready
    return _core
  }

  initLogger('MOD:*, CORE:*, AUDIO:*, DB:, NET:*')
  setLoggerEnabled(false)

  const core = new WeilaCore()
  core.weila_setWebSock('wss://wss.weila.hk:8999')
  core.weila_setAuthInfo('102053', '968cd0664d239c02bafb214d16fea415')

  core.weila_onEvent((eventId: WL_ExtEventID, eventData: any) => {
    if (eventId === WL_ExtEventID.WL_EXT_DATA_PREPARE_IND && eventData?.msg === 'SDK.SessionInit') {
      sessions.value = core.weila_getSessions()
    }
  })

  await core.weila_init()
  _ready = core.weila_login('12679166', '30215594', '0')
  userInfo.value = await _ready

  _core = core
  return core
}, null)

// 如果 HMR 恢复了实例，立即同步 sessions
if (_core) {
  sessions.value = _core.weila_getSessions()
}
