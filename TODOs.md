# To-dos

## 已完成

- [x] 搭建 weila sdk monorepo
  - [x] packages/core：当前 wl_js_new_sdk
    - [x] 跑通 webpack 打包流程
    - [x] 使用 pnpm 管理依赖并且升级旧依赖
  - [x] packages/ui: 搭建 tsdown + vue3 组件库环境
  - [x] playground/vue3: storybook 测试组件

---

## 开发计划

### 第一周：Core API 稳定性 + 开发环境

| 任务                                                        | 优先级 | 状态 |
| ----------------------------------------------------------- | ------ | ---- |
| Core SDK 配置 vitest 测试框架 + 核心模块测试                | 高     | [ ]  |
| 梳理 Core SDK 公开 API，确认消息收发/会话/音频接口稳定性    | 高     | [ ]  |
| 修复 Core SDK API 问题 (如有)                               | 高     | [ ]  |
| Playground 补全完整登录流程 (websock → auth → init → login) | 高     | [ ]  |
| UI 组件开发规范：CSS 变量主题系统 + Storybook 模板          | 中     | [ ]  |

**里程碑**：Core API 已验证稳定，Playground 可跑通登录

---

### 第二周：开发环境收尾 + 会话列表

| 任务                                               | 优先级 | 状态 |
| -------------------------------------------------- | ------ | ---- |
| Playground 接入 @weilasdk/ui + 环境变量 + HMR 验证 | 高     | [ ]  |
| oxlint + oxfmt 统一配置                            | 中     | [ ]  |
| SessionList 完善：未读计数、最后消息预览、时间戳   | 高     | [ ]  |
| WlTextBubble 文本消息气泡 (收/发样式、时间、状态)  | 高     | [ ]  |
| WlMsgInput 消息输入框 (文本 + 发送 + 回车)         | 高     | [ ]  |

**里程碑**：UI 开发环境就绪，会话列表 + 文本消息基础组件完成

---

### 第三周：消息列表 + 图片/音频消息

| 任务                                            | 优先级 | 状态 |
| ----------------------------------------------- | ------ | ---- |
| MsgList 无限滚动：向上翻页 + 滚动锚定           | 高     | [ ]  |
| Playground 串联：会话列表 → 消息列表 → 发送文本 | 高     | [ ]  |
| 消息已读/未读状态 UI                            | 中     | [ ]  |
| WlImageBubble 图片消息 (缩略图 + 点击放大)      | 高     | [ ]  |
| WlAudioBubble 完善 + WlAudioPlayer (进度、时长) | 高     | [ ]  |

**里程碑**：可演示「登录 → 选会话 → 查看历史 → 发送文本」，图片/音频消息可展示

---

### 第四周：富媒体消息 + 语音录制

| 任务                                         | 优先级 | 状态 |
| -------------------------------------------- | ------ | ---- |
| WlFileBubble 文件消息 (文件名、大小、下载)   | 中     | [ ]  |
| WlVideoBubble 视频消息 (封面 + 播放)         | 中     | [ ]  |
| WlEmojiPicker 表情选择器 + 集成到 WlMsgInput | 中     | [ ]  |
| WlLocationBubble 位置消息                    | 中     | [ ]  |
| WlVoiceRecorder 语音录制 (波形 + 计时)       | 中     | [ ]  |

**里程碑**：支持文本/图片/音频/文件/视频/位置/表情 7 种消息类型

---

### 第五周：状态管理 + PTT 联调

| 任务                                                           | 优先级 | 状态 |
| -------------------------------------------------------------- | ------ | ---- |
| Pinia 状态管理：SDK 实例、连接状态、用户、会话列表             | 高     | [ ]  |
| Playground vue-router：登录页 / 会话列表 / 聊天页 / PTT 测试页 | 高     | [ ]  |
| 音频/PTT 完整联调：申请话权 → 录音 → 释放 → 播放               | 高     | [ ]  |
| WlUserCard 用户信息卡片                                        | 中     | [ ]  |
| WlContactList 联系人/好友列表                                  | 中     | [ ]  |

**里程碑**：Playground 具备完整路由、状态管理、PTT 可联调

---

### 第六周：测试 + 文档 + 收尾

| 任务                                                   | 优先级 | 状态 |
| ------------------------------------------------------ | ------ | ---- |
| UI 组件单元测试 (vitest + vue/test-utils) 覆盖核心组件 | 高     | [ ]  |
| 完整链路回归测试：登录 → 消息 → 音频 → PTT             | 高     | [ ]  |
| Storybook 组件文档完善                                 | 中     | [ ]  |
| Core SDK API 文档更新                                  | 中     | [ ]  |
| Bug 修复 + 遗留问题处理                                | 高     | [ ]  |

**里程碑**：可对外演示的完整 Weila SDK Demo，核心组件有测试和文档

---

## 长期待办 (不在本轮排期内)

- [ ] 将 webpack 打包迁移至 tsdown/vite 打包
- [ ] weila sdk 支持 vue3 composable api
- [ ] 消息编辑 / 撤回 / 已读回执
- [ ] 正在输入状态 (typing indicator)
- [ ] 消息全文搜索
- [ ] commitlint + CHANGELOG 自动生成
- [ ] CSS 导入优化 (支持 @weilasdk/ui/style.css)
- [ ] WlGroupInfo 群信息面板 + WlMemberList 群成员列表
- [ ] 集成 weila-work 国内版
- [ ] 集成 weila-work (h5)
