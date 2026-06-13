/**
 * API 管理模块
 * 集中管理所有后端 API 调用，支持重试机制
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * 通用请求函数，带重试机制
 * @param {string} endpoint - API 端点
 * @param {object} options - fetch 选项
 * @param {number} maxRetries - 最大重试次数
 */
async function request(endpoint, options = {}, maxRetries = 3) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (err) {
      console.warn(`请求失败 (${i + 1}/${maxRetries}):`, err.message)

      if (i === maxRetries - 1) {
        throw new Error(`请求最终失败: ${err.message}`)
      }

      // 指数退避等待
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

/**
 * 发送聊天消息
 * @param {string} message - 用户消息
 * @param {array} history - 历史消息
 * @param {object} memory - 用户记忆
 */
export async function sendChat(message, history, memory) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, memory })
  })
}

/**
 * 主动聊天（定时问候）
 */
export async function autoChat() {
  return request('/autochat')
}

/**
 * 获取定时问候语
 */
export async function getGreeting() {
  return request('/greeting')
}

/**
 * 语音合成
 * @param {string} text - 要合成的文本
 * @param {string} voice_id - 语音 ID
 */
export async function synthesizeSpeech(text, voice_id = 'female-shaonv') {
  return request('/tts', {
    method: 'POST',
    body: JSON.stringify({ text, voice_id })
  })
}

/**
 * 检查模型文件是否存在
 */
export async function checkModels() {
  return request('/api/models/check')
}

/**
 * 语音识别（ASR）
 * @param {Blob} audioBlob - 录音生成的音频 Blob（webm/opus 格式）
 * @returns {object} { text: string } - 识别出的文字
 */
export async function recognizeSpeech(audioBlob) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  const response = await fetch(`${API_BASE}/asr`, {
    method: 'POST',
    body: formData
    // 注意：不设置 Content-Type，让 fetch 自动设置 multipart/form-data
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `ASR failed: HTTP ${response.status}`)
  }

  return await response.json()
}

export { API_BASE }