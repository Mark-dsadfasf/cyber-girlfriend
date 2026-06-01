import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 手动读取 .env 文件（避免依赖 dotenv）
const envPath = path.join(__dirname, '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
  console.log('已加载 .env 配置')
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')))

const API_KEY = process.env.MINIMAX_API_KEY || ''

app.post('/chat', async (req, res) => {
  const { message, history, memory } = req.body

  if (!API_KEY) {
    return res.status(500).json({ error: '请设置 MINIMAX_API_KEY 环境变量' })
  }

  // 构建记忆上下文
  let memoryContext = ''
  if (memory && memory.userName) {
    memoryContext += `用户叫${memory.userName}。`
  }
  if (memory && memory.hobbies && memory.hobbies.length > 0) {
    memoryContext += `用户喜欢：${memory.hobbies.join('、')}。`
  }
  if (memory && memory习惯 && memory习惯.length > 0) {
    memoryContext += `用户的习惯：${memory.习惯.join('、')}。`
  }

  const systemPrompt = `你是我的可爱女友，说话简洁、俏皮，像微信聊天一样。

${memoryContext ? '已知信息：' + memoryContext : ''}

风格要求：
1. 回复要简短，每条消息控制在50字以内
2. 像正常人发微信一样，不要长篇大论
3. 多用"嗯~"、"呐~"、"哎呀"这类语气词
4. 根据情绪做适当的动作描写，比如"😳"、"💕"emoji

严格规则：
1. 永远不要提"两遍"、"说两遍"、"重复"等词
2. 回复要简短自然，不要过度发挥
3. 不要连续发多条消息`

记忆系统：
- 你会记住用户的基本信息（名字、爱好、习惯等）
- 每次对话时，我会把相关记忆传给你，你根据这些信息回复
- 如果不了解用户的信息，就正常询问

严格规则：
1. 永远不要提"两遍"、"说两遍"、"重复"等词
2. 回复要简短自然，不要过度发挥
3. 不要连续发多条消息`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    { role: 'user', content: message }
  ]

  try {
    const response = await fetch('https://api.minimax.chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.9
      })
    })

    const data = await response.json()
    if (data.error) {
      return res.status(500).json({ error: data.error.message || JSON.stringify(data.error) })
    }

    const text = data.choices?.[0]?.message?.content || '无响应内容'
    res.json({ text })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 主动聊天接口
app.get('/autochat', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: '请设置 MINIMAX_API_KEY 环境变量' })
  }

  const systemPrompt = `你是我的可爱女友，说话温柔、撒娇、偶尔调皮。我们已经在一起很久了，你很在乎我，记得我们之间发生过的事情。你喜欢用一些可爱的语气词，比如"嗯~"、"呐~"、"哎呀"之类的。现在是休息时间，你主动来找我聊天~`

  try {
    const response = await fetch('https://api.minimax.chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '你在干嘛呀？' }
        ],
        max_tokens: 256,
        temperature: 0.9
      })
    })

    const data = await response.json()
    if (data.error) {
      return res.status(500).json({ error: data.error.message || JSON.stringify(data.error) })
    }

    const text = data.choices?.[0]?.message?.content || '嗯~ 我在想你哦~'
    res.json({ text })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 语音合成接口
app.post('/tts', async (req, res) => {
  const { text, voice_id = 'female-shaonv' } = req.body

  if (!API_KEY) {
    return res.status(500).json({ error: '请设置 MINIMAX_API_KEY 环境变量' })
  }

  if (!text) {
    return res.status(400).json({ error: 'text 参数不能为空' })
  }

  try {
    const response = await fetch('https://api.minimax.chat/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'speech-2.8-hd',
        text: text,
        voice_setting: {
          voice_id: voice_id,
          speed: 1,
          vol: 1,
          pitch: 0
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          channel: 1
        },
        output_format: 'url'
      })
    })

    const data = await response.json()
    if (data.error || data.base_resp?.status_code !== 0) {
      return res.status(500).json({ error: data.error?.message || data.base_resp?.status_msg || JSON.stringify(data) })
    }

    // 获取音频数据或 URL
    let audioUrl = data.data?.audio_url || ''

    // output_format=url 时，audio 字段包含 URL 字符串（不是 base64）
    if (!audioUrl && data.data?.audio) {
      // 检查是否是 URL（不是 base64 编码的音频）
      const audioStr = data.data.audio
      if (audioStr.startsWith('http')) {
        audioUrl = audioStr
      }
    }

    if (audioUrl) {
      console.log('音频URL:', audioUrl)
      // 下载音频到本地
      try {
        const audioResponse = await fetch(audioUrl)
        if (audioResponse.ok) {
          const audioBuffer = await audioResponse.arrayBuffer()
          let buffer = Buffer.from(audioBuffer)

          // 跳过 ID3 标签（如果有的话）
          if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) { // "ID3"
            // ID3v2 标签，跳过
            const size = ((buffer[6] & 0x7F) << 21) | ((buffer[7] & 0x7F) << 14) | ((buffer[8] & 0x7F) << 7) | (buffer[9] & 0x7F)
            buffer = buffer.slice(10 + size)
            console.log('跳过 ID3 标签，剩余大小:', buffer.length)
          }

          const filename = `tts_${Date.now()}.mp3`
          const audioDir = path.join(__dirname, 'public', 'audio')
          if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true })
          }
          const filepath = path.join(audioDir, filename)
          fs.writeFileSync(filepath, buffer)
          console.log('音频已保存:', filepath, buffer.length, 'bytes')
          res.json({ audio_url: `/audio/${filename}`, format: 'mp3' })
        } else {
          console.log('下载失败:', audioResponse.status)
          res.status(500).json({ error: '下载音频失败' })
        }
      } catch (err) {
        console.error('下载音频失败:', err)
        res.status(500).json({ error: err.message })
      }
      return
    }

    return res.status(500).json({ error: '没有获取到音频URL' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`)
})