# 微喇网页SDK (Weila Web SDK) 使用文档

## 1. 概述

微喇网页SDK (Weila Web SDK) 是一款基于 TypeScript 开发的通信平台软件开发工具包。它为 Web 应用提供了强大的实时通信能力，涵盖了 WebSocket 组网、音视频流处理、Protobuf 协议消息交互以及基于 IndexedDB 的本地存储方案。

### 核心能力

- **实时网络通信**: 基于 WebSocket 的长连接管理与心跳维护。
- **高级音频处理**: 集成 Opus 编解码技术（支持 WASM 加速），提供高质量的语音通话与 PTT 对讲体验。
- **高效消息协议**: 使用 Google Protobuf 定义消息结构，确保数据传输的高效性与安全性。
- **本地持久化**: 利用 Dexie (IndexedDB) 实现消息、会话、好友、群组等数据的本地存储，提升应用响应速度。

### 架构设计

SDK 采用模块化设计，以 `WeilaCore` 为核心，下设多个功能模块：

- **LoginModule**: 处理认证、登录与登出。
- **SessionModule**: 管理会话列表及设置。
- **FriendModule**: 处理好友关系及邀请。
- **GroupModule**: 管理群组创建、成员及权限。
- **UserModule**: 用户信息查询与搜索。
- **BusinessModule**: 提供客服会话与业务流转。
- **LocationModule**: 提供地理位置上报与共享服务。

---

## 2. 安装与配置

### 环境要求

- Node.js 环境 (推荐 LTS 版本)
- 支持 ES6+ 及 Web Audio API 的现代浏览器

### 安装

在项目中通过 npm 安装 SDK：

```bash
npm install weilasdk
```

### 导出项说明

SDK 入口点主要导出以下内容：

- **`WeilaCore`**: SDK 核心类，所有业务功能的入口。
- **`getErrorMsg`**: 将 SDK 抛出的错误码字符串解析为中文描述的工具函数。
- **`setConfigData`**: 用于配置 SDK 静态资源（如 WASM 文件、提示音）的函数。
- **`WL_ConfigID`**: 静态资源配置项 ID 的枚举。
- **`SetConfigDataParam`**: 配置参数接口定义。

### 类型与日志重导出

SDK 还从 `weilasdk_data` 导出了所有数据库相关的接口类型（`WL_IDb*`）和事件 ID（`WL_ExtEventID`），从 `weilasdk_log` 导出了日志初始化工具（`initLogger`, `getLogger`）。

---

## 3. 快速入门

以下是一个完整的初始化与登录流程示例。

### 第一步：引入 SDK 并创建实例

在 Vue 3 项目中，建议使用 `markRaw` 避免响应式代理干扰 SDK 内部逻辑。

```typescript
import { markRaw } from 'vue';
import { WeilaCore, initLogger } from 'weilasdk';

// 初始化日志 (可选)
initLogger('MOD:*, CORE:*, AUDIO:*, DB:*, NET:*');

const weila = markRaw(new WeilaCore());
```

### 第二步：注册事件回调

```typescript
weila.weila_onEvent((eventId, eventData) => {
  console.log(`收到事件 [${eventId}]:`, eventData);
});
```

### 第三步：配置服务器并登录

```typescript
async function startApp() {
  try {
    // 设置服务器地址与应用信息
    weila.weila_setWebSock('wss://api.example.com/ws');
    weila.weila_setAuthInfo('YOUR_APP_ID', 'YOUR_APP_KEY');

    // 初始化资源
    await weila.weila_init();

    // 登录 (countryCode '0' 为微喇号，'86' 为中国手机号)
    const userInfo = await weila.weila_login('account', 'password', '86');
    console.log('登录成功:', userInfo);
  } catch (err) {
    console.error('操作失败:', err);
  }
}
```

### 第四步：激活音频系统

由于浏览器的安全限制，音频系统初始化必须在用户点击等交互事件中触发。

```html
<button @click="initAudio">进入对讲</button>

<script setup>
  async function initAudio() {
    await weila.weila_audioInit();
    console.log('音频系统已就绪');
  }
</script>
```

---

