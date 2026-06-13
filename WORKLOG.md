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

- [x] 接入语音系统（TTS/ASR）
- [ ] 优化 Live2D 动作响应
- [ ] 添加更多情感表情

---

## 2026/06/02 开发记录

### 1. 修复 memory.习惯 访问错误
**问题：** `memory习惯` 应该是 `memory.习惯`（属性访问语法错误）
**文件：** `server.js`

### 2. 增强 systemPrompt 聊天体验
**新增内容：**
- 时间/季节上下文（上午、下午、春天等）
- 5种情绪模式：撒娇/求关注、日常分享、情绪宣泄、认真回应、调情撩人
- 隐含语义翻译规则（"随便"、"哦"、"嗯"等词的真正含义）

**文件：** `server.js`

### 3. 修复音频加载 404 问题
**问题：** 音频文件返回 404，Vite 无法访问后端 static 文件
**原因：** 前端 (Vite:3000) 和后端 (Express:3001) 是分开的服务器
**解决：** 在 `vite.config.js` 添加 `/audio` 代理，指向 `http://localhost:3001`

```javascript
proxy: {
  '/audio': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
}
```

### 4. 修复 favicon.ico 404
**解决：** 在 index.html 添加内联 SVG favicon
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💖</text></svg>">
```

### 当前状态
- 后端服务：✅ 运行中 (localhost:3001)
- 前端页面：✅ 运行中 (localhost:3000)
- TTS 语音：✅ 正常播放
- 文字聊天：✅ 正常
- 音频加载：✅ 已修复

---

### 1. 修复 MiniMax API `thinking` 参数问题
**问题：** API 返回 `invalid params, Mismatch type open_platform_oai.ThinkingConfig with value bool`
**原因：** MiniMax-M2.7 模型不支持 `thinking: false` 参数
**修复：** 从 server.js 的 chat 和 autochat 接口中移除 `thinking` 参数

### 2. 接入 MiniMax TTS 语音合成
**新增接口：** `POST /tts`
**接口地址：** `https://api.minimax.chat/v1/t2a_v2`
**模型：** `speech-2.8-hd`
**音色：** `female-shaonv`（少女音色）

**请求参数格式：**
```json
{
  "model": "speech-2.8-hd",
  "text": "要转换的文本",
  "voice_setting": {
    "voice_id": "female-shaonv",
    "speed": 1,
    "vol": 1,
    "pitch": 0
  },
  "audio_setting": {
    "sample_rate": 32000,
    "bitrate": 128000,
    "channel": 1
  },
  "output_format": "url"
}
```

### 3. 解决音频文件格式问题
**问题1：** 直接返回 base64 音频无法播放（浏览器报 NotSupportedError）
**原因：** MiniMax 返回的 base64 数据包含 ID3 标签，需要跳过前 14 字节才能得到有效 MP3 数据

**问题2：** output_format=url 时 audio 字段包含的是 URL 字符串，不是 base64
**原因：** 需要用 `output_format: 'url'` 参数，然后下载返回的 OSS URL

**解决方案：**
- 添加 `output_format: 'url'` 参数
- 获得 URL 后下载音频文件到本地 `/public/audio/` 目录
- 跳过 ID3 标签（对于某些格式需要）
- 返回本地文件路径给前端播放

### 4. 前端语音播放功能
**修改文件：** `src/chat.js`
**功能：**
- AI 回复后自动调用 TTS 接口
- 使用 Audio 对象播放语音
- 过滤掉 AI 思考标签，只发送实际内容给 TTS
- 添加播放状态管理（isPlaying）防止重复播放

### 5. 修复 AI 乱说"你说两遍"的问题
**问题：** AI 会幻觉用户说了两遍话，实际上用户只发了一遍
**原因：** AI 模型过度解读用户消息
**修复：** 强化 systemPrompt 规则：
- 永远不提"两遍"、"重复"等词
- 不暗示用户说了重复的话
- 每条消息只读一遍，正常回复

