import { sendChat, autoChat, getGreeting, synthesizeSpeech } from './api.js'
import { API_BASE } from './api.js'

// 可用模型列表
const AVAILABLE_MODELS = [
  {
    id: 'haru',
    name: 'haru',
    avatar: '/models/haru/haru.1024/texture_00.png',
    description: '治愈系女友',
    modelFile: 'haru.model3.json'
  },
  {
    id: 'epsilon',
    name: 'epsilon',
    avatar: '/models/epsilon/Epsilon.1024/texture_00.png',
    description: '知性御姐',
    modelFile: 'Epsilon.model3.json'
  },
  {
    id: 'hiyori_free',
    name: 'hiyori_free',
    avatar: '/models/hiyori_free/icon.jpg',
    description: '元气少女免费版',
    modelFile: 'hiyori_free_t08.model3.json'
  },
  {
    id: 'akari',
    name: 'akari',
    avatar: '/models/akari_vts/icon.jpg',
    description: '温柔元气',
    modelFile: 'akari.model.json',
    folder: 'akari_vts'
  },
  {
    id: 'kei',
    name: 'kei',
    avatar: '/models/kei_zh/kei_basic_free.2048/texture_00.png',
    description: '清新女孩',
    modelFile: 'kei_basic_free.model3.json',
    folder: 'kei_zh'
  },
  {
    id: 'tsumiki',
    name: 'tsumiki',
    avatar: '/models/tsumiki/tsumiki.2048/texture_00.png',
    description: '甜系萌妹',
    modelFile: 'tsumiki.model3.json'
  }
]

export class ChatSystem {
  constructor() {
    this.messages = []
    this.emotion = 'happy' // happy, sad, angry, shy, thinking
    this.app = null
    this.live2dModel = null
    this.audio = new Audio()
    this.isPlaying = false
    this.currentAudioSrc = null
    this.lipsyncCtx = null
    this.lipsyncRaf = null
    this.PIXI = null
    this.Live2DModel = null
    this.currentModel = 'haru'
    this.availableModels = AVAILABLE_MODELS
    this.isLipsyncing = false
    this.lipsyncPlayId = 0
    // 语音录音相关
    this.isRecording = false
    this.mediaRecorder = null
    this.audioChunks = []
    this.mediaStream = null
  }

  init() {
    this.loadHistory()
    this.loadMemory()
    this.setupUI()
    this.setupModelSelector()
    this.initPixi()
    this.startAutoChat()
    // 页面加载时发送问候
    this.sendGreeting()
  }

  // 加载记忆
  loadMemory() {
    const savedEmotion = localStorage.getItem('chat_emotion')
    if (savedEmotion) this.emotion = savedEmotion

    // 加载当前模型
    const savedModel = localStorage.getItem('current_model')
    if (savedModel && this.availableModels.find(m => m.id === savedModel)) {
      this.currentModel = savedModel
    }

    // 加载用户记忆
    this.userName = localStorage.getItem('user_name') || ''
    this.userHobbies = JSON.parse(localStorage.getItem('user_hobbies') || '[]')
    this.user习惯 = JSON.parse(localStorage.getItem('user_习惯') || '[]')
  }

  saveMemory() {
    localStorage.setItem('chat_emotion', this.emotion)
    localStorage.setItem('current_model', this.currentModel)
  }

  // 保存用户信息到记忆
  saveUserInfo(name, hobbies, 习惯) {
    if (name) localStorage.setItem('user_name', name)
    if (hobbies) localStorage.setItem('user_hobbies', JSON.stringify(hobbies))
    if (习惯) localStorage.setItem('user_习惯', JSON.stringify(习惯))
    this.userName = name
    this.userHobbies = hobbies || []
    this.user习惯 = 习惯 || []
  }

  getMemory() {
    return {
      userName: this.userName,
      hobbies: this.userHobbies,
      习惯: this.user习惯
    }
  }

  // 发送时间问候
  async sendGreeting() {
    // 检查问候冷却：至少30分钟一次
    const lastGreeting = localStorage.getItem('last_greeting_time')
    if (lastGreeting && Date.now() - parseInt(lastGreeting) < 30 * 60 * 1000) {
      console.log('问候冷却中，跳过')
      return
    }

    try {
      const data = await getGreeting()
      this.addMessage('assistant', data.text, false, true) // true = 是问候
      localStorage.setItem('last_greeting_time', Date.now().toString())
    } catch (err) {
      console.error('问候失败:', err)
    }
  }

