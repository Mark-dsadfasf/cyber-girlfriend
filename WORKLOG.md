# 工作日志：赛博女友项目

## 2026/05/30

### 项目概述
- 一个带 Live2D 虚拟角色的网页聊天应用
- 前端：Vite + 原生 JS + PIXI.live2d
- 后端：Express.js 代理服务器
- AI：MiniMax API

### 当前问题
前端提示"请输入 Claude API Key"，说明前端还在用旧的 API Key 检测逻辑。

### 代码流程分析

#### 1. 前端入口
- `src/main.js` → `src/chat.js` → `ChatSystem` 类
- `src/chat.js` 第5行: `const API_KEY = localStorage.getItem('claude_api_key') || ''`
- 这里检查的是 `claude_api_key`，而用户输入后存的是 `minimax_api_key`

#### 2. 发送消息流程 (chat.js 第100-133行)
```javascript
async sendMessage() {
  if (!this.apiKey) {
    this.addMessage('system', '请先设置 Claude API Key')
    this.promptApiKey()  // 弹出prompt
    return
  }
  // ...
}
```

#### 3. 后端接口 (server.js)
- 地址：`http://localhost:3001/chat`
- 模型：`minimax-m2.7`
- 环境变量：`MINIMAX_API_KEY`

### 问题根因
前端 chat.js 在初始化时读取的是 `claude_api_key`（不存在），所以 `this.apiKey` 为空，导致每次都弹出 prompt。

### 修复方案
修改 chat.js，让它：
1. 读取正确的 key 名：`minimax_api_key`
2. 或者让用户设置新的 API Key

### 操作步骤
1. ~~修改 `src/chat.js` 第1行和第6行~~
2. ~~重启后端服务器~~
3. 刷新页面

### 已修复内容 (2026/05/30 19:52)
- `src/chat.js` 第1行：`claude_api_key` → `minimax_api_key`
- `src/chat.js` 第6行：`claude-3-5-sonnet-20241022` → `minimax-m2.7`
- `src/chat.js` 第157-163行：prompt 提示文字更新

### API Key 已验证可用
- 格式：`sk-cp-pnSII...`
- 模型：`minimax-m2.7`
- 接口：`https://api.minimax.chat/v1/chat/completions`

### 当前状态
- 后端服务：✅ 运行中 (localhost:3001)
- 前端服务：需手动启动 (npx vite)

### 2026/05/31 问题记录

#### 问题：escapeHtml 函数未处理 undefined
**症状：** 发送消息时报错 `Cannot read properties of undefined (reading 'replace')`
**原因：** `m.content` 可能为 undefined，导致 `String.replace` 报错
**修复：** 在 escapeHtml 函数开头添加 `if (!text) return ''`
**影响文件：** `src/chat.js` 第 195 行

#### 问题：autochat 接口 Empty messages 错误
**症状：** `/autochat` GET 请求返回 `chat content is empty (2013)`
**原因：** MiniMax API 要求 messages 数组不能为空，必须有用户消息
**修复：** 添加一个默认用户消息 `{ role: 'user', content: '你在干嘛呀？' }`
**影响文件：** `server.js` 第 87 行

#### 问题：MiniMax-Text-01 模型不支持
**症状：** `your current token plan not support model, MiniMax-Text-01 (2061)`
**原因：** 用户的 API Key 不支持 MiniMax-Text-01 模型
**修复：** 改用 `minimax-m2.7` 模型
**影响文件：** `server.js` 第 40、74 行

---

## 2026/05/31 开发记录

### 已完成的修改

#### 1. 修复 Live2D 插件版本
- 复制正确的 `cubism2.min.js` 到 `public/` 目录

#### 2. 修复 Cubism Core CDN 问题
- 下载 `live2dcubismcore.min.js` 到本地 `public/` 目录
- 修改 `index.html` 引用从 CDN 改为本地

#### 3. 合并 package.json
- 删除 `server-package.json`，依赖已合并到根目录 `package.json`

#### 4. 移除前端 API Key 安全隐患
- 删除 `chat.js` 中的 API Key 读取逻辑
- 所有请求走后端代理，前端不再持有 Key

#### 5. 实现主动聊天功能
- 后端添加 `/autochat` 接口（`server.js`）
- 前端添加 `startAutoChat()` 定时器，60-120 秒随机触发
- 增加用户活跃检测：2 分钟内发过消息则跳过自动聊天

#### 6. 增强记忆系统
- 添加情感状态追踪（emotion）：happy, sad, angry, shy, thinking
- 情感数据保存在 localStorage

#### 7. 移除 AI 思考内容显示
- 添加 `stripThought()` 函数，移除 `<think>...</think>` 和 `<thought>...</thought>` 标签
- 应用于 `renderMessages()` 中的消息显示

#### 8. 优化聊天界面布局
- 改为左右布局：左侧 2/3 形象展示，右侧 1/3 聊天窗口
- 聊天窗口宽度自适应，去掉 max-width 限制

### 当前状态
- 后端服务：✅ 运行中 (localhost:3001)
- 前端页面：✅ 运行中 (localhost:3000)
- 所有功能正常可用

### 2026/05/31 下午修复

#### 1. stripThought 正则解析问题
- 症状：Vite 报错 `Unexpected token 'export'` 在 chat.js
- 原因：正则表达式 `<\/?think...>` 中的 `/` 被解析成除号
- 修复：改用 `RegExp` 构造函数（后又改回，直接写也没问题）

#### 2. live2d.min.js 错误
- 症状：`Could not find Cubism 2 runtime`
- 原因：原文件是 live2d-widget 的 ES module 版本，不是 Cubism 2.1 runtime
- 修复：从 CDN 下载正确的 Cubism 2.1 live2d.min.js

#### 3. pixi-live2d-display.min.js 错误
- 症状：`Unexpected token 'export'`
- 原因：公共目录的文件被替换成错误的 cubism2.min.js
- 修复：从 npm 包重新解压正确的版本

#### 4. 端口冲突
- 症状：多个 node 进程占用端口，API 返回 404
- 修复：清理所有 node 进程后重新启动

#### 5. MiniMax 模型配置
- 症状：`token plan not support model, MiniMax-Text-01`
- 修复：改用 `MiniMax-M2.7` 模型

#### 6. Live2D 模型显示调整
- 放大倍数：0.6 → 1.0
- Y 轴偏移：居中 → -800（向上偏移）

### 2026/06/01 计划

- [ ] 接入语音系统（TTS/ASR）
- [ ] 优化 Live2D 动作响应
- [ ] 添加更多情感表情

---