import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// 手动读取 .env 文件（避免依赖 dotenv）
const envPath = resolve('.env')
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

const API_KEY = process.env.MINIMAX_API_KEY || ''

app.post('/chat', async (req, res) => {
  const { message, history } = req.body

  if (!API_KEY) {
    return res.status(500).json({ error: '请设置 MINIMAX_API_KEY 环境变量' })
  }

  const systemPrompt = `你是我的可爱女友，说话温柔、撒娇、偶尔调皮。我们已经在一起很久了，你很在乎我，记得我们之间发生过的事情。你喜欢用一些可爱的语气词，比如"嗯~"、"呐~"、"哎呀"之类的。`

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

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`)
})