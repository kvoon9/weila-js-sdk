# Vue 3 项目集成

## 安装

```bash
npm install weilasdk
```

## 初始化 SDK

### 方法一：Vue Plugin（推荐）

创建 `src/plugins/weila.ts`：

```typescript
import { WeilaCore, setConfigData, WL_ConfigID, initLogger } from 'weilasdk';
import { App } from 'vue';

let weilaInstance: WeilaCore | null = null;

export function initWeilaSDK(app: App) {
  // 创建实例，使用 markRaw 避免 Vue 响应式代理
  weilaInstance = new WeilaCore();

  // 初始化日志
  initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*, -socket-client:*');

  // 设置服务器
  weilaInstance.weila_setWebSock(import.meta.env.VITE_WS_URL);
  weilaInstance.weila_setAuthInfo(import.meta.env.VITE_APP_ID, import.meta.env.VITE_APP_KEY);

  // 注册事件
  weilaInstance.weila_onEvent((eventId, data) => {
    console.log('[Weila]', eventId, data);
  });

  // 提供给全局
  app.config.globalProperties.$weila = weilaInstance;

  return weilaInstance;
}

export function getWeila(): WeilaCore {
  if (!weilaInstance) {
    throw new Error('Weila SDK 未初始化');
  }
  return weilaInstance;
}
```

在 `main.ts` 中使用：

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { initWeilaSDK } from './plugins/weila';

const app = createApp(App);
const weila = initWeilaSDK(app);

app.mount('#app');
```

### 方法二：Composable

创建 `src/composables/useWeila.ts`：

```typescript
import { ref, shallowRef, onMounted } from 'vue';
import { WeilaCore, initLogger } from 'weilasdk';

const weila = shallowRef<WeilaCore | null>(null);
const isReady = ref(false);
const isLoginReady = ref(false);

export function useWeila() {
  const init = async () => {
    if (weila.value) return;

    // 使用 shallowRef 避免深度响应式
    weila.value = new WeilaCore();

    initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*');

    // 设置配置
    weila.value.weila_setWebSock(import.meta.env.VITE_WS_URL);
    weila.value.weila_setAuthInfo(import.meta.env.VITE_APP_ID, import.meta.env.VITE_APP_KEY);

    // 监听事件
    weila.value.weila_onEvent((eventId, data) => {
      console.log('[Weila]', eventId, data);

      // 处理登录就绪
      if (eventId === 'WL_EXT_DATA_PREPARE_IND' && data?.state === 'PREPARE_SUCC_END') {
        isReady.value = true;
      }
    });

    // 初始化
    await weila.value.weila_init();
  };

  const initAudio = async () => {
    if (!weila.value) return;
    await weila.value.weila_audioInit();
  };

  const login = async (account: string, password: string, countryCode: string) => {
    if (!weila.value) return;
    return await weila.value.weila_login(account, password, countryCode);
  };

  return {
    weila,
    isReady,
    isLoginReady,
    init,
    initAudio,
    login,
  };
}
```

在组件中使用：

```vue
<template>
  <button @click="handleLogin">登录</button>
</template>

<script setup lang="ts">
import { useWeila } from '@/composables/useWeila';

const { init, initAudio, login } = useWeila();

onMounted(async () => {
  await init();
});

const handleLogin = async () => {
  // 音频必须在用户点击事件中初始化
  await initAudio();
  await login('13800138000', 'password', '86');
};
</script>
```

## 注意事项

### markRaw 或 shallowRef

Vue 的响应式系统会对对象进行深层代理，这会导致：

- 性能问题
- SDK 内部状态异常

**解决方案**：

1. 使用 `markRaw()` 包装实例
2. 或使用 `shallowRef()` 代替 `ref()`

```typescript
import { markRaw } from 'vue';

const weila = markRaw(new WeilaCore());
```

### 环境变量

在 `.env` 文件中：

```
VITE_WS_URL=wss://your-server.com
VITE_APP_ID=your-app-id
VITE_APP_KEY=your-app-key
```

### 类型声明

如需 TypeScript 支持，在 `src/types/weila.d.ts` 中：

```typescript
import type { WeilaCore } from 'weilasdk';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $weila: WeilaCore;
  }
}
```
