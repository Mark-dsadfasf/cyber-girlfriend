export class ChatSystem {
  constructor() {
    this.messages = []
    this.emotion = 'happy' // happy, sad, angry, shy, thinking
    this.app = null
    this.live2dModel = null
    this.audio = new Audio()
    this.isPlaying = false
    this.currentAudioSrc = null
  }

  init() {
    this.loadHistory()
    this.loadMemory()
    this.setupUI()
    this.initPixi()
    this.startAutoChat()
    // 页面加载时发送问候
    this.sendGreeting()
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
      const response = await fetch('http://localhost:3001/greeting')
      const data = await response.json()
      this.addMessage('assistant', data.text, false, true) // true = 是问候
      localStorage.setItem('last_greeting_time', Date.now().toString())
    } catch (err) {
      console.error('问候失败:', err)
    }
  }

  loadMemory() {
    const savedEmotion = localStorage.getItem('chat_emotion')
    if (savedEmotion) this.emotion = savedEmotion

    // 加载用户记忆
    this.userName = localStorage.getItem('user_name') || ''
    this.userHobbies = JSON.parse(localStorage.getItem('user_hobbies') || '[]')
    this.user习惯 = JSON.parse(localStorage.getItem('user_习惯') || '[]')
  }

  saveMemory() {
    localStorage.setItem('chat_emotion', this.emotion)
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
      const response = await fetch('http://localhost:3001/autochat')
      const data = await response.json()
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

  async initPixi() {
    // 等待 PIXI 和 pixi-live2d-display 完全加载
    let retries = 0
    while ((!window.PIXI || !window.PIXI.live2d) && retries < 20) {
      await new Promise(r => setTimeout(r, 100))
      retries++
    }

    const PIXI = window.PIXI
    const Live2DModel = window.PIXI?.live2d?.Live2DModel

    if (!PIXI || !Live2DModel) {
      console.error('PIXI 或 pixi-live2d-display 未加载，等待超时; PIXI=', typeof PIXI, '; Live2DModel=', typeof Live2DModel)
      return
    }

    const container = document.getElementById('canvas-container')

    // 确保容器有尺寸
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('canvas-container 尺寸为0，等待布局...')
      await new Promise(r => setTimeout(r, 200))
    }

    this.app = new PIXI.Application({
      width: container.offsetWidth || 400,
      height: container.offsetHeight || 600,
      backgroundAlpha: 0
    })

    container.appendChild(this.app.view)

    await this.loadLive2DModel(Live2DModel, container)

    window.addEventListener('resize', () => {
      if (this.app) {
        this.app.renderer.resize(container.offsetWidth, container.offsetHeight)
        if (this.live2dModel) {
          this.live2dModel.x = (container.offsetWidth - this.live2dModel.width) / 2
          this.live2dModel.y = (container.offsetHeight - this.live2dModel.height) / 2
        }
      }
    })
  }

  async loadLive2DModel(Live2DModel, container) {
    try {
      this.live2dModel = await Live2DModel.from('/models/haru/haru.model.json', {
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
      this.live2dModel.y = -800

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
      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: this.messages.slice(-10),
          memory: this.getMemory()
        })
      })

      const data = await response.json()
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
      const response = await fetch('http://localhost:3001/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice_id })
      })

      const data = await response.json()
      console.log('TTS 返回:', data)
      if (data.audio_url) {
        // 停止之前的音频
        this.audio.pause()
        this.audio.currentTime = 0
        this.audio.src = data.audio_url

        // 监听播放事件
        this.audio.oncanplay = () => {
          console.log('音频可以播放了')
          this.audio.play().then(() => {
            console.log('播放成功')
          }).catch(err => {
            console.error('播放失败:', err)
          })
        }
        this.audio.onerror = (e) => {
          console.error('音频加载失败:', e)
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