  startAutoChat() {
    // 每 60 秒检查一次
    setInterval(() => {
      if (this.messages.length === 0) return

      const lastMsg = this.messages[this.messages.length - 1]
      const now = Date.now()

      // 检查是否需要发送问候（每30分钟一次）
      const lastGreeting = localStorage.getItem('last_greeting_time')
      if (!lastGreeting || now - parseInt(lastGreeting) >= 30 * 60 * 1000) {
        // 最后一条是女友发的 → 不发了（防止连发）
        if (lastMsg.role !== 'assistant') {
          this.sendGreeting()
          return
        }
      }

      // 最后一条是女友发的 → 不发了（防止连发）
      if (lastMsg.role === 'assistant') return

      // 最后一条用户消息距现在超过 90 秒，才考虑主动聊
      const lastUserMsg = [...this.messages].reverse().find(m => m.role === 'user')
      if (!lastUserMsg) return
      if (now - lastUserMsg.time < 90000) return

      // 今天自动聊天不超过 5 次
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const todayAutoCount = this.messages.filter(
        m => m.role === 'assistant' && m.autoChat && m.time > todayStart.getTime()
      ).length
      if (todayAutoCount >= 5) return

      // 可以发了
      this.sendAutoMessage()
    }, 60000)
  }

  async sendAutoMessage() {
    try {
      const data = await autoChat()
      this.addMessage('assistant', data.text, true) // true = 自动聊天
    } catch (err) {
      console.error('自动聊天失败:', err)
    }
  }

  async loadHistory() {
    // 从后端加载（分页模式）
    try {
      const res = await fetch(`${API_BASE}/api/history?limit=50`)
      const data = await res.json()
      if (data.history && data.history.length > 0) {
        this.messages = data.history
        localStorage.setItem('chat_history', JSON.stringify(this.messages))
        return
      }
    } catch (e) {
      console.log('后端历史记录加载失败，使用本地缓存')
    }
    // 备用 localStorage
    const saved = localStorage.getItem('chat_history')
    if (saved) {
      this.messages = JSON.parse(saved)
    }
  }