## 4. 资源配置

SDK 依赖一些二进制资源（如 Opus 解码 WASM 和提示音）。默认情况下，SDK 会加载内置的资源，但在某些环境下（如 UniApp 或 CDN 部署），你可能需要手动指定资源地址。

### `WL_ConfigID` 枚举

| 枚举值                        | 描述           |
| :---------------------------- | :------------- |
| `WL_RES_RING_START_PLAY_ID`   | 播放开始提示音 |
| `WL_RES_RING_STOP_PLAY_ID`    | 播放停止提示音 |
| `WL_RES_RING_START_RECORD_ID` | 录音开始提示音 |
| `WL_RES_RING_STOP_RECORD_ID`  | 录音停止提示音 |
| `WL_RES_DATA_OPUS_WASM_ID`    | Opus WASM 文件 |

### `setConfigData` 方法

用于覆盖默认的资源 URL。

```typescript
import { setConfigData, WL_ConfigID } from 'weilasdk';

setConfigData([
  {
    id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
    url: '/static/wasm/opuslibs.wasm',
    version: 1,
  },
]);
```

---

## 5. 认证与登录

### `weila_setWebSock(webSock: string): void`

设置 WebSocket 服务器地址。

### `weila_setAuthInfo(appId: string, appKey: string): void`

设置应用的认证 ID 和秘钥。

### `weila_init(): Promise<boolean>`

初始化 SDK，主要用于加载必要的静态资源和配置环境。

### `weila_login(account, password, countryCode): Promise<WL_IDbUserInfo>`

用户登录。

- **account**: 账号（微喇号、手机号或邮箱）。
- **password**: 密码。
- **countryCode**: 国家码（'0' 代表微喇号，'86' 代表中国手机号）。

### `weila_logout(): Promise<boolean>`

登出当前账号并清理会话状态。

### `weila_get_token(): Promise<string>`

获取当前已登录用户的认证 Token。

### `weila_audioInit(): Promise<boolean>`

初始化音频上下文。**必须在用户触发的事件（如 click）中调用**，否则会被浏览器阻止。

---

## 6. 事件系统

SDK 通过 `weila_onEvent` 方法提供统一的异步通知机制。

### `weila_onEvent(callback: WL_ExtEventCallback): void`

注册 SDK 全局事件监听器。

```typescript
(eventId: WL_ExtEventID, eventData: any) => void
```

### 全局事件列表 (`WL_ExtEventID`)

