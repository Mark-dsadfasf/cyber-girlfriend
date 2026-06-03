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

#### 2.6 相关文件
- `public/models/*/motion/*.motion3.json` - 口型动作文件
- `public/models/*/*.moc3` - 模型数据
- `src/chat.js` - 口型同步逻辑

---

### 3. 当前状态

- 后端服务：✅ 运行中 (localhost:3001)
- 前端页面：✅ 运行中 (localhost:5173)
- TTS 语音：✅ 正常播放
- 文字聊天：✅ 正常
- 模型切换：✅ 8个模型可选
- 口型同步：⚠️ 简单方案已实现，但存在动作冲突问题

---

### 4. 待解决问题

1. **口型同步冲突** - `triggerMotion()` 和 `startLipSyncMotion()` 同时触发导致动作覆盖
2. **日更模型穿模** - 付费版 hiyori_vts 显示异常，免费版 hiyori_free 正常
3. **进阶口型方案** - 当前简单方案效果有限，需要升级到实时音频分析方案