### 当前状态
- 后端服务：✅ 运行中 (localhost:3001)
- 前端页面：✅ 运行中 (localhost:3000)
- TTS 语音：✅ 正常播放
- 文字聊天：✅ 正常

---
---

## 2026/06/02 下午开发记录

### 1. 专家建议优化实施

根据专家建议，完成了以下优化：

#### 1.1 创建 src/api.js 管理 API 调用
- 集中管理所有后端 API 调用（sendChat, autoChat, getGreeting, synthesizeSpeech）
- 添加重试机制（最多3次，指数退避）
- 使用环境变量配置 API 地址

#### 1.2 更新 vite.config.js 配置代理
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      rewrite: (path) => path.replace(/^\/api/, '')
    },
    '/audio': 'http://localhost:3001'
  }
}
```

#### 1.3 添加错误处理和重试机制
- API 请求失败时自动重试，最多重试3次
- 指数退避等待（1s, 2s, 3s）

#### 1.4 优化 Live2D 模型加载方式
- 使用 ES Module 导入（但发现 pixi-live2d-display 需要通过 script 标签全局加载）
- 保留通过 window.PIXI.live2d 的方式

#### 1.5 环境变量安全保护
- .env 重命名为 .env.local（已被 gitignore）
- 创建 .env.local.example 模板文件

---

### 2. 模型切换功能实现

#### 2.1 创建模型选择器 UI
- 在 canvas-container 底部添加模型头像选择栏
- 胶囊形状，半透明背景

#### 2.2 实现动态模型加载
- 支持切换不同的 Live2D 模型
- 当前模型保存在 localStorage

#### 2.3 复制 VTube Studio 模型到项目
从 F:/SteamLibrary/steamapps/common/VTube Studio/VTube Studio_Data/StreamingAssets/Live2DModels 复制：
- tororo_vts → tororo_vts（后改名为日更）
- akari_vts → akari_vts
- hiyori_vts → hiyori_vts

#### 2.4 模型重命名
- tororo.model3.json → tororo.model.json
- akari.model3.json → akari.model.json
- hiyori.model3.json → hiyori.model.json

#### 2.5 模型列表更新
```javascript
const AVAILABLE_MODELS = [
  {
    id: 'haru',
    name: '小春',
    avatar: '/models/haru/haru.1024/texture_00.png',
    description: '治愈系女友',
    modelFile: 'haru.model.json'
  },
  {
    id: 'hiyori',
    name: '日更',
    avatar: '/models/hiyori_vts/icon.jpg',
    description: '元气少女',
    modelFile: 'hiyori.model.json',
    folder: 'hiyori_vts'
  },
  {
    id: 'akari',
    name: '灯',
    avatar: '/models/akari_vts/icon.jpg',
    description: '温柔元气',
    modelFile: 'akari.model.json',
    folder: 'akari_vts'
  }
]
```

---

### 3. 调整各模型的 Y 轴位置

通过反复测试调整，最终确定各模型的 Y 位置：

| 角色 | Y 位置 | 说明 |
|---|---|---|
| 小春 | -800 | 原始位置 |
| 日更 | -1 | 偏低一点 |
| 灯 | 1 | 正常显示 |

**注意：** 代码中使用 `??` 运算符避免 0 值被误判为 falsy

---

### 4. 修复 Live2D 库加载问题

#### 4.1 切换到 Cubism 4 库
- 从 VTube Studio 复制过来的模型是 .moc3 格式（Cubism 3/4）
- 需要使用 cubism4.min.js 或完整版 index.min.js

#### 4.2 当前引用的库文件
```html
<!-- Live2D Cubism Core (Cubism 4 需要这个) -->
<script src="/live2dcubismcore.min.js"></script>
<!-- Live2D Cubism 2.1 Runtime (for haru .moc) -->
<script src="/live2d.min.js"></script>
<!-- PIXI.js -->
<script src="/pixi.min.js"></script>
<!-- pixi-live2d-display (完整版，支持 Cubism 2/3/4) -->
<script src="/pixi-live2d-display.min.js"></script>
```

---

### 5. 中间遇到的问题及解决方案

#### 问题1：Live2D 库加载失败
- **现象**：报错 "Could not find Cubism 4 runtime"
- **原因**：`live2dcubismcore.min.js` 没有引入，加载顺序也不对
- **解决**：在 index.html 中添加核心库，调整为正确顺序

#### 问题2：模型切换后加载失败
- **现象**：报错 "Failed to load resource as json (Status 200)" 找不到模型文件
- **原因**：代码里模型 ID 是 `tororo`，但实际文件夹叫 `tororo_vts`
- **解决**：在模型配置里加 `folder` 字段指定实际目录名

#### 问题3：Y 位置改成 0 没效果
- **现象**：设置 `tororo: 0` 时位置不变，和 `-800` 一样
- **原因**：JavaScript 里 `0` 是 falsy 值，`|| -800` 走了默认值
- **解决**：改用 `??` 运算符（只在 null/undefined 时用默认值）

#### 问题4：日更模型穿模
- **现象**：日更显示出来手有四个，身体变形
- **原因**：VTube Studio 对模型做了非标准修改，网页库解析出错
- **状态**：未解决，需要用 Live2D Cubism Editor 重新导出

#### 问题5：模型文件夹无法重命名
- **现象**：Windows 权限问题，`tororo_vts` 无法改名成 `tororo`
- **解决**：保留原名，通过配置里的 `folder` 字段区分

---

### 6. 当前状态

- 后端服务：✅ 运行中 (localhost:3001)
- 前端页面：✅ 运行中 (localhost:5173)
- TTS 语音：✅ 正常播放
- 文字聊天：✅ 正常
- 模型切换：✅ 基本功能正常，但 VTube Studio 模型可能有显示问题

---

### 7. 待解决问题

1. **日更模型显示异常** - VTube Studio 导出的模型在 pixi-live2d-display 中显示异常（穿模、手臂数量异常）
   - 原因：VTube Studio 对模型做了修改，非标准格式
   - 解决方案：用 Live2D Cubism Editor 重新导出

2. **模型文件夹无法重命名** - Windows 权限问题，tororo_vts/akari_vts/hiyori_vts 无法直接重命名
   - 临时方案：在配置中使用 folder 字段指定实际目录名

---

### 8. 文件变更汇总

**新增文件：**
- src/api.js - API 管理模块
- vite.config.js - Vite 配置（更新）
- .env.local.example - 环境变量模板

**修改文件：**
- src/chat.js - 添加模型切换功能、重试机制、模型配置结构
- index.html - 调整库加载顺序、添加模型选择器 UI
- server.js - 读取 .env.local
- WORKLOG.md - 本次更新

**删除文件：**
- public/cubism4.min.js - 改用 index.min.js
- public/cubism2.min.js - 不需要单独版本

---

### 9. 代码逻辑分析

#### 模型配置结构
```javascript
AVAILABLE_MODELS = [
  { id: 'haru', name: '小春', modelFile: 'haru.model.json' },
  { id: 'hiyori', name: '日更', modelFile: 'hiyori.model.json', folder: 'hiyori_vts' },
  { id: 'akari', name: '灯', modelFile: 'akari.model.json', folder: 'akari_vts' }
]
```

#### Y 位置配置
```javascript
const modelYOffset = {
  'haru': -800,
  'hiyori': -1,
  'akari': 1
}
```

#### 存在的问题
1. **动作触发**：硬编码用 `tap` 组，不是所有模型都有
2. **表情触发**：硬编码 haru 的表情名（f01-f08），日更/灯用不同命名
3. **Idle 动画**：写死 `idle`，不一定所有模型都有叫 idle 的动作

#### 建议改进
每个模型的配置应该包含自己的动作和表情映射，例如：
```javascript
{
  id: 'akari',
  name: '灯',
  yOffset: 1,
  motions: { 'happy': ['Love', 'Idle_2'], 'angry': ['Shock'], ... },
  expressions: { 'happy': 'EyesLove', 'angry': 'SignAngry', ... },
  idleMotion: 'Idle_2'
}
```

---

### 10. 今日完成内容总结

**完成项：**
- ✅ 实施专家建议的 4 项优化（API 管理、重试机制、环境变量、模型加载）
- ✅ 实现模型切换功能（左下角头像选择栏）
- ✅ 添加小春、日更、灯三个角色
- ✅ 调整各模型 Y 位置（小春 -800，日更 -1，灯 1）
- ✅ 在头像下方显示角色名字
- ✅ 完成代码逻辑分析，发现需要改进的地方

**待解决：**
- ❌ 日更模型穿模问题需用 Live2D Cubism Editor 重新导出
- ❌ 日更/灯的动作/表情触发需配置专属映射
- ❌ Live2D Cubism Editor 需重新安装

---

### 11. 模型资源汇总

**haru（小春）：**
- 路径：/models/haru/
- 格式：Cubism 2.1（.moc）
- 动作/表情：标准格式，正常可用

**hiyori（日更）：**
- 路径：/models/hiyori_vts/
- 格式：Cubism 4（.moc3）
- 动作/表情：VTube Studio 专用格式，显示异常，需重新导出

**akari（灯）：**
- 路径：/models/akari_vts/
- 格式：Cubism 4（.moc3）
- 动作/表情：VTube Studio 专用格式（.motion3.json, .exp3.json），需重新导出才能用

---

## 2026/06/03 开发记录

### 1. 模型更新与新增

#### 1.1 从桌面模型文件夹批量导入
从 `C:/Users/Might/Desktop/模型/` 复制以下模型到 `public/models/`：

**新增模型：**
- `epsilon`（艾普西隆）→ `public/models/epsilon/`
- `hiyori_free`（日和免费版）→ `public/models/hiyori_free/`
- `tsumiki`（纺琦）→ `public/models/tsumiki/`
- `kei_zh`（惠）→ `public/models/kei_zh/`

**替换模型：**
- `haru` → 新版本，功能更完善
- `kei_zh` → 替换旧版本，解决穿模问题

**保留模型（未改动）：**
- `hiyori_vts`（日和付费版，保留备用）
- `akari_vts`（灯，保留备用）
- `tororo_vts`（傻狸，保留备用）

#### 1.2 当前可用模型列表
```javascript
AVAILABLE_MODELS = [
  { id: 'haru', name: '小春', modelFile: 'haru.model3.json' },
  { id: 'epsilon', name: '艾普西隆', modelFile: 'Epsilon.model3.json' },
  { id: 'hiyori_free', name: '日和(免费版)', modelFile: 'hiyori_free_t08.model3.json' },
  { id: 'akari', name: '灯', modelFile: 'akari.model.json', folder: 'akari_vts' },
  { id: 'kei', name: '惠', modelFile: 'kei_basic_free.model3.json', folder: 'kei_zh' },
  { id: 'tsumiki', name: '纺琦', modelFile: 'tsumiki.model3.json' },
  { id: 'hiyori', name: '日更', modelFile: 'hiyori.model.json', folder: 'hiyori_vts' },
  { id: 'tororo', name: '傻狸', modelFile: 'tororo.model.json', folder: 'tororo_vts' }
]
```

#### 1.3 Y 轴位置统一调整
所有模型的 Y 坐标统一设置为 1：
```javascript
const modelYOffset = {
  'haru': 1,
  'epsilon': 1,
  'hiyori': 1,
  'hiyori_free': 1,
  'akari': 1,
  'kei': 1,
  'tsumiki': 1
}
```

---

### 2. 口型同步功能

#### 2.1 功能设计
**目标：** 让虚拟形象在说话时嘴巴跟着动

**技术方案：**
- **简单方案（当前）**：播放音频 → 触发预制口型动画
- **进阶方案（未来）**：播放音频 → 实时分析音频波形 → 动态驱动 LipSync 参数

#### 2.2 实现方式
在 `src/chat.js` 中添加两个方法：
- `startLipSyncMotion()`：播放音频时触发口型动画
- `stopLipSyncMotion()`：音频结束后恢复 idle 动画

#### 2.3 各模型口型动作配置
```javascript
const motionMap = {
  'haru': 'Tap',       // haru 的 Tap 组有口型动画
  'tsumiki': 'Tap',
  'epsilon': 'Tap',
  'hiyori_free': 'Tap',
  'kei': '01_kei_zh'   // kei 使用带声音的动作文件
}
```

#### 2.4 当前问题
- **问题：** `triggerMotion()` 和 `startLipSyncMotion()` 同时触发，都在播放 Tap 组动作，导致冲突
- **现象：** 有时候嘴巴动，有时候不动
- **原因：** 两套动作触发机制抢同一个动作组
- **状态：** 待解决

#### 2.5 进阶方案（未来实现）
当简单方案效果不够好时，升级到进阶方案：
- 使用 Web Audio API 的 `AudioContext` + `AnalyserNode` 实时分析音频
- 根据音频波形数据（音量、频率）动态驱动模型的 LipSync 参数
- 不同模型的 LipSync 参数名不同：
  - haru: `PARAM_MOUTH_OPEN_Y`
  - kei: `ParamMouthOpenY`
- 需要添加参数平滑过渡，避免抖动

**升级时只需要修改 `startLipSyncMotion()` 方法，其他代码不变。**

#### 2.6 方案1：音量驱动口型同步（当前实现）

**原理：** 使用 Web Audio API 的 `AnalyserNode` 实时分析音频音量，映射到嘴巴参数 `PARAM_MOUTH_OPEN_Y`

**实现代码：**
```javascript
bindLipsync(audioElement) {
  const ctx = new AudioContext()
  const src = ctx.createMediaElementSource(audioElement)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  src.connect(analyser)
  analyser.connect(ctx.destination)
  
  const data = new Uint8Array(analyser.frequencyBinCount)
  const update = () => {
    analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    const vol = sum / data.length / 255
    const mouthOpen = Math.min(1.0, vol * 2.5)
    this.live2dModel.internalModel.coreModel.setParameterValueById('PARAM_MOUTH_OPEN_Y', mouthOpen)
    this.lipsyncRaf = requestAnimationFrame(update)
  }
  update()
}
```

**验证结果：**
- 参数 `PARAM_MOUTH_OPEN_Y` 可以正常设置和读取
- 口型同步**有效果**，嘴巴会跟着音量动

#### 2.7 当前问题

**问题1：情绪动作覆盖口型参数**
- **现象：** 掐腰等 Tap 组动作播放时，口型不动
- **原因：** Tap 组动作包含完整身体动画，会覆盖 `PARAM_MOUTH_OPEN_Y` 参数
- **状态：** 待解决

**问题2：AudioContext 重复连接错误**
- **现象：** `InvalidStateError: Cannot close a closed AudioContext`
- **原因：** 每次播放新建 AudioContext，结束时重复 close
- **状态：** 待修复

#### 2.8 进阶方案（未来实现）

当简单方案效果不够好时，升级到进阶方案：

**方案A：官方 Cubism Web SDK + MotionSync Plugin**
- 完整支持 `motionsync3.json` 配置
- 实时元音（A/I/U/E/O）分析驱动口型
- 需要独立项目结构，不能混用 pixi-live2d-display

**方案B：混合过渡方案**
- 保留 pixi-live2d-display 渲染层
- 自己实现 Web Audio API 音频分析器
- 每帧更新嘴巴参数

#### 2.9 相关文件
- `public/models/*/motion/*.motion3.json` - 口型动作文件
- `public/models/*/*.moc3` - 模型数据
- `src/chat.js` - 口型同步逻辑（bindLipsync 方法）

---

### 3. 当前状态

- 后端服务：✅ 运行中 (localhost:3001)
- 前端页面：✅ 运行中 (localhost:5173)
- TTS 语音：✅ 正常播放
- 文字聊天：✅ 正常
- 模型切换：✅ 8个模型可选
- 口型同步：⚠️ 方案1（音量驱动）已实现，部分模型有效但存在冲突问题

---

### 4. 待解决问题

1. **口型参数被情绪动作覆盖** - 掐腰等动作播放时口型不动
2. **AudioContext 重复 close 错误** - 需要修复
3. **日更模型穿模** - 付费版 hiyori_vts 显示异常
4. **进阶口型方案** - 需要官方 SDK 才能完整支持惠的 MotionSync

---

## 2026/06/04 开发记录

### 1. 口型同步问题修复

#### 问题描述
- 长句子播放时，后半段嘴巴不动
- 播放内置日语语音导致体验差
- 循环播放口型动作导致页面卡死
- 情绪动作与口型参数冲突

#### 解决方案

**1.1 消除内置日语语音**
- 删除 `public/models/haru/sounds/` 下的所有 `.wav` 文件
- 从 `haru.model3.json` 中删除所有 `Sound` 引用
- 其他模型同理清理

**1.2 新口型同步方案**
采用 PIXI Ticker + AudioContext 时域分析，替代之前的循环播放方案：

```javascript
// 原理：
// 1. 用 AudioContext AnalyserNode 实时分析音频时域数据（比频域更快）
// 2. 在 PIXI Ticker（priority=-1）中，每帧强制写 PARAM_MOUTH_OPEN_Y
// 3. 绕开 motion 动画系统的优先级覆盖问题
// 4. 音频结束 / 主动停止时移除 Ticker 回调，口型归零

