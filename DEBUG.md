# 赛博女友项目 - 问题排查

## 当前文件结构

```
D:\Project\cyber-girlfriend\
├── index.html          # 入口HTML
├── src/
│   ├── main.js         # 前端入口
│   └── chat.js         # 聊天系统逻辑
├── server.js           # Express后端 (端口3001)
├── public/
│   ├── pixi.min.js                    # PIXI v6.5.10 (本地)
│   ├── pixi-live2d-display.min.js     # 当前是 cubism4.min.js
│   └── models/haru/
│       ├── haru.model.json            # ⚠️ Cubism 2 格式
│       ├── haru.moc                   # Cubism 2 模型
│       ├── motions/*.mtn              # Cubism 2 动作
│       └── expressions/*.exp.json     # Cubism 2 表情
└── package.json
```

## 加载顺序（index.html）

```html
1. <script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
2. <script src="/pixi.min.js"></script>              # 本地PIXI v6.5.10
3. <script src="/pixi-live2d-display.min.js"></script>  # ⚠️ 当前是cubism4.min.js
4. <script type="module" src="/src/main.js"></script>
```

## 问题分析

### 问题1：PIXI 和 pixi-live2d-display 版本不匹配
- PIXI v6.5.10 安装了
- pixi-live2d-display v0.4.0 的 peerDependencies 也是 `"@pixi/core": "^6"`
- ✅ 版本匹配

### 问题2：pixi-live2d-display.min.js 内容错误
```bash
# 当前 public/pixi-live2d-display.min.js 包含的是 cubism4.min.js
# 但 haru 模型是 Cubism 2 格式

$ grep -o "cubism2\|cubism4\|cubism3" public/pixi-live2d-display.min.js
cubism4  # ❌ 错误！应该是 cubism2
```

### 问题3：模型格式不兼容
haru 模型是 **Cubism 2** 格式：
- `.moc` 文件 (Cubism 2)
- `.mtn` 动作文件 (Cubism 2/3)

但加载的是 `cubism4.min.js`（支持 Cubism 4），不兼容！

### 问题4：Live2D Cubism Core 可能加载失败
```
https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js
```
需要验证是否可访问。

## 修复步骤

### Step 1: 替换正确的 pixi-live2d-display
```bash
cp node_modules/pixi-live2d-display/dist/cubism2.min.js public/pixi-live2d-display.min.js
```

### Step 2: 验证 Cubism Core CDN 可访问
```bash
curl -sI https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js
# 期望: HTTP/1.1 200 OK
```

### Step 3: 检查 PIXI 是否正确加载
在浏览器控制台执行：
```javascript
console.log('PIXI:', typeof PIXI)  // 应该是 function
console.log('Live2D:', typeof PIXI.live2d)  // 应该是 object
console.log('Live2DModel:', typeof PIXI.live2d.Live2DModel)  // 应该是 function
```

### Step 4: 检查模型加载
在控制台或网络面板查看：
- `/models/haru/haru.model.json` 是否返回 200
- `/models/haru/haru.moc` 是否返回 200
- 其他资源是否返回 404

## 当前状态

| 组件 | 状态 | 说明 |
|------|------|------|
| 后端服务 | ✅ | localhost:3001 正常 |
| 前端Vite | ✅ | localhost:5173 正常 |
| PIXI.js | ⚠️ | 本地文件，需验证 |
| pixi-live2d-display | ❌ | 用错了版本(cubism4) |
| Live2D模型 | ⚠️ | Cubism 2格式，需配套插件 |
| Cubism Core | ? | CDN需验证 |

## 待办
1. [ ] 替换 pixi-live2d-display.min.js 为 cubism2.min.js
2. [ ] 验证 CDN 可访问
3. [ ] 刷新页面测试
4. [ ] 检查控制台错误