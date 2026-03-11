import { shallowRef } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { WeilaCore, initLogger, setLoggerEnabled, setConfigData, WL_ConfigID } from '@weilasdk/core'
import type { WL_IDbUserInfo } from '@weilasdk/core'

export const useWeilaStore = defineStore('weila', () => {
  const core = shallowRef<WeilaCore | null>(null)
  const userInfo = shallowRef<WL_IDbUserInfo | null>(null)

  async function init() {
    if (core.value) return core.value

    initLogger('MOD:*, CORE:*, AUDIO:*, DB:, NET:*')
    setLoggerEnabled(false)

    // 配置 WASM 资源路径（Vite 开发模式需要）
    setConfigData([
      {
        id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
        url: '/opuslibs.wasm',
        version: 2,
      },
    ])

    const instance = new WeilaCore()
    instance.weila_setWebSock('wss://wss.weila.hk:8999')
    instance.weila_setAuthInfo('102053', '968cd0664d239c02bafb214d16fea415')

    await instance.weila_init()
    userInfo.value = await instance.weila_login('12679166', '30215594', '0')

    core.value = instance

    return instance
  }

  return { core, userInfo, init }
})

// Pinia HMR —— 替代手动 import.meta.hot.dispose/data 模式
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWeilaStore, import.meta.hot))
}
