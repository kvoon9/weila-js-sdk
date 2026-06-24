# To-dos

> 已完成的迭代计划已归档到 `TODOs.archive.md`。

---

## 第五周：状态管理 + PTT 联调

| 任务                                                           | 优先级 | 状态 |
| -------------------------------------------------------------- | ------ | ---- |
| Pinia 状态管理：SDK 实例、连接状态、用户、会话列表             | 高     | ⬜   |
| Playground vue-router：登录页 / 会话列表 / 聊天页 / PTT 测试页 | 高     | ⬜   |
| 音频/PTT 完整联调：申请话权 → 录音 → 释放 → 播放              | 高     | ⬜   |
| WlUserCard 用户信息卡片                                         | 中     | ⬜   |
| WlContactList 联系人/好友列表 (Playground ContactList panel 实现)   | 中     | ✅   |

**里程碑**：Playground 具备完整路由、状态管理、PTT 可联调

---

## 第六周：测试 + 文档 + 收尾

| 任务                                                     | 优先级 | 状态 |
| -------------------------------------------------------- | ------ | ---- |
| UI 组件单元测试 (vitest + vue/test-utils) 覆盖核心组件 | 高     | ⬜   |
| 完整链路回归测试：登录 → 消息 → 音频 → PTT              | 高     | ⬜   |
| Storybook 组件文档完善                                    | 中     | ⬜   |
| Core SDK API 文档更新                                     | 中     | ⬜   |
| Bug 修复 + 遗留问题处理                                   | 高     | ⬜   |

**里程碑**：可对外演示的完整 Weila SDK Demo，核心组件有测试和文档

---

## 长期待办 (不在本轮排期内)

- ⬜ 将 webpack 打包迁移至 tsdown/vite 打包
- ⬜ weila sdk 支持 vue3 composable api
- ⬜ 消息编辑 / 撤回 / 已读回执
- ⬜ 正在输入状态 (typing indicator)
- ⬜ 消息全文搜索
- ⬜ commitlint + CHANGELOG 自动生成
- ⬜ CSS 导入优化 (支持 @weilasdk/ui/style.css)
- ⬜/✅ WlGroupInfo 群信息面板 + WlMemberList 群成员列表 (Playground Groups panel 已实现)
- ⬜ 集成 weila-work 国内版
- ⬜ 集成 weila-work (h5)