| 事件 ID                              | 描述                                 | 数据类型                      |
| :----------------------------------- | :----------------------------------- | :---------------------------- |
| `WL_EXT_DATA_PREPARE_IND`            | 登录后数据准备状态（同步历史消息等） | `WL_DataPrepareInd`           |
| `WL_EXT_SYSTEM_EXCEPTION_IND`        | 系统遇到不可恢复的异常               | `string` (异常原因)           |
| `WL_EXT_PTT_PLAY_IND`                | 语音播放状态通知                     | `WL_PttPlayInd`               |
| `WL_EXT_PTT_RECORD_IND`              | 对讲录音状态通知                     | `WL_PttRecordInd`             |
| `WL_EXT_MSG_SEND_IND`                | 消息发送结果通知                     | `WL_IDbMsgData`               |
| `WL_EXT_NEW_MSG_RECV_IND`            | 收到新消息通知                       | `WL_IDbMsgData`               |
| `WL_EXT_NEW_SESSION_OPEN_IND`        | 自动创建了新会话                     | `WL_IDbSession`               |
| `WL_EXT_NEW_NOTIFICATION_IND`        | 收到新的好友或群通知                 | `WL_IDbNotification`          |
| `WL_EXT_GROUP_MODIFIED_IND`          | 群属性发生变更                       | `WL_IDbGroup`                 |
| `WL_EXT_GROUP_MEMBERS_MODIFIED_IND`  | 群成员列表有更新                     | `WL_IDbGroupMember[]`         |
| `WL_EXT_GROUP_DELETED_IND`           | 群组被解散或删除                     | `WL_IDbGroup`                 |
| `WL_EXT_GROUP_MEMBER_DELETED_IND`    | 群成员被删除                         | `WL_GroupMemberDeleteInfo`    |
| `WL_EXT_GROUP_NEW_MEMBER_JOINED_IND` | 有新成员加入群组                     | `WL_IDbGroupMember`           |
| `WL_EXT_FRIEND_DELETED_IND`          | 好友被删除                           | `number` (userId)             |
| `WL_EXT_FRIEND_MODIFIED_IND`         | 好友信息更新                         | `WL_IDbFriend`                |
| `WL_EXT_FRIEND_NEW_IND`              | 新增好友通知                         | `WL_IDbFriend`                |
| `WL_EXT_COMMON_SESSION_CHANGE_IND`   | 客服服务会话变更通知                 | `WL_IDbServiceSessionInfo`    |
| `WL_EXT_COMMON_STAFF_INVITE_IND`     | 客服系统邀请通知                     | `WL_StaffInvite`              |
| `WL_EXT_COMMON_ANSWER_INVITE_IND`    | 客服系统邀请应答通知                 | `WL_CommonAnswerStaffInvite`  |
| `WL_EXT_STAFF_ACCEPT_SESSION_IND`    | 客服已接受会话                       | `WL_StaffSessionInfo`         |
| `WL_EXT_STAFF_EXIT_SESSION_IND`      | 客服已退出会话                       | `WL_StaffSessionInfo`         |
| `WL_EXT_STAFF_CLOSE_SESSION_IND`     | 客服已关闭会话                       | `WL_StaffSessionInfo`         |
| `WL_EXT_STAFF_SESSION_INVITE_IND`    | 客服会话内邀请通知                   | `WL_ServiceSessionInvite`     |
| `WL_EXT_STAFF_ANSWER_INVITE_IND`     | 客服会话邀请应答通知                 | `WL_StaffAnswerSessionInvite` |
| `WL_EXT_STAFF_REMOVED_SESSION_IND`   | 服务会话被移除                       | `string` (sessionId)          |
| `WL_EXT_DEVICE_BINDING_ANSWER_IND`   | 设备绑定应答通知                     | `WL_bindAnswerInfo`           |

---

## 7. 会话管理

会话代表了与个人、群组或客服号的交互。

### 会话类型 (`WL_IDbSessionType`)

- `SESSION_INDIVIDUAL_TYPE` (0x01): 个人私聊。
- `SESSION_GROUP_TYPE` (0x02): 群组会话。
- `SESSION_SERVICE_TYPE` (0x08): 客服号会话。

### 常用方法

- **`weila_getSession(sessionId, sessionType): WL_IDbSession|undefined`**: 从内存缓存获取会话。
- **`weila_getSessions(): WL_IDbSession[]`**: 获取内存中所有的会话列表。
- **`weila_getSessionFromDb(sessionId, sessionType): Promise<WL_IDbSession|undefined>`**: 从数据库获取。
- **`weila_getSessionsFromDb(): Promise<WL_IDbSession[]>`**: 从数据库获取所有会话列表。
- **`weila_startNewSession(sessionId, sessionType, extra?): Promise<WL_IDbSession>`**: 创建或打开一个会话。
- **`weila_deleteSession(sessionId, sessionType): Promise<boolean>`**: 从服务器、数据库和内存中彻底删除会话。
- **`weila_clearSession(sessionId, sessionType): Promise<boolean>`**: 仅清除会话内的消息内容。
- **`weila_getSessionSetting(sessionId, sessionType): Promise<WL_IDbSessionSetting|undefined>`**: 获取会话配置（如是否开启 TTS、禁音等）。
- **`weila_updateSessionSetting(sessionId, sessionType, settingParam): Promise<boolean>`**: 更新会话配置项。

---

## 8. 消息管理

### 发送消息