startLipsyncMotion() {
  // AudioContext + AnalyserNode 分析链
  // 每帧在 PIXI Ticker 中用 RMS 计算音量并设置参数
  const rms = Math.sqrt(sumSq / timeData.length)
  const mouthOpen = Math.min(1.0, rms * 4.5)
  // 以覆盖方式设置参数，忽略动画系统
}

stopLipsyncMotion() {
  // 移除 Ticker 回调
  // 关闭 AudioContext
  // 口型归零
}
```

**1.3 修复循环播放卡死问题**
- 原方案：motion 完成回调里递归调用自己
- 问题：motion 文件本身 Loop:true，motion() 返回的 Promise 不会 resolve
- 解决：不使用循环播放，改用 PIXI Ticker 每帧强制设置参数

**1.4 修复音频结束后多余动作触发**
- 删除了 `cleanupAudio` 中的 `triggerMotion()` 和 `triggerExpression()`
- 避免 TTS 播完后突然跳动作

#### 当前状态
- 口型同步：✅ 基本功能正常，嘴巴能跟随 TTS 动
- 细微问题：长句子后半段可能嘴巴不动（浏览器 AudioContext suspend 或音量太小）
- 内置日语：✅ 已消除

---

### 2. 模型名称修改

将所有模型的 `name` 字段改为英文（与文件夹名一致）：

```javascript
AVAILABLE_MODELS = [
  { id: 'haru', name: 'haru', ... },
  { id: 'epsilon', name: 'epsilon', ... },
  { id: 'hiyori_free', name: 'hiyori_free', ... },
  { id: 'akari', name: 'akari', ... },
  { id: 'kei', name: 'kei', ... },
  { id: 'tsumiki', name: 'tsumiki', ... }
]
```

---

### 3. 后端持久化存储

**新增接口：**
- `GET /api/history` - 获取聊天记录
- `POST /api/history` - 保存聊天记录

**存储文件：** `chat_history.json`

**前端逻辑：**
- 优先从后端加载历史记录
- 同时备份到 localStorage
- 每次发消息同步到后端

---

### 4. 时间问题修复

**问题：** AI 说出的时间与实际时间不符（如实际 3:00 说 1:49）

**原因：** 之前 prompt 只传了时间段（凌晨/上午等），没传具体时间

**修复：** 在 `contextInfo` 中添加具体时间
```javascript
// 修改前
const contextInfo = `【当前场景】现在是${dayOfWeek}，${timePeriod}，${season}天。`

