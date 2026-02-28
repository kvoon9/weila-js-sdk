# Vue 2 项目集成

## 安装

```bash
npm install weilasdk
```

## 初始化 SDK

创建 `src/plugins/weila.js`：

```javascript
import { WeilaCore, initLogger } from 'weilasdk'

let weilaInstance = null

export function initWeilaSDK() {
  if (weilaInstance) {
    return weilaInstance
  }

  // 创建实例
  weilaInstance = new WeilaCore()

  // 初始化日志
  initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*')

  // 设置服务器（使用 Vue 2 的语法获取环境变量）
  weilaInstance.weila_setWebSock(process.env.WS_URL)
  weilaInstance.weila_setAuthInfo(process.env.APP_ID, process.env.APP_KEY)

  // 注册事件
  weilaInstance.weila_onEvent((eventId, data) => {
    console.log('[Weila]', eventId, data)
  })

  return weilaInstance
}

export function getWeila() {
  if (!weilaInstance) {
    throw new Error('Weila SDK 未初始化')
  }
  return weilaInstance
}
```

在 `main.js` 中使用：

```javascript
import Vue from 'vue'
import App from './App.vue'
import { initWeilaSDK } from './plugins/weila'

const weila = initWeilaSDK()

// 初始化 SDK
weila.weila_init().then(() => {
  console.log('Weila SDK 初始化完成')

  new Vue({
    render: (h) => h(App),
  }).$mount('#app')
})
```

## 组件中使用

```vue
<template>
  <div>
    <button @click="handleLogin">登录</button>
  </div>
</template>

<script>
import { getWeila } from '@/plugins/weila'

export default {
  name: 'App',
  methods: {
    async handleLogin() {
      const weila = getWeila()

      // 音频初始化必须在用户点击事件中调用
      await weila.weila_audioInit()

      // 登录
      const userInfo = await weila.weila_login('13800138000', 'password', '86')
      console.log('登录成功', userInfo)
    },
  },
}
</script>
```

## 注意事项

### Vue 2 响应式问题

Vue 2 的响应式系统会对 data 中的对象进行深度代理。**不要**将 WeilaCore 实例放在 data 中：

```javascript
// 错误 ❌
data() {
    return {
        weila: new WeilaCore()  // 不要这样做
    };
}

// 正确 ✓
data() {
    return {
        userInfo: null
    };
},
methods: {
    getWeila() {
        // 使用外部实例或单例
        return weilaInstance;
    }
}
```

### 环境变量

Vue 2 使用 `process.env`：

```javascript
// .env
WS_URL=wss://your-server.com
APP_ID=your-app-id
APP_KEY=your-app-key
```

需要安装 `dotenv` 并在 `vue.config.js` 中配置：

```javascript
// vue.config.js
module.exports = {
  chainWebpack: (config) => {
    config.plugin('define').tap((args) => {
      args[0]['process.env'].WS_URL = JSON.stringify(process.env.WS_URL)
      args[0]['process.env'].APP_ID = JSON.stringify(process.env.APP_ID)
      args[0]['process.env'].APP_KEY = JSON.stringify(process.env.APP_KEY)
      return args
    })
  },
}
```

### 登录后获取用户信息

```javascript
async login() {
    const weila = getWeila();

    try {
        const userInfo = await weila.weila_login('13800138000', 'password', '86');

        // 存储用户信息
        this.userInfo = userInfo;

        return userInfo;
    } catch (error) {
        console.error('登录失败', error);
    }
}
```
