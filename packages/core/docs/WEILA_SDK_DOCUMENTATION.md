# 微喇 SDK 使用文档

## 目录

1. [概述](#1-概述)
2. [安装与初始化](#2-安装与初始化)
3. [核心 API](#3-核心-api)
4. [会话管理](#4-会话管理)
5. [消息收发](#5-消息收发)
6. [音频播放](#6-音频播放)
7. [PTT 对讲](#7-ptt-对讲)
8. [群组管理](#8-群组管理)
9. [好友管理](#9-好友管理)
10. [用户信息](#10-用户信息)
11. [设备管理](#11-设备管理)
12. [客服服务](#12-客服服务)
13. [位置服务](#13-位置服务)
14. [通知系统](#14-通知系统)
15. [事件系统](#15-事件系统)
16. [错误处理](#16-错误处理)
17. [日志配置](#17-日志配置)
18. [数据类型参考](#18-数据类型参考)

---

## 1. 概述

微喇 SDK 是一个基于 TypeScript 的网页端即时通讯 SDK，支持以下核心功能：

- **即时通讯**：文本、图片、语音、视频、文件、位置消息
- **PTT 对讲**：实时语音对讲功能
- **群组管理**：创建、解散、加入、退出群组
- **好友管理**：添加、删除好友
- **设备绑定**：主设备与子设备绑定
- **客服服务**：客服会话管理

### 模块架构

```
weilasdk/
├── main/               # 核心模块
│   ├── weila_core.ts          # 主入口类 WeilaCore
│   ├── weila_session_module.ts # 会话与消息模块
│   ├── weila_login_module.ts   # 登录认证模块
│   ├── weila_group_module.ts   # 群组管理模块
│   ├── weila_friend_module.ts  # 好友管理模块
│   ├── weila_user_module.ts    # 用户信息模块
│   ├── weila_location_module.ts # 位置服务模块
│   ├── weila_business_module.ts # 客服服务模块
│   ├── weila_config.ts         # 配置加载
│   ├── weila_utils.ts          # 工具函数
│   ├── weila_external_data.ts  # 外部数据类型
│   └── weila_internal_data.ts  # 内部数据类型
├── database/           # 数据库模块 (Dexie/IndexedDB)
│   ├── weila_db.ts            # 数据库操作
│   └── weila_db_data.ts       # 数据类型定义
├── fsm/                # 状态机模块 (XState)
│   └── weila_fsmScript.ts     # 状态机定义
├── audio/              # 音频处理模块
├── log/                # 日志模块
└── proto/              # Protobuf 消息模块
```

---

## 2. 安装与初始化

### 2.1 导入 SDK

```typescript
import { WeilaCore, setConfigData, WL_ConfigID } from 'weilasdk';
```

### 2.2 配置资源路径（可选）

如果需要自定义资源路径（如 UniApp、VUE2/3 项目），可在初始化前调用 `setConfigData`：

```typescript
import { setConfigData, WL_ConfigID } from 'weilasdk';

// 配置自定义资源路径
setConfigData([
    {
        id: WL_ConfigID.WL_RES_RING_START_PLAY_ID,
        url: 'https://your-cdn.com/start_player.wav',
        version: 1
    },
    {
        id: WL_ConfigID.WL_RES_RING_STOP_PLAY_ID,
        url: 'https://your-cdn.com/stop_player.wav',
        version: 1
    },
    {
        id: WL_ConfigID.WL_RES_RING_START_RECORD_ID,
        url: 'https://your-cdn.com/start_record.wav',
        version: 1
    },
    {
        id: WL_ConfigID.WL_RES_RING_STOP_RECORD_ID,
        url: 'https://your-cdn.com/stop_record.wav',
        version: 1
    },
    {
        id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
        url: 'https://your-cdn.com/opuslibs.wasm',
        version: 1
    }
]);
```

### 2.3 初始化流程

```typescript
// 创建 SDK 实例
const weila = new WeilaCore();

// 设置 WebSocket 地址（尽早调用）
weila.weila_setWebSock('wss://your-websocket-server.com');

// 设置 App 认证信息（尽早调用，最好在登录前）
weila.weila_setAuthInfo('your-app-id', 'your-app-key');

// 注册事件回调
weila.weila_onEvent((eventId, eventData) => {
    console.log('事件:', eventId, eventData);
});

// 初始化 SDK（首次较慢，之后会缓存）
await weila.weila_init();

// 初始化音频系统（必须在用户点击事件中调用）
await weila.weila_audioInit();
```

---

## 3. 核心 API

### 3.1 初始化与配置

| 方法 | 说明 |
|------|------|
| `weila_init()` | 初始化 SDK，加载资源 |
| `weila_setWebSock(addr: string)` | 设置 WebSocket 服务器地址 |
| `weila_setAuthInfo(appId: string, appKey: string)` | 设置 App 认证信息 |
| `weila_audioInit()` | 初始化音频系统（必须在用户事件中调用） |
| `weila_onEvent(callback: WL_ExtEventCallback)` | 注册事件回调 |

### 3.2 登录与登出

```typescript
// 登录
// account: 微喇号或手机号
// password: 密码
// countryCode: 国家码，微喇号为 '0'，手机号如 '86'
const userInfo = await weila.weila_login('13800138000', 'password', '86');

// 登出
await weila.weila_logout();

// 获取登录 token
const token = await weila.weila_get_token();

// 获取当前登录用户信息
const currentUser = weila.getLoginUserInfo();
```

| 方法 | 说明 |
|------|------|
| `weila_login(account, password, countryCode)` | 用户登录 |
| `weila_logout()` | 登出系统 |
| `weila_get_token()` | 获取当前登录用户 token |
| `getLoginUserInfo()` | 获取当前登录用户信息 |

---

## 4. 会话管理

### 4.1 获取会话

```typescript
// 从内存获取单个会话
const session = weila.weila_getSession(sessionId, sessionType);

// 获取内存中所有会话列表
const sessions = weila.weila_getSessions();

// 从数据库获取单个会话
const sessionFromDb = await weila.weila_getSessionFromDb(sessionId, sessionType);

// 从数据库获取所有会话
const allSessionsFromDb = await weila.weila_getSessionsFromDb();
```

### 4.2 创建与删除会话

```typescript
// 开启新会话（从好友或群选择聊天时先创建会话）
const newSession = await weila.weila_startNewSession(sessionId, sessionType, extra);

// 删除会话（同时删除服务器、数据库、内存中的会话）
await weila.weila_deleteSession(sessionId, sessionType);

// 清除会话中的所有消息
await weila.weila_clearSession(sessionId, sessionType);
```

### 4.3 会话设置

```typescript
// 获取会话设置
const setting = await weila.weila_getSessionSetting(sessionId, sessionType);

// 获取所有会话设置
const allSettings = await weila.weila_getSessionSettings();

// 更新会话设置
await weila.weila_updateSessionSetting(
    sessionId,
    sessionType,
    {
        tts: true,        // 开启 TTS 语音播报
        mute: false,      // 关闭静音
        loactionShared: true  // 开启位置共享
    }
);
```

### 4.4 会话类型

```typescript
import { WL_IDbSessionType } from 'weilasdk';

// 个人会话
WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE  // 0x01

// 群会话
WL_IDbSessionType.SESSION_GROUP_TYPE        // 0x02

// 服务号
WL_IDbSessionType.SESSION_SERVICE_TYPE       // 0x08
```

---

## 5. 消息收发

### 5.1 发送消息

```typescript
// 发送文本消息
await weila.weila_sendTextMsg(sessionId, sessionType, '你好');

// 发送图片
await weila.weila_sendImage(sessionId, sessionType, 'image.png', imageFile);

// 发送文件
await weila.weila_sendFile(sessionId, sessionType, 'document.pdf', fileData);

// 发送视频
await weila.weila_sendVideo(sessionId, sessionType, 'video.mp4', videoFile);

// 发送位置
await weila.weila_sendPosition(sessionId, sessionType, {
    locationType: 'share',
    latitude: 39.9042,
    longitude: 116.4074,
    title: '天安门广场',
    address: '北京市东城区'
});

// 发送音频消息（URL 形式）
await weila.weila_sendAudioMsg(sessionId, sessionType, audioUrl, frameCount);

// 发送 PTT 音频数据（Uint8Array 形式）
await weila.weila_sendPTTByAudioData(sessionId, sessionType, audioData);

// 直接发送 PTT 音频数据
await weila.weila_sendPttAudioData(sessionId, sessionType, audioData);
```

### 5.2 获取消息

```typescript
// 根据 comboId 获取单条消息
const msgData = await weila.weila_getMsgData(comboId);

// 获取会话消息列表
// fromMsgId: 起始消息 ID，0 表示从最新消息往后取
// count: 获取数量
const messages = await weila.weila_getMsgDatas(
    sessionId,
    sessionType,
    fromMsgId,
    count
);

// 更新消息数据
await weila.weila_updateMsgData(msgData);

// 获取音频数据（下载音频消息的二进制数据）
const audioData = await weila.weila_fetchAudioData(audioUrl);
```

### 5.3 消息类型

```typescript
import { WL_IDbMsgDataType, WL_IDbMsgDataStatus } from 'weilasdk';

// 消息类型
WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE      // 文本
WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE     // 音频
WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE     // 图片
WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE     // 视频
WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE      // 文件
WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE   // 位置
WL_IDbMsgDataType.WL_DB_MSG_DATA_COMMAND_TYPE   // 命令
WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE       // PTT
WL_IDbMsgDataType.WL_DB_MSG_DATA_SERVICE_TYPE   // 服务
WL_IDbMsgDataType.WL_DB_MSG_DATA_SWITCH_TYPE   // 切换
WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE // 撤回

// 消息状态
WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW      // 新消息
WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT     // 已发送
WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT  // 未发送
WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ     // 已读
WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENDING  // 发送中
WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_WITHDRAW // 已撤回
WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR      // 错误
```

---

## 6. 音频播放

```typescript
// 播放单条语音（连续执行会停止前一条再播放新的）
await weila.weila_playSingle(audioMsgData);

// 停止单条语音播放
weila.weila_stopSingle();

// 播放历史语音列表
await weila.weila_playHistoryList(audioMsgDatas);

// 播放下一条（用于实时语音，跳过当前播放）
weila.weila_playNext();
```

**注意**：`weila_audioInit()` 必须在用户点击事件中调用，因为浏览器限制音频上下文必须在用户交互后才能创建。

---

## 7. PTT 对讲

```typescript
// 申请发言
await weila.weila_requestTalk(sessionId, sessionType);

// 释放发言
await weila.weila_releaseTalk();
```

**PTT 事件监听**：

```typescript
weila.weila_onEvent((eventId, eventData) => {
    if (eventId === WL_ExtEventID.WL_EXT_PTT_RECORD_IND) {
        // PTT 录音通知
        // eventData: WL_PttRecordInd
        console.log('录音状态:', eventData.state);
    }
    
    if (eventId === WL_ExtEventID.WL_EXT_PTT_PLAY_IND) {
        // PTT 播放通知
        // eventData: WL_PttPlayInd
        console.log('播放状态:', eventData.indData.state);
    }
});
```

---

## 8. 群组管理

### 8.1 群组基本操作

```typescript
// 创建群
const group = await weila.weila_createGroup(
    '群名称',
    WL_IDbGroupType.GROUP_NORMAL,  // 群类型
    groupIconBlob,                  // 群头像（可选）
    WL_IDbGroupPublicType.GROUP_PUBLIC_OPEN,  // 公开类型
    [userId1, userId2]              // 初始成员
);

// 解散群（仅群主可执行）
await weila.weila_dismissGroup(groupId);

// 退出群（群主需先转让群主或解散群）
await weila.weila_quitGroup(groupId);

// 申请加入群
await weila.weila_joinGroup(groupId, '留言', '群密码');

// 获取所有群
const groups = await weila.weila_getAllGroups();

// 获取指定群
const group = await weila.weila_getGroup(groupId);

// 从服务器获取群信息
const groupFromServer = await weila.weila_getGroupFromServer(groupId);
```

### 8.2 群成员管理

```typescript
// 获取群成员
const members = await weila.weila_getGroupMembers(groupId);

// 获取群管理员
const admins = await weila.weila_getGroupAdminMembers(groupId);

// 获取群在线成员
const onlineMembers = await weila.weila_getOnlineMemberIds(groupId);

// 删除群成员
await weila.weila_deleteMembers(groupId, [userId1, userId2]);

// 邀请用户加入群
await weila.weila_inviteUserJoinGroup(groupId, [userId1, userId2]);

// 更改群主
await weila.weila_changeGroupOwner(groupId, newOwnerUserId);

// 更改成员类型（普通成员 ↔ 管理员）
await weila.weila_changeMemberType(
    groupId,
    memberUserId,
    WL_IDbMemberType.ADMIN_MEMBER_TYPE
);

// 添加设备成员
await weila.weila_addDeviceMembers(groupId, [subUserId1, subUserId2]);

// 设备退群
await weila.weila_quitGroupsForDevice(groupIds, subUserId);
```

### 8.3 群邀请与入群申请应答

```typescript
// 应答加群申请
await weila.weila_answerGroupJoin(groupId, joinUserId, WL_AnswerStatus.ANSWER_ACCEPT);

// 应答群邀请
await weila.weila_answerGroupInvitation(groupId, invitorId, WL_AnswerStatus.ANSWER_ACCEPT);
```

### 8.4 群组类型

```typescript
import { WL_IDbGroupType, WL_IDbGroupPublicType, WL_IDbGroupAuthType, WL_IDbMemberType } from 'weilasdk';

// 群类型
WL_IDbGroupType.GROUP_NORMAL          // 普通群
WL_IDbGroupType.GROUP_TEMP           // 临时群
WL_IDbGroupType.GROUP_COMPANY_NORMAL // 公司群
WL_IDbGroupType.GROUP_COMPANY_DEPT   // 公司部门群

// 公开类型
WL_IDbGroupPublicType.GROUP_PUBLIC_CLOSE // 不公开
WL_IDbGroupPublicType.GROUP_PUBLIC_OPEN  // 公开

// 认证类型
WL_IDbGroupAuthType.GROUP_AUTH_NONE                   // 不鉴权
WL_IDbGroupAuthType.GROUP_AUTH_CONFIRM               // 管理员确认
WL_IDbGroupAuthType.GROUP_AUTH_CONFIRM_OR_PASSWORD   // 管理员确认或密码
WL_IDbGroupAuthType.GROUP_AUTH_CONFIRM_AND_PASSWORD  // 管理员确认与密码

// 成员类型
WL_IDbMemberType.NORMAL_MEMBER_TYPE // 普通成员
WL_IDbMemberType.ADMIN_MEMBER_TYPE  // 管理员
```

---

## 9. 好友管理

```typescript
// 获取好友列表
const friends = await weila.weila_getFriends();           // 获取所有
const friends = await weila.weila_getFriends([userId1, userId2]); // 获取指定

// 获取在线好友
const onlineFriends = await weila.weila_getOnlineFriends();

// 邀请好友
await weila.weila_inviteFriend(inviteeId, '你好', '备注');

// 删除好友
await weila.weila_deleteFriends([userId1, userId2]);

// 应答好友邀请
await weila.weila_answerFriendInvite(
    inviterUserId,
    WL_AnswerStatus.ANSWER_ACCEPT,
    '同意'
);

// 设备相关
await weila.weila_inviteFriendsForDevice(inviteeIds, subUserId, detail);
await weila.weila_deleteFriendsForDevice(userIds, subUserId);
```

### 9.1 应答状态

```typescript
import { WL_AnswerStatus } from 'weilasdk';

WL_AnswerStatus.ANSWER_NORMAL   // 未处理
WL_AnswerStatus.ANSWER_ACCEPT   // 接受
WL_AnswerStatus.ANSWER_REJECT   // 拒绝
WL_AnswerStatus.ANSWER_IGNORE   // 忽略
```

---

## 10. 用户信息

```typescript
// 获取单个用户信息
const userInfo = await weila.weila_getUserInfo(userId);

// 批量获取用户信息
const userInfos = await weila.weila_getUserInfos([userId1, userId2, userId3]);

// 搜索用户（按微喇号或手机号）
const searchResults = await weila.weila_searchUserInfos('1380013');
```

---

## 11. 设备管理

### 11.1 设备绑定与解绑

```typescript
// 绑定设备
const result = await weila.weila_bindDevice(verifyCode);

// 解绑设备
await weila.weila_unbindDevice(deviceUserId);

// 获取已绑定的设备列表
const extensions = await weila.weila_getExtensions();

// 更新数据库中的扩展信息
await weila.weila_putExtension(extensionInfo);

// 获取设备的群列表
const deviceGroups = await weila.weila_getDeviceSubGroups(subUserId);

// 获取设备的好友列表
const deviceFriends = await weila.weila_getDeviceSubFriends(subUserId);
```

### 11.2 设备配置

```typescript
// 设置设备配置
await weila.weila_setDeviceConfig(cfgKey, cfgValue, subUserId);
```

### 11.3 设备类型

```typescript
import { WL_IDbExtensionState, WL_IDbExtensionType } from 'weilasdk';

// 设备状态
WL_IDbExtensionState.EXTENSION_UNBIND    // 未绑定
WL_IDbExtensionState.EXTENSION_BINDING  // 绑定中
WL_IDbExtensionState.EXTENSION_BOUND    // 已绑定
WL_IDbExtensionState.EXTENSION_LOCKED   // 已锁定

// 设备类型
WL_IDbExtensionType.EXTENSION_SLAVE  // 从设备
WL_IDbExtensionType.EXTENSION_SUB    // 子设备
```

---

## 12. 客服服务

### 12.1 客服会话

```typescript
// 获取服务会话信息
const serviceSession = await weila.weila_getServiceSession(sessionId);

// 获取服务会话 ID
const sessionId = weila.weila_getServiceSessionId(serviceId, customerId);
```

### 12.2 客服操作（Staff）

```typescript
// 客服接受服务会话
await weila.weila_staffAcceptSession(sessionId);

// 客服退出服务会话
await weila.weila_staffExitSession(sessionId);

// 客服关闭服务会话
await weila.weila_staffCloseSession(sessionId);

// 邀请其他客服参与会话
await weila.weila_staffSessionInvite(sessionId, [staffId1, staffId2], '请参与会话');

// 应答客服会话邀请
await weila.weila_staffAnswerSessionInvite(sessionId, WL_AnswerStatus.ANSWER_ACCEPT);

// 移除会话中的客服
await weila.weila_staffRemoveSessionStaff(sessionId, [staffId1]);

// 搜索客服
const staffs = await weila.weila_staffSearchStaffs(serviceId, pageIndex, pageSize, staffClass);

// 重置服务会话
await weila.weila_staffResetSession(sessionId);

// 获取客服信息
const staffInfos = await weila.weila_getStaffInfos([userId1, userId2]);
```

---

## 13. 位置服务

```typescript
// 获取会话中共享位置的成员信息
const locations = await weila.weila_getLocation(sessionId, sessionType);
```

---

## 14. 通知系统

```typescript
// 获取所有通知
const notifications = await weila.weila_getAllTypeNotifications();

// 更新通知
await weila.weila_updateNotification(notification);
```

### 14.1 通知类型

```typescript
import { WL_IDbNotificationType } from 'weilasdk';

WL_IDbNotificationType.FRIEND_INVITE_NOTIFICATION           // 好友邀请
WL_IDbNotificationType.FRIEND_ANSWER_NOTIFICATION          // 好友应答
WL_IDbNotificationType.GROUP_INVITE_NOTIFICATION           // 群邀请
WL_IDbNotificationType.GROUP_JOIN_NOTIFICATION             // 入群申请
WL_IDbNotificationType.GROUP_ANSWER_INVITE_NOTIFICATION    // 群邀请应答
WL_IDbNotificationType.GROUP_ANSWER_JOIN_NOTIFICATION      // 入群申请应答
```

---

## 15. 事件系统

### 15.1 事件回调注册

```typescript
weila.weila_onEvent((eventId, eventData) => {
    console.log('收到事件:', eventId, eventData);
});
```

### 15.2 事件类型

| 事件 ID | 说明 | 事件数据类型 |
|---------|------|------------|
| `WL_EXT_DATA_PREPARE_IND` | 登录后数据准备状态 | `WL_DataPrepareInd` |
| `WL_EXT_SYSTEM_EXCEPTION_IND` | 系统异常通知 | 异常原因 |
| `WL_EXT_PTT_PLAY_IND` | PTT 播放通知 | `WL_PttPlayInd` |
| `WL_EXT_PTT_RECORD_IND` | PTT 录音通知 | `WL_PttRecordInd` |
| `WL_EXT_MSG_SEND_IND` | 消息发送结果 | `WL_IDbMsgData` |
| `WL_EXT_NEW_MSG_RECV_IND` | 新消息通知 | `WL_IDbMsgData` |
| `WL_EXT_NEW_SESSION_OPEN_IND` | 新会话自动创建 | `WL_IDbSession` |
| `WL_EXT_NEW_NOTIFICATION_IND` | 新通知 | `WL_IDbNotification` |
| `WL_EXT_GROUP_MODIFIED_IND` | 群属性变更 | - |
| `WL_EXT_GROUP_MEMBERS_MODIFIED_IND` | 群成员更新 | - |
| `WL_EXT_GROUP_DELETED_IND` | 群被删除 | - |
| `WL_EXT_GROUP_MEMBER_DELETED_IND` | 群成员被删除 | `WL_GroupMemberDeleteInfo` |
| `WL_EXT_GROUP_NEW_MEMBER_JOINED_IND` | 新成员加入 | - |
| `WL_EXT_FRIEND_DELETED_IND` | 好友被删除 | userId |
| `WL_EXT_FRIEND_MODIFIED_IND` | 好友信息更新 | friendInfo |
| `WL_EXT_FRIEND_NEW_IND` | 新好友 | - |
| `WL_EXT_COMMON_SESSION_CHANGE_IND` | 服务会话变更 | `WL_IDbServiceSessionInfo` |
| `WL_EXT_COMMON_STAFF_INVITE_IND` | 客服邀请 | `WL_StaffInvite` |
| `WL_EXT_COMMON_ANSWER_INVITE_IND` | 客服应答邀请 | `WL_CommonAnswerStaffInvite` |
| `WL_EXT_STAFF_ACCEPT_SESSION_IND` | 客服接受会话 | `WL_StaffSessionInfo` |
| `WL_EXT_STAFF_EXIT_SESSION_IND` | 客服退出会话 | `WL_StaffSessionInfo` |
| `WL_EXT_STAFF_CLOSE_SESSION_IND` | 客服关闭会话 | `WL_StaffSessionInfo` |
| `WL_EXT_STAFF_SESSION_INVITE_IND` | 客服会话邀请 | `WL_ServiceSessionInvite` |
| `WL_EXT_STAFF_ANSWER_INVITE_IND` | 客服应答邀请 | `WL_StaffAnswerSessionInvite` |
| `WL_EXT_STAFF_REMOVED_SESSION_IND` | 被移出会话 | sessionId |
| `WL_EXT_DEVICE_BINDING_ANSWER_IND` | 设备绑定应答 | `WL_bindAnswerInfo` |

### 15.3 数据准备状态

```typescript
import { WL_DataPrepareState } from 'weilasdk';

WL_DataPrepareState.START_PREPARING        // 开始准备
WL_DataPrepareState.PREPARE_PROGRESS_IND   // 准备中
WL_DataPrepareState.PREPARE_SUCC_END       // 准备成功
WL_DataPrepareState.PREPARE_FAIL_END       // 准备失败
```

### 15.4 PTT 播放状态

```typescript
import { WL_PttAudioPlayState, WL_PttAudioPlaySource } from 'weilasdk';

// 播放状态
WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START  // 开始播放
WL_PttAudioPlayState.PTT_AUDIO_PLAYING         // 播放中
WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END    // 播放结束

// 播放来源
WL_PttAudioPlaySource.PTT_AUDIO_SRC_STREAM   // 实时流
WL_PttAudioPlaySource.PTT_AUDIO_SRC_HISTORY  // 历史消息
WL_PttAudioPlaySource.PTT_AUDIO_SRC_SINGLE   // 单条消息
```

---

## 16. 错误处理

### 16.1 错误信息解析

```typescript
import { getErrorMsg } from 'weilasdk';

// 从错误消息中提取可读的错误描述
const errorMessage = getErrorMsg(errorMsg);
console.log(errorMessage);  // 输出如 "密码错误"、"服务器异常" 等
```

### 16.2 错误码参考

SDK 定义了丰富的错误码，以下是常见错误：

**通用错误**

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1 | 失败 |
| 2 | 连接中断 |
| 3 | 未连接消息服务器 |
| 4 | 未连接数据服务器 |
| 5 | 未连接缓存服务器 |
| 6 | 未连接登录服务器 |
| 7 | 未连接路由服务器 |
| 8 | 数据库异常 |
| 9 | 缓存异常 |
| 10 | 服务器维护中 |
| 11 | 服务器异常 |
| 12 | 参数错误 |
| 13 | 请求不支持 |
| 14 | 请求受限 |
| 15 | 请求已过期 |
| 16 | APP版本太旧 |
| 17 | 您已被拉黑 |
| 18 | 认证无效 |
| 19 | 权限受限 |
| 20 | 数据不存在 |
| 21 | 数据无效 |
| 22 | 验证码错误 |
| 23 | 授权失效 |
| 24 | 请求太频繁 |
| 25 | 号码资源耗尽 |
| 26 | 请求超时 |
| 27 | 网络传输超时 |
| 28 | 应用未授权 |

**登录错误**

| 错误码 | 说明 |
|--------|------|
| 101 | 用户IP被封 |
| 102 | 用户被封号 |
| 103 | 密码输入错误次数太多 |
| 104 | 在线用户达到系统容量 |
| 105 | 验证码无效 |
| 106 | 账号或密码错误 |
| 107 | 用户已绑定设备 |
| 108 | 设备绑定中 |
| 109 | 未绑定分机 |
| 110 | 非法设备 |
| 111 | 许可证用完 |
| 112 | 设备账号错误 |
| 113 | 设备密码错误 |
| 114 | 设备不在线 |

**好友错误**

| 错误码 | 说明 |
|--------|------|
| 201 | 不是好友 |
| 202 | 好友邀请已过期 |
| 203 | 您已被对方加入黑名单 |
| 204 | 好友已开启消息屏蔽 |

**群组错误**

| 错误码 | 说明 |
|--------|------|
| 301 | 群组不存在 |
| 302 | 访问受限（被踢或被封） |
| 303 | 您不是群主 |
| 304 | 您不是群管理员 |
| 305 | 成员数达到上限 |
| 306 | 群组号耗尽 |
| 307 | 群密码错误 |
| 308 | 您创建的群组数达到上限 |
| 309 | 话权被占用 |
| 310 | 用户不是群成员 |
| 311 | 群成员上限达到最大值 |
| 312 | 不能对管理员进行操作 |
| 313 | 用户被加入群黑名单 |
| 314 | 群主不能退群 |
| 315 | 你已被禁言 |
| 316 | 群成员被禁言 |
| 317 | 话权被回收 |
| 318 | 不能对设备用户进行操作 |
| 319 | 加群数量达到上限 |

**客服错误**

| 错误码 | 说明 |
|--------|------|
| 401 | 服务已关闭 |
| 402 | 不是客服号 |
| 403 | 客服不在线 |
| 404 | 客服忙 |

---

## 17. 日志配置

### 17.1 初始化日志

```typescript
import { initLogger } from 'weilasdk';

// 初始化日志模块
// 使用 debug 库的命名空间格式
initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*, -socket-client:*');
```

### 17.2 日志格式说明

- `MOD:*` - 所有模块日志
- `CORE:*` - 核心模块日志
- `FSM:*` - 状态机日志
- `AUDIO:*` - 音频模块日志
- `DB:*` - 数据库模块日志
- `NET:*` - 网络模块日志
- `-socket-client:*` - 排除 socket-client 日志

### 17.3 获取指定 Logger

```typescript
import { getLogger } from 'weilasdk';

const logger = getLogger('CORE:info');
logger('这是核心模块的日志');
```

---

## 18. 数据类型参考

### 18.1 用户信息

```typescript
interface WL_IDbUserInfo {
    userId: number;
    weilaNum: string;
    sex: number;
    nick: string;
    pinyinName: string;
    avatar: string;
    email?: string;
    phone?: string;
    countryCode?: string;
    status: number;
    signature?: string;
    userType: number;
    created: number;
}
```

### 18.2 群组信息

```typescript
interface WL_IDbGroup {
    groupId: string;
    name: string;
    pinyinName: string;
    avatar: string;
    groupNum: string;
    ownerId: number;
    groupType: WL_IDbGroupType;
    desc?: string;
    publicType: WL_IDbGroupPublicType;
    authType: WL_IDbGroupAuthType;
    groupClass: number;
    audioQuality: number;
    speechEnable: boolean;
    home?: string;
    latitude?: string;
    longitude?: string;
    burstType: number;
    memberLimit: number;
    memberCount: number;
    memberVersion: number;
    version: number;
    created: number;
}
```

### 18.3 消息数据

```typescript
interface WL_IDbMsgData {
    combo_id: string;
    senderId: number;
    sessionId: string;
    sessionType: number;
    msgId: number;
    msgType: WL_IDbMsgDataType;
    created: number;
    autoReply: number;
    status: WL_IDbMsgDataStatus;
    tag?: string;
    textData?: string;
    audioData?: WL_IDbAudioData;
    fileInfo?: WL_IDbFileData;
    command?: string;
    location?: WL_IDbLocationShared;
    switchData?: string;
    serviceData?: string;
    withdrawMsgId?: number;
    pttData?: WL_IDbPttData;
}

interface WL_IDbAudioData {
    frameCount: number;
    data?: Uint8Array;
    audioUrl?: string;
}

interface WL_IDbFileData {
    fileSize: number;
    fileName?: string;
    fileUrl?: string;
    fileThumbnail?: string;
}

interface WL_IDbLocationShared {
    locationType: string;
    latitude: number;
    longitude: number;
    title?: string;
    name?: string;
    address?: string;
    mapUrl?: string;
}
```

### 18.4 会话信息

```typescript
interface WL_IDbSession {
    combo_id_type: string;
    sessionId: string;
    sessionType: WL_IDbSessionType;
    sessionName: string;
    sessionAvatar: string;
    readMsgId: number;
    lastMsgId: number;
    latestUpdate: number;
    status: WL_IDbSessionStatus;
    extra?: any;
}

interface WL_IDbSessionSetting {
    combo_id_type: string;
    sessionId: string;
    sessionType: number;
    tts: boolean;
    mute: boolean;
    loactionShared: boolean;
}
```

### 18.5 好友信息

```typescript
interface WL_IDbFriend {
    friendInfo: WL_IDbFriendInfo;
    userInfo: WL_IDbUserInfo | null;
}

interface WL_IDbFriendInfo {
    userId: number;
    status: WL_IDbFriendStatus;
    remark?: string;
    label?: string;
    desc?: string;
    blockedStatus: boolean;
    tts: boolean;
    locationShared: boolean;
    extension?: string;
}
```

### 18.6 群成员信息

```typescript
interface WL_IDbGroupMember {
    memberInfo: WL_IDbMemberInfo;
    userInfo?: WL_IDbUserInfo;
}

interface WL_IDbMemberInfo {
    combo_gid_uid: string;
    groupId: string;
    userId: number;
    status: WL_IDbMemberStatus;
    memberType: WL_IDbMemberType;
    remark?: string;
    priority: number;
    speechEnable: boolean;
    speechDisableTimeout: number;
    blockedStatus: boolean;
    tts: boolean;
    locationShared: boolean;
    created: number;
}
```

### 18.7 设备信息

```typescript
interface WL_IDbExtension {
    info: WL_IDbExtensionInfo;
    userInfo: WL_IDbUserInfo;
    supervisor: WL_IDbUserInfo;
}

interface WL_IDbExtensionInfo {
    imei: string;
    state: WL_IDbExtensionState;
    productName: string;
    extensionType: WL_IDbExtensionType;
    userId: number;
    supervisorId: number;
    status: number;
    version: string;
    config: string;
    groupLimit: number;
    groupCount: number;
    activeTime: number;
    warrant: number;
    createdTime: number;
}
```

### 18.8 客服信息

```typescript
interface WL_IDbService {
    serviceId: number;
    serviceNum: string;
    serviceType: number;
    serviceClass: number;
    name: string;
    avatar: string;
    intro: string;
    url: string;
    createdTime: number;
}

interface WL_IDbServiceStaffInfo {
    staff: WL_IDbServiceStaff;
    userData: WL_IDbUserInfo;
}

interface WL_IDbServiceSessionInfo {
    service: WL_IDbService;
    customer: WL_IDbUserInfo | undefined;
    staffs: WL_IDbServiceStaffInfo[];
    serviceSession: WL_IDbServiceSession;
}
```

---

## 附录：集成指南

### Vue 2/3 项目

```typescript
import { WeilaCore, setConfigData, WL_ConfigID } from 'weilasdk';
import { markRaw } from 'vue';

// 使用 markRaw 避免 Vue 代理
const weila = markRaw(new WeilaCore());

// 初始化日志
import { initLogger } from 'weilasdk';
initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*, -socket-client:*');
```

### UniApp 项目

1. 复制 `public/assets/` 资源到 `static/weilasdk/`
2. 调用 `setConfigData()` 重新映射资源路径
3. 添加 webpack 规则处理 `.wasm` 文件

---

## 版本信息

- SDK 版本：见 `package.json`
- 构建工具：Webpack 5
- 语言：TypeScript
- 依赖：xstate, dexie, long, debug
