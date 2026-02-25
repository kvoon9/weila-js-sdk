# 调试指南

## 启用日志

### 全部日志

```typescript
import { initLogger } from 'weilasdk';

initLogger('*');
```

### 按模块日志

```typescript
// 只显示核心模块日志
initLogger('CORE:*');

// 显示多个模块
initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*');

// 排除特定模块
initLogger('*,-socket-client:*');
```

### 日志模块前缀

| 前缀 | 说明 |
|------|------|
| `MOD:*` | 所有模块 |
| `CORE:*` | 核心模块 |
| `FSM:*` | 状态机 |
| `AUDIO:*` | 音频模块 |
| `DB:*` | 数据库模块 |
| `NET:*` | 网络模块 |
| `CFG:*` | 配置模块 |
| `UTIL:*` | 工具模块 |

## 常见问题排查

### 1. 音频初始化失败

**症状**：`weila_audioInit()` 返回错误或无响应

**原因**：浏览器限制音频上下文必须在用户交互事件中创建

**解决方案**：

```typescript
// 错误 ❌ - 在 useEffect 中调用
useEffect(() => {
    weila.weila_audioInit();
}, []);

// 正确 ✓ - 在用户点击事件中调用
<button onClick={async () => {
    await weila.weila_audioInit();
}}>登录</button>
```

### 2. WebSocket 连接失败

**症状**：无法连接到 WebSocket 服务器

**排查步骤**：

1. 检查服务器地址是否正确

```typescript
// 开发环境
weila.weila_setWebSock('wss://your-dev-server.com');

// 生产环境
weila.weila_setWebSock('wss://your-prod-server.com');
```

2. 检查网络是否可达

```javascript
// 在浏览器控制台测试
const ws = new WebSocket('wss://your-server.com');
ws.onopen = () => console.log('连接成功');
ws.onerror = (e) => console.error('连接失败', e);
```

3. 检查代理配置（开发环境）

见 [proxy.md](proxy.md)

### 3. 登录失败

**症状**：`weila_login()` 返回错误

**常见错误码**：

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 106 | 账号或密码错误 | 检查账号密码是否正确 |
| 23 | 授权失效 | 检查 App ID/Key 是否正确 |
| 16 | APP版本太旧 | 需要更新 SDK 版本 |

**排查代码**：

```typescript
try {
    const userInfo = await weila.weila_login(account, password, countryCode);
} catch (error) {
    console.error('登录失败:', error);
    // 使用 getErrorMsg 解析错误
    const msg = getErrorMsg(error.message);
    console.log('错误信息:', msg);
}
```

### 4. 消息发送失败

**症状**：消息发送后状态异常或发送失败

**排查步骤**：

1. 检查登录状态

```typescript
console.log('isLoginReady:', weila.isLoginReady);
```

2. 检查网络状态

```typescript
weila.weila_onEvent((eventId, data) => {
    if (eventId === 'WL_EXT_SYSTEM_EXCEPTION_IND') {
        console.log('系统异常:', data);
    }
});
```

3. 检查消息状态

```typescript
weila.weila_onEvent((eventId, data) => {
    if (eventId === 'WL_EXT_MSG_SEND_IND') {
        console.log('消息状态:', data.status);
    }
});
```

### 5. PTT 对讲问题

**症状**：无法申请发言或录音

**排查步骤**：

1. 检查麦克风权限

```typescript
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => console.log('麦克风权限已授予'))
    .catch(err => console.error('麦克风权限被拒绝', err));
```

2. 检查 PTT 事件

```typescript
weila.weila_onEvent((eventId, data) => {
    if (eventId === 'WL_EXT_PTT_RECORD_IND') {
        console.log('PTT 录音状态:', data.state);
    }
});
```

3. 检查是否被禁言

```typescript
// 尝试获取群信息
const group = await weila.weila_getGroup(groupId);
console.log('群信息:', group);
```

### 6. 资源加载失败

**症状**：音频播放异常或 WASM 加载失败

**排查步骤**：

1. 检查资源路径

```typescript
// 在 setConfigData 之前打印
console.log('资源路径:', STATIC_BASE + 'opuslibs.wasm');
```

2. 检查文件是否存在于正确位置

```
/static/weilasdk/
├── start_player.wav
├── stop_player.wav
├── start_record.wav
├── stop_record.wav
└── opuslibs.wasm
```

3. 检查 WASM 支持

```javascript
// 检查浏览器是否支持 WebAssembly
console.log('WebAssembly supported:', typeof WebAssembly === 'object');
```

## 调试技巧

### 1. 断点调试

在关键位置设置断点：

```typescript
// 登录前
const userInfo = await weila.weila_login(account, password, countryCode);

// 消息发送后
await weila.weila_sendTextMsg(sessionId, sessionType, text);
```

### 2. 事件监听

监听所有事件：

```typescript
weila.weila_onEvent((eventId, data) => {
    console.log(`事件: ${eventId}`, JSON.stringify(data, null, 2));
});
```

### 3. 网络抓包

使用浏览器开发者工具：

1. 打开 Network 面板
2. 筛选 WebSocket 连接
3. 查看消息收发

### 4. 检查 IndexedDB

SDK 使用 IndexedDB 存储数据：

1. 打开 Application 面板
2. 展开 IndexedDB
3. 检查 `WeilaDB`、`WeilaConfigDB` 数据库

## 获取帮助

如果以上方法无法解决问题：

1. 收集日志信息
2. 记录复现步骤
3. 联系技术支持
