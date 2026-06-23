# Agent 消息 Markdown 与样式优化设计

## 背景

当前 Chat 调试页和会话管理详情页都使用 `Typography.Paragraph` 加 `whiteSpace: pre-wrap` 展示消息正文。该方式只能展示纯文本，不能良好呈现模型常见的 Markdown 回复，例如标题、列表、引用、代码块和行内代码。

本次优化统一 Chat 和 Conversation 的消息展示，新增 Markdown 渲染能力，并改善 Chat 调试页整体视觉结构。

## 页面范围

涉及页面：

- `src/pages/agent/chat/index.tsx`
- `src/pages/agent/conversation/index.tsx`

新增共享组件：

- `src/components/AgentMessageBubble/index.tsx`
- `src/components/AgentMessageBubble/index.less`

新增依赖：

- `react-markdown`

首版不包含：

- 不渲染原始 HTML。
- 不新增代码高亮库。
- 不做消息复制、重试、编辑、删除等操作。
- 不改变聊天和会话接口行为。

## Markdown 渲染

消息正文使用 `react-markdown` 渲染。

安全策略：

- 不启用 `rehype-raw`。
- 不将消息内容作为 HTML 注入 DOM。
- Markdown 中的 HTML 片段按 `react-markdown` 默认行为处理，不作为可信 HTML 执行。

支持效果：

- 段落
- 标题
- 有序列表和无序列表
- 引用块
- 行内代码
- 代码块
- 链接
- 表格不作为首版目标；如果 `react-markdown` 默认不支持 GFM 表格，则不额外引入插件。

代码样式：

- 行内代码使用浅灰背景、圆角、等宽字体。
- 代码块使用深色背景、浅色文字、圆角、横向滚动。
- 不做语法高亮。

## 共享消息组件

新增 `AgentMessageBubble` 组件。

输入属性：

```ts
interface AgentMessageBubbleProps {
  message: AgentMessage;
  align?: 'left' | 'right';
  compact?: boolean;
}
```

行为：

- `align` 未传时根据 `message.role` 自动判断。
- `role === 'user'` 默认右侧显示。
- `role === 'assistant'` 默认左侧显示。
- 其他角色默认左侧显示，并使用弱化样式。
- `compact` 为 `true` 时缩小外边距和元信息间距，用于会话管理抽屉。

展示内容：

- 角色标签。
- Markdown 正文。
- 元信息：模型、Prompt tokens、Completion tokens、Total tokens、耗时、创建时间。

样式：

- user 消息：右侧、轻量蓝色气泡。
- assistant 消息：左侧、白色卡片气泡。
- system/tool/unknown 消息：左侧、灰色弱化气泡。
- 气泡最大宽度在 Chat 中为 `min(760px, 82%)`，在 compact 模式下为 `100%`。

## Chat 调试页样式优化

Chat 调试页整体从内联样式迁移到局部样式文件：

- 新增 `src/pages/agent/chat/index.less`
- 页面根节点使用 `agent-chat-page`

布局：

- 外层使用左右两栏。
- 左侧会话栏固定宽度，包含 Agent 选择、新建会话和会话列表。
- 右侧聊天面板使用卡片式容器。
- 移动端或窄屏下允许左右栏纵向排列。

左侧会话栏：

- Agent 选择器和新建会话按钮固定在顶部。
- 会话列表单独滚动。
- 当前会话高亮。
- 会话标题使用 `title || createdAt || id || '未命名会话'`。

右侧聊天区：

- 顶部增加轻量标题区，展示当前 Agent 和当前会话。
- 中间消息区使用柔和背景和滚动容器。
- 消息区使用 `AgentMessageBubble`。
- 底部输入区固定在聊天面板底部。
- 输入框 placeholder 改为：`支持 Markdown，Shift+Enter 换行`。

发送行为不变：

- Enter 发送。
- Shift+Enter 换行。
- 发送中禁用输入框和按钮。

## Conversation 消息展示优化

会话管理页保持现有结构：

- `PageContainer + ProTable`
- 详情抽屉
- 基础信息 + 消息列表

抽屉消息列表改为使用 `AgentMessageBubble`：

- 使用 `compact={true}`。
- 不再使用 `Typography.Paragraph` 直接渲染正文。
- 保留详情和消息加载逻辑不变。

## 依赖变更

更新 `package.json`：

- `dependencies.react-markdown` 由 `npm install react-markdown` 写入版本范围。

需要运行：

```bash
npm install react-markdown
```

该命令会按 npm 默认行为更新本地 lockfile。仓库当前忽略 lockfile 时，不额外改变该策略。

## 验证

实现完成后验证：

- `npm test` 通过。
- `npm run tsc` 无新增类型错误；如果仍失败，应确认失败点是否仅为既有基线错误。
- Chat 页面使用 `AgentMessageBubble`。
- Conversation 页面使用 `AgentMessageBubble`。
- 消息正文不再使用 `Typography.Paragraph` 加 `whiteSpace: pre-wrap` 作为主要渲染方式。
- `react-markdown` 出现在 `package.json` dependencies 中。

## 后续扩展

后续可独立实现：

- GFM 表格支持。
- 代码高亮。
- 复制消息。
- 复制代码块。
- 消息重试。