// 修改后
const contextInfo = `【当前场景】现在是${hour}点${minute}分，${dayOfWeek}，${timePeriod}，${season}天。`
```

---

### 5. 今日文件变更

**新增文件：**
- `chat_history.json` - 聊天记录持久化存储

**修改文件：**
- `src/chat.js` - 口型同步重写、音频结束逻辑修改、模型名称修改
- `public/models/haru/haru.model3.json` - 删除所有 Sound 引用
- `public/models/haru/sounds/` - 删除所有 .wav 文件
- `server.js` - 添加 /api/history 接口、contextInfo 添加具体时间
- `WORKLOG.md` - 本次更新

---

### 6. 当前状态

- 后端服务：✅ 运行中 (localhost:3001)
- 前端页面：✅ 运行中 (localhost:5173)
- TTS 语音：✅ 正常播放
- 文字聊天：✅ 正常
- 口型同步：⚠️ 基本可用，有小幅改进空间
- 模型切换：✅ 6个模型可用
- 聊天记录持久化：✅ 已实现
- 时间准确性：✅ 已修复

---

### 7. 待优化

1. **口型幅度调整** - `rms * 4.5` 系数可能需要根据实际效果调整
2. **长音频口型持续** - 长句子后半段嘴巴不动的问题
3. **其他模型口型** - 不同模型的嘴巴参数名可能不同（haru: PARAM_MOUTH_OPEN_Y）
4. **平滑处理** - `smoothingTimeConstant = 0.0` 可能需要适当平滑避免抖动

---

## 2026/06/05 开发记录

### 1. 聊天记录存储问题修复

**问题：** `/api/history` 接口返回 `413 Payload Too Large`

**原因：** 之前的设计是前端每次把所有历史消息 POST 给后端存储。当对话很长时，单次请求体过大超过 Express 默认限制。

**解决方案：**
- 改为**增量追加模式**：前端只传递新消息，不传全部历史
- 后端保存时只追加新消息，去重后裁剪到最近 50 条
- 前端不再无脑全量同步，改为每次只同步最新一条

**修改文件：**
- `server.js`：`saveHistory()` 函数改为增量追加
- `src/chat.js`：`saveHistory([msg])` 只传单条新消息

### 2. 口型同步问题修复

**问题表现：**
- 说话时嘴巴偶尔动，偶尔不动
- 调试日志显示 `before` 值总是被重置（非零值被覆盖成 0）
- 内置 LipSync 控制器在不断覆盖我们的写入值

**根因：** `internalModel.lipSync` 内置控制器在每帧自动重置 `PARAM_MOUTH_OPEN_Y`，导致我们自己设置的值被覆盖

**解决方案：**
- 在 `startLipsyncMotion()` 启动前，先设置 `internalModel.lipSync = false` 禁用内置控制器
- 在 `stopLipsyncMotion()` 停止后，恢复 `internalModel.lipSync = true`

**修改文件：**
- `src/chat.js`：`startLipsyncMotion()` 和 `stopLipsyncMotion()` 添加 lipSync 控制切换

**验证结果：**
- 调试日志显示 `after` 值都正确等于写入值，没有被覆盖
- 口型随 RMS 音量持续张合，不再中断

### 3. 调试日志清理

**移除的日志：**
- `[口型写入]` 每 30 帧打印一次 before/after 值
- `[口型]` 每 30 帧打印 rms/mouthOpen 值

**保留的日志（关键节点）：**
- `口型同步已停止`
- `口型同步 Ticker 已启动`
- `已禁用内置 LipSync 控制器`

### 4. 当前状态

| 功能 | 状态 |
|---|---|
| 后端服务 | ✅ 运行中 (localhost:3001) |
| 前端页面 | ✅ 运行中 (localhost:5173) |
| TTS 语音 | ✅ 正常播放 |
| 文字聊天 | ✅ 正常 |
| 口型同步 | ✅ 已修复，嘴巴持续张合 |
| 聊天记录持久化 | ✅ 增量追加模式，50条上限 |

### 5. 待解决问题

1. **肢体动作触发不稳定** — 有时候动有时候不动，可能和动作组配置有关
2. **表情丰富度** — 情绪识别后触发的表情还不够丰富
3. **其他模型口型** — haru 以外的模型嘴巴参数名可能不同，需要适配

---

## 2026/06/14 开发记录

### 1. 语音输入功能开发

#### 1.1 需求背景
用户希望能够直接用麦克风和虚拟女友对话，而不是手动打字输入。

#### 1.2 方案探索

**方案1：MiniMax ASR API（后端录音识别）**
- 技术栈统一（都是 MiniMax）
- 但个人用户没有 ASR 权限，API 返回 404
- 尝试多个端点：`/v1/speech_to_text`、`/v1/s2t` 均返回 404

**方案2：Web Speech API（前端直接识别）**
- 浏览器原生语音识别，无需后端
- 完全免费，中文支持好
- 依赖浏览器（Chrome/Edge 效果最佳）
- 隐私安全（录音留在本地）

#### 1.3 实现过程

**第一阶段：MiniMax ASR 尝试**
- 添加 `multer` 中间件处理文件上传
- 添加 `POST /asr` 后端路由
- 前端使用 `MediaRecorder` 录音
- 问题：Buffer 无法直接用于 FormData，需要用 `Blob` 包装
- 问题：MiniMax ASR 端点返回 404，权限不足

**第二阶段：Mock 模式测试**
- 为了验证流程完整性，使用 Mock 模式直接返回固定文字
- 验证了录音 → 识别 → 发送 → AI回复 → TTS → 口型同步 整个流程正常

**第三阶段：Web Speech API 实现**
- 替换 `MediaRecorder` + ASR 为 `Web Speech API`
- 前端代码改动：
  - 移除 `recognizeSpeech` API 调用
  - `startRecording()` 改为调用 `SpeechRecognition.start()`
  - 实时返回识别结果，无需录音上传
- 后端 `/asr` 路由保留作为备用（或可删除）

#### 1.4 最终实现

**前端修改（src/chat.js）：**
```javascript
initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  this.recognition = new SpeechRecognition()
  this.recognition.lang = 'zh-CN'
  this.recognition.continuous = false
  this.recognition.interimResults = false

  this.recognition.onresult = (event) => {
    const text = event.results[0][0].transcript
    this.sendMessageFromVoice(text)
  }
}