- **`weila_sendTextMsg(sessionId, sessionType, text): Promise<boolean>`**: 发送文本消息。
- **`weila_sendImage(sessionId, sessionType, imageName, imageFile: File): Promise<boolean>`**: 发送图片文件。
- **`weila_sendFile(sessionId, sessionType, filename, fileData: File): Promise<boolean>`**: 发送通用文件。
- **`weila_sendVideo(sessionId, sessionType, videoName, videoFile: File): Promise<boolean>`**: 发送视频文件。
- **`weila_sendPosition(sessionId, sessionType, position: WL_IDbLocationShared): Promise<boolean>`**: 发送地理位置分享。
- **`weila_sendAudioMsg(sessionId, sessionType, audioUrl, frameCount?): Promise<boolean>`**: 发送音频 URL 消息（通常为历史录音）。
- **`weila_sendPttAudioData(sessionId, sessionType, audioData: Uint8Array): Promise<boolean>`**: 发送 PTT 音频流数据。

### 获取消息

- **`weila_getMsgData(comboId: string): Promise<WL_IDbMsgData>`**: 通过组合 ID 获取单条消息详情。
- **`weila_getMsgDatas(sessionId, sessionType, fromMsgId, count): Promise<WL_IDbMsgData[]>`**: 分页获取消息。**注意：返回的列表已按时间倒序排列（最新消息在前）。**

### 其他工具

- **`weila_updateMsgData(msgData: WL_IDbMsgData): Promise<string>`**: 手动更新本地数据库中的消息状态。
- **`weila_uploadImageCache(sessionId, sessionType, imageFile: File): Promise<string>`**: 上传图片到 OSS 并返回远程 URL 地址。

---

## 9. 语音播放

SDK 提供了对音频消息的便捷播放控制。

### 播放控制

- **`weila_playSingle(audioMsgData: WL_IDbMsgData): Promise<boolean>`**: 播放单条音频消息，会自动停止当前正在播放的内容。
- **`weila_stopSingle(): void`**: 停止当前所有播放。
- **`weila_playHistoryList(audioMsgDatas: WL_IDbMsgData[]): Promise<boolean>`**: 顺序播放一个音频消息列表。
- **`weila_playNext(): void`**: 跳过当前正在播放的内容，播放队列中的下一条。

---

## 10. 对讲功能 (PTT)

PTT (Push-to-Talk) 是微喇 SDK 的核心功能，采用“申请话权 → 录音传输 → 释放话权”的生命周期。

### 生命周期流程

1. **申请话权**: 调用 `weila_requestTalk`。如果成功，系统会开始采集麦克风音频。
2. **状态感知**: 收到 `WL_EXT_PTT_RECORD_IND` 事件，状态为 `PTT_AUDIO_RECORDING_START` 或 `PTT_AUDIO_RECORDING`。
3. **释放话权**: 调用 `weila_releaseTalk` 结束对讲，SDK 会自动停止录音并将剩余数据发送完毕。

### 相关方法

- **`weila_requestTalk(sessionId, sessionType): Promise<boolean>`**: 申请当前会话的话权。
- **`weila_releaseTalk(): Promise<boolean>`**: 释放话权。

---

## 11. 群管理

### 创建与加入

- **`weila_createGroup(name, groupType, groupIcon, publicType, memberUserIdList): Promise<WL_IDbGroup>`**: 创建一个新群组。
- **`weila_joinGroup(groupId, detail?, password?): Promise<boolean>`**: 申请加入群组。
- **`weila_answerGroupJoin(groupId, joinId, answerStatus): Promise<boolean>`**: 管理员处理入群申请。
- **`weila_answerGroupInvitation(groupId, invitorId, status): Promise<boolean>`**: 用户处理受邀入群。

### 成员与信息

- **`weila_getAllGroups(): Promise<WL_IDbGroup[]>`**: 获取所有已加入的群组列表。
- **`weila_getGroup(groupId): Promise<WL_IDbGroup|undefined>`**: 获取本地群组信息。
- **`weila_getGroupFromServer(groupId): Promise<WL_IDbGroup|undefined>`**: 从服务器拉取最新群组详情。
- **`weila_getGroupMembers(groupId): Promise<WL_IDbGroupMember[]>`**: 获取群成员列表。
- **`weila_getOnlineMemberIds(groupId): Promise<number[]>`**: 获取群内当前在线的成员 ID 列表。

### 权限与退出

