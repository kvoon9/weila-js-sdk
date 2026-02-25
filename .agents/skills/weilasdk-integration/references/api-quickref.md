# API 快速参考

## 初始化

| 方法                               | 说明                |
| ---------------------------------- | ------------------- |
| `new WeilaCore()`                  | 创建 SDK 实例       |
| `weila_init()`                     | 初始化 SDK          |
| `weila_setWebSock(addr)`           | 设置 WebSocket 地址 |
| `weila_setAuthInfo(appId, appKey)` | 设置 App 认证信息   |
| `weila_audioInit()`                | 初始化音频系统      |
| `weila_onEvent(callback)`          | 注册事件回调        |

## 登录认证

| 方法                                          | 说明             |
| --------------------------------------------- | ---------------- |
| `weila_login(account, password, countryCode)` | 用户登录         |
| `weila_logout()`                              | 登出             |
| `weila_get_token()`                           | 获取 token       |
| `getLoginUserInfo()`                          | 获取当前用户信息 |

## 会话管理

| 方法                               | 说明                 |
| ---------------------------------- | -------------------- |
| `weila_getSession(id, type)`       | 获取内存会话         |
| `weila_getSessions()`              | 获取所有会话         |
| `weila_getSessionFromDb(id, type)` | 从数据库获取会话     |
| `weila_getSessionsFromDb()`        | 从数据库获取所有会话 |
| `weila_startNewSession(id, type)`  | 创建新会话           |
| `weila_deleteSession(id, type)`    | 删除会话             |
| `weila_clearSession(id, type)`     | 清除会话消息         |

## 消息收发

| 方法                                            | 说明         |
| ----------------------------------------------- | ------------ |
| `weila_sendTextMsg(id, type, text)`             | 发送文本     |
| `weila_sendImage(id, type, name, file)`         | 发送图片     |
| `weila_sendFile(id, type, name, file)`          | 发送文件     |
| `weila_sendVideo(id, type, name, file)`         | 发送视频     |
| `weila_sendPosition(id, type, position)`        | 发送位置     |
| `weila_sendAudioMsg(id, type, url, frameCount)` | 发送音频     |
| `weila_sendPTTByAudioMsg(id, type, data)`       | 发送 PTT     |
| `weila_getMsgData(comboId)`                     | 获取消息     |
| `weila_getMsgDatas(id, type, fromMsgId, count)` | 获取消息列表 |
| `weila_fetchAudioData(url)`                     | 下载音频数据 |

## 音频播放

| 方法                              | 说明         |
| --------------------------------- | ------------ |
| `weila_playSingle(msgData)`       | 播放单条语音 |
| `weila_stopSingle()`              | 停止播放     |
| `weila_playHistoryList(msgDatas)` | 播放历史列表 |
| `weila_playNext()`                | 播放下一条   |

## PTT 对讲

| 方法                          | 说明     |
| ----------------------------- | -------- |
| `weila_requestTalk(id, type)` | 申请发言 |
| `weila_releaseTalk()`         | 释放发言 |

## 群组管理

| 方法                                                       | 说明         |
| ---------------------------------------------------------- | ------------ |
| `weila_createGroup(name, type, icon, publicType, members)` | 创建群       |
| `weila_dismissGroup(groupId)`                              | 解散群       |
| `weila_quitGroup(groupId)`                                 | 退出群       |
| `weila_joinGroup(groupId, detail, password)`               | 加入群       |
| `weila_getAllGroups()`                                     | 获取所有群   |
| `weila_getGroup(groupId)`                                  | 获取群信息   |
| `weila_getGroupMembers(groupId)`                           | 获取群成员   |
| `weila_deleteMembers(groupId, userIds)`                    | 删除成员     |
| `weila_changeGroupOwner(groupId, userId)`                  | 转让群主     |
| `weila_changeMemberType(groupId, userId, type)`            | 更改成员类型 |

## 好友管理

| 方法                                             | 说明         |
| ------------------------------------------------ | ------------ |
| `weila_getFriends(userIds?)`                     | 获取好友列表 |
| `weila_getOnlineFriends()`                       | 获取在线好友 |
| `weila_inviteFriend(userId, detail, remark)`     | 邀请好友     |
| `weila_deleteFriends(userIds)`                   | 删除好友     |
| `weila_answerFriendInvite(userId, status, info)` | 应答好友邀请 |

## 用户信息

| 方法                          | 说明             |
| ----------------------------- | ---------------- |
| `weila_getUserInfo(userId)`   | 获取用户信息     |
| `weila_getUserInfos(userIds)` | 批量获取用户信息 |
| `weila_searchUserInfos(key)`  | 搜索用户         |

## 设备管理

| 方法                                           | 说明         |
| ---------------------------------------------- | ------------ |
| `weila_bindDevice(verifyCode)`                 | 绑定设备     |
| `weila_unbindDevice(userId)`                   | 解绑设备     |
| `weila_getExtensions()`                        | 获取设备列表 |
| `weila_setDeviceConfig(key, value, subUserId)` | 设置设备配置 |

## 客服服务

| 方法                                             | 说明         |
| ------------------------------------------------ | ------------ |
| `weila_getServiceSession(id)`                    | 获取服务会话 |
| `weila_staffAcceptSession(id)`                   | 客服接受会话 |
| `weila_staffExitSession(id)`                     | 客服退出会话 |
| `weila_staffCloseSession(id)`                    | 客服关闭会话 |
| `weila_staffSearchStaffs(serviceId, page, size)` | 搜索客服     |

## 常量参考

### 会话类型

```typescript
WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE; // 个人
WL_IDbSessionType.SESSION_GROUP_TYPE; // 群组
WL_IDbSessionType.SESSION_SERVICE_TYPE; // 服务号
```

### 消息类型

```typescript
WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE; // 文本
WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE; // 音频
WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE; // 图片
WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE; // 视频
WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE; // 文件
WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE; // 位置
WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE; // PTT
```

### 群组类型

```typescript
WL_IDbGroupType.GROUP_NORMAL; // 普通群
WL_IDbGroupType.GROUP_TEMP; // 临时群
```

### 成员类型

```typescript
WL_IDbMemberType.NORMAL_MEMBER_TYPE; // 普通成员
WL_IDbMemberType.ADMIN_MEMBER_TYPE; // 管理员
```