startRecording() {
  this.recognition.start()
  this.isRecording = true
}
```

**HTML 修改（index.html）：**
- 添加 `#mic-btn` 麦克风按钮
- 添加录音状态 CSS 样式（红色闪烁）

#### 1.5 相关文件

**新增/修改：**
- `package.json` - 添加 `multer`、`form-data` 依赖
- `server.js` - 添加 `/asr` 路由（当前 Mock 模式）
- `src/api.js` - 添加 `recognizeSpeech()` 函数
- `src/chat.js` - 添加语音录音功能、Web Speech API 实现
- `index.html` - 添加麦克风按钮和 CSS

**清理：**
- `public/audio/tts_*.mp3` - 清理所有旧 TTS 临时文件

#### 1.6 当前状态

| 功能 | 状态 |
|---|---|
| 后端服务 | ✅ 运行中 (localhost:3001) |
| 前端页面 | ✅ 运行中 (localhost:5173) |
| 文字聊天 | ✅ 正常 |
| TTS 语音 | ✅ 正常 |
| 口型同步 | ✅ 正常 |
| **语音输入** | ✅ **Web Speech API 实现，可正常使用** |

#### 1.7 使用方法

1. 使用 **Chrome 或 Edge 浏览器**访问 `http://localhost:5173`
2. 点击麦克风按钮 🎤
3. 浏览器会请求麦克风权限，**请允许**
4. 对着麦克风说话
5. 说完后自动发送识别内容，AI 回复并播放 TTS

#### 1.8 已知问题

- `no-speech` 错误：第一次点击没说话时会触发，不是真正错误
- 浏览器兼容性：建议使用 Chrome/Edge，Firefox 支持稍差

### 2. 待优化/待解决

1. **ASR 正式接入** — 未来如果有机会获得 MiniMax ASR 权限，可改回后端识别
2. **连续对话** — 当前是单次识别后可考虑连续识别模式
3. **噪声抑制** — Web Speech API 对环境噪音敏感，可考虑前端降噪

