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
    instance.weila_setWebSock(import.meta.env.VITE_WEILA_WSS)
    instance.weila_setAuthInfo(
      import.meta.env.VITE_WEILA_APP_ID,
      import.meta.env.VITE_WEILA_APP_KEY,
    )

    await instance.weila_init()
    userInfo.value = await instance.weila_login(
      import.meta.env.VITE_WEILA_USER_ACCOUNT,
      import.meta.env.VITE_WEILA_USER_PASSWORD,
      '0',
    )

    core.value = instance

    return instance
  }

  return { core, userInfo, init }
})

// Pinia HMR —— 替代手动 import.meta.hot.dispose/data 模式
// if (import.meta.hot) {
//   import.meta.hot.accept(acceptHMRUpdate(useWeilaStore, import.meta.hot))
// }
