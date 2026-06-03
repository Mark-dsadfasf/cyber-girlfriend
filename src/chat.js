import { sendChat, autoChat, getGreeting, synthesizeSpeech } from './api.js'

// 可用模型列表
const AVAILABLE_MODELS = [
  {
    id: 'haru',
    name: '小春',
    avatar: '/models/haru/haru.1024/texture_00.png',
    description: '治愈系女友',
    modelFile: 'haru.model3.json'
  },
  {
    id: 'epsilon',
    name: '艾普西隆',
    avatar: '/models/epsilon/Epsilon.1024/texture_00.png',
    description: '知性御姐',
    modelFile: 'Epsilon.model3.json'
  },
  {
    id: 'hiyori_free',
    name: '日和(免费版)',
    avatar: '/models/hiyori_free/icon.jpg',
    description: '元气少女免费版',
    modelFile: 'hiyori_free_t08.model3.json'
  },
  {
    id: 'akari',
    name: '灯',
    avatar: '/models/akari_vts/icon.jpg',
    description: '温柔元气',
    modelFile: 'akari.model.json',
    folder: 'akari_vts'
  },
  {
    id: 'kei',
    name: '惠',
    avatar: '/models/kei_zh/kei_basic_free.2048/texture_00.png',
    description: '清新女孩',
    modelFile: 'kei_basic_free.model3.json',
    folder: 'kei_zh'
  },
  {
    id: 'tsumiki',
    name: '纺琦',
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
    this.PIXI = null
    this.Live2DModel = null
    this.currentModel = 'haru'
    this.availableModels = AVAILABLE_MODELS
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

  loadHistory() {
    const saved = localStorage.getItem('chat_history')
    if (saved) {
      this.messages = JSON.parse(saved)
    }
  }

  saveHistory() {
    localStorage.setItem('chat_history', JSON.stringify(this.messages))
  }

  setupUI() {
    const input = document.getElementById('chat-input')
    const sendBtn = document.getElementById('send-btn')

    sendBtn.addEventListener('click', () => this.sendMessage())
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage()
    })

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

      console.log('live2dModel 详情:', this.live2dModel)
      console.log('live2dModel.motion:', this.live2dModel.motion)

      // 不同模型的 Y 轴偏移量（负数越大越靠上，正数往下）
      const modelYOffset = {
        'haru': 1,
        'epsilon': 1,
        'hiyori': 1,
        'hiyori_free': 1,
        'akari': 1,
        'kei': 1,
        'tsumiki': 1
      }
      this.live2dModel.y = modelYOffset[this.currentModel] ?? 1
      console.log(`模型 ${this.currentModel} 的 Y 位置设置为: ${this.live2dModel.y}`)

      console.log('Live2D 模型加载成功')
      console.log('模型支持的动作:', this.live2dModel.motions)
      console.log('模型支持的表情:', this.live2dModel.expressions)

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
    this.messages.push({ role, content, time: Date.now(), autoChat, isGreeting })
    this.analyzeEmotion(content, role)
    this.saveHistory()
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

    // 根据情绪选择动作分组
    let group = 'tap'  // 默认用 tap 组的动作

    const emotionMotionMap = {
      'happy': ['tap'],    // 开心用 tap 组的动作
      'angry': ['tap'],    // 生气
      'shy': ['tap'],      // 害羞
      'sad': ['tap'],      // 难过
      'thinking': ['tap'], // 思考
    }

    // 随机选一个动作组
    const groups = emotionMotionMap[this.emotion] || ['tap']
    const selectedGroup = groups[Math.floor(Math.random() * groups.length)]

    console.log('触发动作组:', selectedGroup, '情绪:', this.emotion)
    this.live2dModel.motion(selectedGroup)
  }

  // 触发表情
  triggerExpression() {
    if (!this.live2dModel || !this.live2dModel.expression) return

    // 情绪对应的表情文件
    const emotionExpressions = {
      'happy': 'f01',    // 开心
      'angry': 'f03',    // 生气
      'shy': 'f05',      // 害羞
      'sad': 'f06',      // 难过
      'thinking': 'f07', // 思考
    }

    const expression = emotionExpressions[this.emotion] || 'f01'
    console.log('触发表情:', expression, '情绪:', this.emotion)
    this.live2dModel.expression(expression)
  }

  async playAudio(text, voice_id = 'female-shaonv') {
    if (!text || this.isPlaying) return

    // 去除思考标签（让 TTS 只读有用内容）
    const cleanText = this.stripThought(text)
    if (!cleanText) return

    try {
      this.isPlaying = true
      console.log('开始语音合成:', cleanText)
      const data = await synthesizeSpeech(cleanText, voice_id)
      console.log('TTS 返回:', data)
      if (data.audio_url) {
        // 停止之前的音频
        this.audio.pause()
        this.audio.currentTime = 0
        this.audio.src = data.audio_url

        // 播放口型动画
        this.startLipSyncMotion()

        // 监听播放事件
        this.audio.oncanplay = () => {
          console.log('音频可以播放了')
          this.audio.play().then(() => {
            console.log('播放成功')
          }).catch(err => {
            console.error('播放失败:', err)
          })
        }
        // 监听播放结束，恢复 idle
        this.audio.onended = () => {
          console.log('音频播放结束')
          this.stopLipSyncMotion()
        }
        this.audio.onerror = (e) => {
          console.error('音频加载失败:', e)
          this.stopLipSyncMotion()
        }
        console.log('开始播放:', data.audio_url)
      } else {
        console.log('没有音频数据')
      }
    } catch (err) {
      console.error('播放语音失败:', err)
    } finally {
      this.isPlaying = false
    }
  }

  startLipSyncMotion() {
    if (!this.live2dModel?.motion) return
    // 根据模型选择对应的说话动作组（必须是 model3.json 中定义的组名）
    const motionMap = {
      'haru': 'Tap',
      'tsumiki': 'Tap',
      'epsilon': 'Tap',
      'hiyori_free': 'Tap',
      'kei': '01_kei_zh'
    }
    const motionGroup = motionMap[this.currentModel] || 'm_01'
    console.log('播放口型动作:', motionGroup)
    this.live2dModel.motion(motionGroup).then(() => {
      console.log('口型动作播放成功:', motionGroup)
    }).catch((err) => {
      console.log('口型动作播放失败:', motionGroup, err)
      // 备用方案
      this.live2dModel.motion('m_01').catch(() => {})
    })
  }

  stopLipSyncMotion() {
    if (!this.live2dModel?.motion) return
    // 恢复正常 idle 动画
    this.live2dModel.motion('idle').catch(() => {})
  }

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
}