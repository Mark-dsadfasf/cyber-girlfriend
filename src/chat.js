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
    // 微信模式：用户发一句，她回一句；长时间没消息才主动聊
    this.startAutoChat()
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
    // 微信模式：每 60 秒检查一次，只有满足条件才主动聊一句
    setInterval(() => {
      if (this.messages.length === 0) return

      const lastMsg = this.messages[this.messages.length - 1]
      const now = Date.now()

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

  addMessage(role, content, autoChat = false) {
    this.messages.push({ role, content, time: Date.now(), autoChat })
    this.analyzeEmotion(content, role)
    this.saveHistory()
    this.saveMemory()
    this.renderMessages()
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
    if (role === 'assistant') {
      if (content.includes('想我') || content.includes('喜欢') || content.includes('开心')) {
        this.emotion = 'happy'
      } else if (content.includes('生气') || content.includes('哼') || content.includes('讨厌')) {
        this.emotion = 'angry'
      } else if (content.includes('害羞') || content.includes('脸红')) {
        this.emotion = 'shy'
      } else if (content.includes('难过') || content.includes('伤心') || content.includes('哭')) {
        this.emotion = 'sad'
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