- **`weila_changeGroupOwner(groupId, ownerUserId): Promise<boolean>`**: 转让群主。
- **`weila_changeMemberType(groupId, memberUserId, memberType): Promise<boolean>`**: 设置或取消管理员。
- **`weila_deleteMembers(groupId, memberUserIds): Promise<boolean>`**: 移除群成员。
- **`weila_quitGroup(groupId): Promise<boolean>`**: 退出群组（群主必须先转让群权或解散群）。
- **`weila_dismissGroup(groupId): Promise<boolean>`**: 解散群组（仅群主可用）。

---

## 12. 好友管理

- **`weila_getFriends(userIds?): Promise<WL_IDbFriend[]>`**: 获取好友列表，可指定 userId 过滤。
- **`weila_getOnlineFriends(): Promise<WL_IDbFriend[]>`**: 获取当前在线的好友。
- **`weila_inviteFriend(inviteeId, detail, remark): Promise<boolean>`**: 发送好友申请。
- **`weila_answerFriendInvite(inviterUserId, answerStatus, info): Promise<boolean>`**: 处理好友申请。
- **`weila_deleteFriends(userIds): Promise<boolean>`**: 删除好友。

---

## 13. 用户管理

- **`weila_getUserInfo(userId): Promise<WL_IDbUserInfo|undefined>`**: 获取指定用户信息。
- **`weila_getUserInfos(userIdList): Promise<WL_IDbUserInfo[]>`**: 批量获取用户信息。
- **`weila_searchUserInfos(key): Promise<WL_IDbUserInfo[]>`**: 通过微喇号或手机号搜索用户。

---

## 14. 设备管理 (分机/外设)

- **`weila_bindDevice(verifyCode): Promise<number>`**: 通过验证码绑定新设备（分机）。
- **`weila_unbindDevice(deviceUserId): Promise<number>`**: 解绑指定设备。
- **`weila_getExtensions(): Promise<WL_IDbExtension[]>`**: 获取当前账号关联的设备列表。
- **`weila_setDeviceConfig(cfgKey, cfgValue, subUserId): Promise<string>`**: 设置远程设备的配置参数。

---

## 15. 位置服务

- **`weila_getLocation(sessionId, sessionType): Promise<WL_IDbLocationInfo[]>`**: 获取会话中所有成员的最新位置。
- **`weila_sendPosition(sessionId, sessionType, position): Promise<boolean>`**: 主动共享当前位置。

---

## 16. 通知系统

- **`weila_getAllTypeNotifications(): Promise<WL_IDbNotification[]>`**: 获取所有类型的系统通知（如入群申请、好友申请）。
- **`weila_updateNotification(notification): Promise<number>`**: 更新通知的状态（如标记已读）。

---

## 17. 客服服务

- **`weila_getServiceSession(sessionId): Promise<WL_IDbServiceSessionInfo|undefined>`**: 获取客服会话详情。
- **`weila_getServiceSessionId(serviceId, customerId): string`**: 根据服务 ID 和客户 ID 生成唯一的会话 ID。
- **`weila_staffAcceptSession(sessionId): Promise<boolean>`**: 客服人员接受服务请求。
- **`weila_staffExitSession(sessionId): Promise<boolean>`**: 客服人员退出当前服务。
- **`weila_staffCloseSession(sessionId): Promise<boolean>`**: 客服人员关闭（完结）服务会话。
- **`weila_staffSearchStaffs(serviceId, pageIndex, pageSize): Promise<WL_IDbServiceStaffInfo[]>`**: 查询特定客服号下的所有工作人员。

---

## 18. 错误处理

SDK 的异步方法在失败时会抛出特定格式的错误字符串。

### 错误解析

你可以使用 `getErrorMsg(errorStr)` 函数将错误转换为友好的中文提示：

```typescript
try {
    await weila.weila_login(...);
} catch (err) {
    const message = getErrorMsg(err);
    alert(`登录失败: ${message}`);
}
```

### 常见错误码列表