  saveHistory(newMessages = null) {
    // 只增量追加新消息，不发送全部历史
    const toSave = newMessages || this.messages.slice(-1)
    localStorage.setItem('chat_history', JSON.stringify(this.messages))
    fetch(`${API_BASE}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: toSave })
    }).catch(err => console.error('同步历史到后端失败:', err))
  }

  setupUI() {
    const input = document.getElementById('chat-input')
    const sendBtn = document.getElementById('send-btn')
    const micBtn = document.getElementById('mic-btn')

    sendBtn.addEventListener('click', () => this.sendMessage())
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage()
    })
    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleRecording())
    }

    this.renderMessages()
  }

  // 设置模型选择器
  setupModelSelector() {
    const selector = document.getElementById('model-selector')
    if (!selector) return

    selector.innerHTML = this.availableModels.map(model => `
      <div class="model-item ${model.id === this.currentModel ? 'active' : ''}" data-model-id="${model.id}">
        <img
          src="${model.avatar}"
          alt="${model.name}"
          class="model-avatar"
          title="${model.description}"
        />
        <span class="model-name">${model.name}</span>
      </div>
    `).join('')

    // 点击切换模型
    selector.addEventListener('click', async (e) => {
      const item = e.target.closest('.model-item')
      if (!item) return

      const modelId = item.dataset.modelId
      if (modelId === this.currentModel) return

      await this.switchModel(modelId)
    })
  }

  // 切换模型
  async switchModel(modelId) {
    const model = this.availableModels.find(m => m.id === modelId)
    if (!model) return

    try {
      // 更新当前模型
      this.currentModel = modelId
      this.saveMemory()

      // 移除旧模型
      if (this.live2dModel) {
        this.app.stage.removeChild(this.live2dModel)
        this.live2dModel.destroy()
        this.live2dModel = null
      }

      // 加载新模型
      const container = document.getElementById('canvas-container')
      await this.loadLive2DModel(this.Live2DModel, container)

      // 更新选择器 UI
      document.querySelectorAll('.model-item').forEach(item => {
        item.classList.toggle('active', item.dataset.modelId === modelId)
      })

      console.log(`模型切换成功: ${model.name}`)
    } catch (err) {
      console.error('模型切换失败:', err)
    }
  }

  async initPixi() {
    try {
      // PIXI 和 pixi-live2d-display 通过 script 标签全局加载
      if (typeof PIXI === 'undefined' || typeof PIXI.live2d === 'undefined') {
        console.error('PIXI 或 pixi-live2d-display 未加载，等待超时; PIXI=', typeof PIXI, '; PIXI.live2d=', typeof PIXI?.live2d)
        return
      }

      this.PIXI = PIXI
      this.Live2DModel = PIXI.live2d.Live2DModel

      const container = document.getElementById('canvas-container')

      // 确保容器有尺寸
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn('canvas-container 尺寸为0，等待布局...')
        await new Promise(r => setTimeout(r, 200))
      }

      this.app = new this.PIXI.Application({
        width: container.offsetWidth || 400,
        height: container.offsetHeight || 600,
        backgroundAlpha: 0
      })

      container.appendChild(this.app.view)

      await this.loadLive2DModel(this.Live2DModel, container)

      window.addEventListener('resize', () => {
        if (this.app) {
          this.app.renderer.resize(container.offsetWidth, container.offsetHeight)
          if (this.live2dModel) {
            this.live2dModel.x = (container.offsetWidth - this.live2dModel.width) / 2
            this.live2dModel.y = (container.offsetHeight - this.live2dModel.height) / 2
          }
        }
      })
    } catch (err) {
      console.error('PIXI/Live2D 初始化失败:', err)
    }
  }

  async loadLive2DModel(Live2DModel, container) {
    const modelInfo = this.availableModels.find(m => m.id === this.currentModel)
    const modelFile = modelInfo?.modelFile || `${this.currentModel}.model.json`
    const folder = modelInfo?.folder || this.currentModel

    try {
      this.live2dModel = await Live2DModel.from(`/models/${folder}/${modelFile}`, {
        autoUpdate: true,
        autoInteract: true
      })

      this.app.stage.addChild(this.live2dModel)

      const scale = Math.min(
        container.offsetWidth / this.live2dModel.width,
        container.offsetHeight / this.live2dModel.height
      ) * 1.0

      this.live2dModel.scale.set(scale)

      this.live2dModel.x = (container.offsetWidth - this.live2dModel.width) / 2

      // 尝试播放 idle 动画
      if (this.live2dModel.motion) {
        this.live2dModel.motion('idle')
      }

    } catch (err) {
      console.error('模型加载失败:', err)
    }
  }

  async sendMessage() {
    const input = document.getElementById('chat-input')
    const sendBtn = document.getElementById('send-btn')
    const text = input.value.trim()
    if (!text) return

    this.addMessage('user', text)
    input.value = ''
    sendBtn.disabled = true

    try {
      const data = await sendChat(text, this.messages.slice(-10), this.getMemory())
      this.addMessage('assistant', data.text)
      // 自动播放语音
      await this.playAudio(data.text)
    } catch (err) {
      this.addMessage('system', '发送失败: ' + err.message)
    } finally {
      sendBtn.disabled = false
    }
  }

  addMessage(role, content, autoChat = false, isGreeting = false) {
    const msg = { role, content, time: Date.now(), autoChat, isGreeting }
    this.messages.push(msg)
    this.analyzeEmotion(content, role)
    this.saveHistory([msg])  // 只传递新消息，不传全部
    this.saveMemory()
    this.renderMessages()

    // AI 回复时触发动作和表情
    if (role === 'assistant') {
      this.triggerMotion()
      this.triggerExpression()
    }
  }

  // 触发随机动作
  triggerMotion() {
    if (!this.live2dModel || !this.live2dModel.motion) return

    // 从 motionManager.definitions 获取可用动作组
    const definitions = this.live2dModel.internalModel?.motionManager?.definitions
    if (!definitions) return

    // 情绪 → 动作组映射（优先使用有内容的组）
    const emotionMotionMap = {
      'happy': ['Idle', 'Flick', 'Tap'],     // 开心：多种动作
      'angry': ['Shake', 'Flick', 'Tap'],    // 生气：震动、触摸
      'shy': ['FlickRight', 'Flick', 'Tap'], // 害羞：向右轻拂
      'sad': ['Tap', 'Flick', 'Idle'],       // 难过：轻触
      'thinking': ['Tap', 'Idle', 'Flick'],  // 思考：轻触为主
    }

    const groups = emotionMotionMap[this.emotion] || ['Idle']
    const selectedGroup = groups[Math.floor(Math.random() * groups.length)]

    // 检查该组是否有可用动作
    if (definitions[selectedGroup] && definitions[selectedGroup].length > 0) {
      console.log('触发动作组:', selectedGroup, '情绪:', this.emotion)
      this.live2dModel.motion(selectedGroup)
    } else {
      // 备用 idle
      console.log('触发动作组: Idle (备用) 情绪:', this.emotion)
      this.live2dModel.motion('Idle')
    }
  }

  // 触发表情
  triggerExpression() {
    if (!this.live2dModel || !this.live2dModel.expression) return

    // 情绪对应的表情文件（haru 模型有这些）
    const emotionExpressions = {
      'happy': ['f01', 'Smile', 'Blushing'],    // 开心
      'angry': ['Angry', 'Surprised'],          // 生气
      'shy': ['Blushing', 'f02', 'Normal'],     // 害羞
      'sad': ['Sad', 'Angry'],                  // 难过
      'thinking': ['Normal', 'Surprised'],      // 思考
      'idle': ['Normal', 'Smile'],              // 待机
    }

    const expressions = emotionExpressions[this.emotion] || ['Normal']
    const expression = expressions[Math.floor(Math.random() * expressions.length)]
    console.log('触发表情:', expression, '情绪:', this.emotion)
    this.live2dModel.expression(expression)
  }

  async playAudio(text, voice_id = 'female-shaonv') {
    if (!text || this.isPlaying) return

    // 去除思考标签（让 TTS 只读有用内容）
    const cleanText = this.stripThought(text)
    if (!cleanText) return

    // isPlaying 锁：合成期间 + 播放期间都锁住，防止重入
    this.isPlaying = true
    this.isLipsyncing = true

    try {
      console.log('开始语音合成:', cleanText)
      const data = await synthesizeSpeech(cleanText, voice_id)
      console.log('TTS 返回:', data)

      if (data.audio_url) {
        // 停止之前的音频并清理口型
        if (this.audio) {
          this.audio.pause()
          this.audio.oncanplay = null
          this.audio.onended = null
          this.audio.onerror = null
          this.audio.src = ''
        }
        this.stopLipsyncMotion()  // 清理上一次残留的 Ticker/AudioContext

        // 每次新建 Audio 元素（避免 createMediaElementSource 重复连接报错）
        this.audio = new Audio()
        this.audio.src = data.audio_url

        // 等音频真正开始播放后再启动口型同步
        this.audio.oncanplay = () => {
          console.log('音频可以播放了')
          this.audio.play().then(() => {
            console.log('播放成功，启动口型同步')
            this.startLipsyncMotion()
          }).catch(err => {
            console.error('播放失败:', err)
            this.isPlaying = false
            this.isLipsyncing = false
          })
        }

        // 播放结束：停止口型，解锁
        const cleanupAudio = () => {
          this.stopLipsyncMotion()
          this.isLipsyncing = false
          this.isPlaying = false
        }
        this.audio.onended = () => {
          console.log('音频播放结束')
          cleanupAudio()
        }
        this.audio.onerror = () => {
          console.log('音频播放错误')
          cleanupAudio()
        }

        console.log('开始播放:', data.audio_url)
      } else {
        console.log('没有音频数据')
        this.isPlaying = false
        this.isLipsyncing = false
      }
    } catch (err) {
      console.error('播放语音失败:', err)
      this.isPlaying = false
      this.isLipsyncing = false
    }
    // 注意：不用 finally 解锁 isPlaying，因为播放是异步的
    // isPlaying 在 onended / onerror 里解锁
  }

  // ─── LipSync via AudioContext + PIXI Ticker ──────────────────────────────
  // 原理：
  //   1. 用 AudioContext AnalyserNode 实时分析音频音量
  //   2. 在 PIXI Ticker（每帧）中，以 OVERRIDE 优先级强制写 PARAM_MOUTH_OPEN_Y
  //   3. 完全绕开 motion 动画系统的优先级覆盖问题
  //   4. 音频结束 / 主动停止时移除 Ticker 回调，口型归零

  startLipsyncMotion() {
    if (!this.live2dModel) {
      console.log('口型同步失败: 模型未加载')
      return
    }

    const internalModel = this.live2dModel.internalModel
    const coreModel = internalModel?.coreModel
    if (!coreModel) {
      console.log('口型同步失败: coreModel 不存在')
      return
    }

    // 如果已有口型 Ticker 在跑，先清掉
    this.stopLipsyncMotion()

    // 禁用内置 LipSync 控制器，防止它与我们的口型写入冲突
    // internalModel.lipSync 存在时设为 false，完全绕开内置口型同步
    if (internalModel.lipSync !== undefined) {
      internalModel.lipSync = false
      console.log('已禁用内置 LipSync 控制器')
    }

    try {
      // 用已有的 Audio 元素建立 AudioContext 分析链
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) {
        console.warn('浏览器不支持 AudioContext，跳过口型同步')
        return
      }

      this._lipsyncAudioCtx = new AudioCtx()
      // 立即 resume，否则 AnalyserNode 在 suspended 状态下不更新数据
      this._lipsyncAudioCtx.resume().catch(() => {})

      const analyser = this._lipsyncAudioCtx.createAnalyser()
      analyser.fftSize = 128  // 128=~2.9ms/帧，降低延迟（原来是256=~5.8ms）
      analyser.smoothingTimeConstant = 0.0  // 无平滑，最快响应

      const source = this._lipsyncAudioCtx.createMediaElementSource(this.audio)
      source.connect(analyser)
      analyser.connect(this._lipsyncAudioCtx.destination)

      const timeData = new Uint8Array(analyser.fftSize)
      this._lipsyncAnalyser = analyser
      this._lipsyncTimeData = timeData

      // 每帧驱动口型参数
      this._lipsyncTickerFn = () => {
        if (!this.live2dModel || !this._lipsyncAnalyser) return

        // 确保 AudioContext 是 running 状态（长音频时浏览器可能自动 suspend / interrupt）
        if (this._lipsyncAudioCtx && this._lipsyncAudioCtx.state !== 'running') {
          this._lipsyncAudioCtx.resume().catch(() => {})
        }

        // 时域数据：直接反映波形振幅，比频域分析延迟更低
        analyser.getByteTimeDomainData(timeData)

        // 计算 RMS 音量 —— 比平均值更能反映感知响度
        let sumSq = 0
        for (let i = 0; i < timeData.length; i++) {
          const sample = (timeData[i] - 128) / 128  // 转成 -1~1
          sumSq += sample * sample
        }
        const rms = Math.sqrt(sumSq / timeData.length)

        // RMS → 口型开合（无平滑，零延迟；有锯齿时口型参数本身会缓动）
        const mouthOpen = Math.min(1.0, rms * 4.5)

        try {
          const cm = this.live2dModel.internalModel?.coreModel
          if (cm) {
            if (typeof cm.setParameterValueById === 'function') {
              cm.setParameterValueById('PARAM_MOUTH_OPEN_Y', mouthOpen)
            }
            if (typeof cm.setParamFloat === 'function') {
              cm.setParamFloat('PARAM_MOUTH_OPEN_Y', mouthOpen)
            }
          }
        } catch (e) {
          // 静默忽略，避免每帧报错
        }
      }

      // 挂到 PIXI Ticker（priority=-1 在模型更新前执行，消除口型滞后）
      if (this.app?.ticker) {
        this.app.ticker.add(this._lipsyncTickerFn, -1)
        console.log('口型同步 Ticker 已启动（时域模式，零平滑）')
      } else {
        console.warn('PIXI Ticker 不可用，口型同步降级跳过')
      }

    } catch (err) {
      console.error('口型同步初始化失败:', err)
    }
  }

  // 停止口型同步，清理所有资源
  stopLipsyncMotion() {
    // 移除 Ticker 回调
    if (this._lipsyncTickerFn && this.app?.ticker) {
      this.app.ticker.remove(this._lipsyncTickerFn)
      this._lipsyncTickerFn = null
    }

    // 关闭 AudioContext
    if (this._lipsyncAudioCtx) {
      this._lipsyncAudioCtx.close().catch(() => {})
      this._lipsyncAudioCtx = null
      this._lipsyncAnalyser = null
      this._lipsyncTimeData = null
    }

    // 重置平滑状态
    this._lipsyncLastMouth = undefined

    // 口型归零
    try {
      const cm = this.live2dModel?.internalModel?.coreModel
      if (cm) {
        if (typeof cm.setParameterValueById === 'function') {
          cm.setParameterValueById('PARAM_MOUTH_OPEN_Y', 0)
        }
        if (typeof cm.setParamFloat === 'function') {
          cm.setParamFloat('PARAM_MOUTH_OPEN_Y', 0)
        }
      }
      // 恢复内置 LipSync 控制器，供下次使用
      const internalModel = this.live2dModel?.internalModel
      if (internalModel && internalModel.lipSync !== undefined) {
        internalModel.lipSync = true
      }
    } catch (e) {}

    console.log('口型同步已停止')
  }
  // ─────────────────────────────────────────────────────────────────────────

  analyzeEmotion(content, role) {
    if (role !== 'assistant') return

    // 情绪关键词映射
    const emotionKeywords = {
      'happy': ['开心', '高兴', '喜欢', '么么', '爱你', '哈哈', '嘻', '好开心', '超喜欢', '可爱', '嘿嘿', ':)', '♥'],
      'angry': ['生气', '哼', '讨厌', '不理', '气死了', '烦', '讨厌', '哼！', '哼唧'],
      'shy': ['害羞', '脸红', '不好意思', '羞羞', '羞死啦', '脸红红的'],
      'sad': ['难过', '伤心', '哭', '委屈', '沮丧', '呜呜', '想哭', '难过']
    }

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(k => content.includes(k))) {
        this.emotion = emotion
        this.saveMemory()
        break
      }
    }
  }

  renderMessages() {
    const container = document.getElementById('chat-messages')
    container.innerHTML = this.messages.map(m => `
      <div class="message ${m.role}">
        <div class="message-content">${this.escapeHtml(this.stripThought(m.content))}</div>
      </div>
    `).join('')
    container.scrollTop = container.scrollHeight
  }

  stripThought(text) {
    if (!text) return ''
    return String(text)
      .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .trim()
  }

  escapeHtml(text) {
    if (!text) return ''
    return String(text).replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
  }

  // ==================== 语音录音功能（Web Speech API）====================

  initSpeechRecognition() {
    // 检查浏览器是否支持 Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('浏览器不支持 Web Speech API')
      return null
    }

    this.recognition = new SpeechRecognition()
    this.recognition.lang = 'zh-CN'  // 设置中文
    this.recognition.continuous = false  // 单次识别
    this.recognition.interimResults = false  // 不返回临时结果

    this.recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      console.log('语音识别结果:', text)
      this.sendMessageFromVoice(text)
      this.isRecording = false
      this.updateMicButtonState()
    }

    this.recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error)
      let errorMsg = '语音识别失败'
      if (event.error === 'not-allowed') {
        errorMsg = '请授权使用麦克风'
      } else if (event.error === 'no-speech') {
        errorMsg = '未检测到语音，请重试'
      }
      this.addMessage('system', errorMsg)
      this.isRecording = false
      this.updateMicButtonState()
    }

    this.recognition.onend = () => {
      console.log('语音识别结束')
      this.isRecording = false
      this.updateMicButtonState()
    }

    return this.recognition
  }

  async startRecording() {
    try {
      // 初始化 SpeechRecognition（如果还没初始化）
      if (!this.recognition) {
        const recognition = this.initSpeechRecognition()
        if (!recognition) {
          this.addMessage('system', '您的浏览器不支持语音识别，请使用 Chrome/Edge')
          return
        }
      }

      // 开始语音识别
      this.recognition.start()
      this.isRecording = true
      this.updateMicButtonState()
      console.log('开始语音识别...')

    } catch (err) {
      console.error('语音识别启动失败:', err)
      this.addMessage('system', '语音识别启动失败: ' + err.message)
      this.isRecording = false
    }
  }

  stopRecording() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop()
    }
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording()
    } else {
      this.startRecording()
    }
  }

  async sendMessageFromVoice(text) {
    const sendBtn = document.getElementById('send-btn')

    // 将识别的文字填入输入框（用于展示）
    const input = document.getElementById('chat-input')
    input.value = text

    // 显示用户消息
    this.addMessage('user', text)
    sendBtn.disabled = true

    try {
      const data = await sendChat(text, this.messages.slice(-10), this.getMemory())
      this.addMessage('assistant', data.text)
      await this.playAudio(data.text)
    } catch (err) {
      this.addMessage('system', '发送失败: ' + err.message)
    } finally {
      sendBtn.disabled = false
      input.value = ''
    }
  }

  updateMicButtonState() {
    const micBtn = document.getElementById('mic-btn')
    if (micBtn) {
      micBtn.classList.toggle('recording', this.isRecording)
      micBtn.textContent = this.isRecording ? '⏹' : '🎤'
    }
  }
}