| 错误码 | 对应常量                               | 中文含义       |
| :----- | :------------------------------------- | :------------- |
| 0      | `RESULT_SUCCESS`                       | 成功           |
| 1      | `RESULT_FAILURE`                       | 失败           |
| 2      | `RESULT_DISCONNECT`                    | 连接中断       |
| 10     | `RESULT_DB_EXCEPTION`                  | 数据库异常     |
| 14     | `RESULT_SERVER_EXCEPTION`              | 服务器异常     |
| 20     | `RESULT_PARAM_INVALID`                 | 参数错误       |
| 31     | `RESULT_AUTH_INVALID`                  | 认证无效       |
| 41     | `RESULT_PASSWORD_ERROR`                | 密码错误       |
| 55     | `RESULT_LOGIN_ACCOUNT_OR_PASSWD_ERROR` | 账号或密码错误 |
| 100    | `RESULT_USER_NOT_EXIST`                | 用户不存在     |
| 200    | `RESULT_GROUP_NOT_EXIST`               | 群组不存在     |
| 214    | `RESULT_GROUP_YOU_ARE_SHUTUP`          | 你已被禁言     |
| 500    | `RESULT_BUSINESS_SERVICE_CLOSED`       | 服务已关闭     |

_(注：SDK 内部定义了超过 70 个错误码，建议始终使用 `getErrorMsg` 进行动态解析。)_

---

## 19. 日志系统

SDK 内部包含详细的调试日志。

### 日志初始化

```typescript
import { initLogger } from 'weilasdk';

// 开启所有核心模块的日志，排除底层的 socket-client 细节
initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*, -socket-client:*');
```

### 模块前缀说明

- `CORE`: 核心调度逻辑。
- `MOD`: 业务模块逻辑。
- `FSM`: 状态机转换。
- `AUDIO`: 音频采集与播放。
- `DB`: 数据库操作。
- `NET`: 网络连接与传输。
- `CFG`: 配置与资源加载。

---

## 20. 完整类型参考

### `WL_IDbUserInfo` (用户信息)

| 属性名     | 类型     | 描述        |
| :--------- | :------- | :---------- |
| `userId`   | `number` | 用户唯一 ID |
| `weilaNum` | `string` | 微喇号      |
| `nick`     | `string` | 昵称        |
| `avatar`   | `string` | 头像 URL    |
| `phone`    | `string` | 手机号      |
| `userType` | `number` | 用户类型    |

### `WL_IDbMsgData` (消息数据)

| 属性名      | 类型                  | 描述                          |
| :---------- | :-------------------- | :---------------------------- |
| `msgId`     | `number`              | 消息序列 ID                   |
| `senderId`  | `number`              | 发送者 ID                     |
| `sessionId` | `string`              | 所属会话 ID                   |
| `msgType`   | `WL_IDbMsgDataType`   | 消息类型 (文本/音频/图片等)   |
| `textData`  | `string`              | 文本内容                      |
| `audioData` | `WL_IDbAudioData`     | 音频数据详情                  |
| `created`   | `number`              | 发送时间戳                    |
| `status`    | `WL_IDbMsgDataStatus` | 消息状态 (发送中/已发送/失败) |

---

## 21. 框架集成指南

### Vue 2/3

- **实例管理**: 推荐将 `WeilaCore` 实例挂载到全局原型或通过 `provide/inject` 分发。
- **响应式脱离**: 使用 `markRaw` 处理 SDK 实例，防止 Vue 的 Proxy 劫持 SDK 内部的私有状态或 Web Worker。
- **动态导入**: 如果需要减小首屏体积，可以采用动态 `import()` 加载 SDK。

### UniApp (小程序/App)

1. **静态资源拷贝**: 将 `public/assets/` 下的资源手动拷贝到 UniApp 的 `static/weilasdk/` 目录。
2. **重映射资源**: 在初始化前调用 `setConfigData` 指向小程序内的静态路径。
3. **音频权限**: 确保在 `manifest.json` 中声明了录音权限（麦克风使用权限）。

### 代理配置 (Nginx/Webpack)

确保以下端点配置了正确的代理或跨域策略：

- `/v1` → 指向 Web API 服务。
- `/audio` → 指向语音存储 OSS。
- `/avatar` → 指向头像存储 OSS。
- `/ptt` → 指向对讲流处理服务。
