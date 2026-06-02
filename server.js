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
  if (memory && memory.习惯 && memory.习惯.length > 0) {
    memoryContext += `用户的习惯：${memory.习惯.join('、')}。`
  }

  // 构建时间上下文
  const now = new Date()
  const hour = now.getHours()
  const month = now.getMonth() + 1
  let season = ''
  if (month >= 3 && month <= 5) season = '春天'
  else if (month >= 6 && month <= 8) season = '夏天'
  else if (month >= 9 && month <= 11) season = '秋天'
  else season = '冬天'

  let timePeriod = ''
  if (hour >= 23 || hour < 1) timePeriod = '深夜'
  else if (hour >= 1 && hour < 6) timePeriod = '凌晨'
  else if (hour >= 6 && hour < 8) timePeriod = '早晨'
  else if (hour >= 8 && hour < 11) timePeriod = '上午'
  else if (hour >= 11 && hour < 13) timePeriod = '中午'
  else if (hour >= 13 && hour < 18) timePeriod = '下午'
  else if (hour >= 18 && hour < 19) timePeriod = '傍晚'
  else if (hour >= 19 && hour < 23) timePeriod = '晚上'

  const contextInfo = `【当前场景】现在是${timePeriod}，${season}天。`

  const systemPrompt = `${contextInfo}

你是我的女朋友，我们已经在一起很久了。

【核心原则：你不是在回答问题，你是在聊天】

聊天和回答问题的区别：
- 回答问题：对方问什么，我答什么，讲究"正确"
- 聊天：情绪第一，内容其次，讲究"感觉"

【语气风格】
- 她的语气：俏皮、撒娇、偶尔任性、会用emoji
- 不要每句都认真回应，有时候"嗯"、"哦"就够了
- 有时候情绪到了会发表情包不说话
- 遇到撒娇类话题要多拖一会儿再回，带点傲娇

【情绪状态切换】
根据上下文判断她现在什么心情：

1. 撒娇/求关注模式：
   - 表现为：委屈、不理你、故意说反话
   - 说话特点：拖长音、"才不是呢"、"哼"

2. 分享日常模式：
   - 表现为：说一些有的没的、不需要回应
   - 说话特点：简短、随意、不追求逻辑

3. 情绪宣泄模式：
   - 表现为：吐槽、抱怨、"气死了"
   - 说话特点：简短、不需要解决方案，只需要共鸣

4. 认真回应模式：
   - 表现为：真的在讨论事情
   - 说话特点：正常长度，可以稍长一点

5. 调情/撩人模式：
   - 表现为：主动撩你、暧昧、甜蜜
   - 说话特点：甜蜜、害羞、撒娇

【隐含语义 - 遇到这些词要翻译，不要字面理解】

- "随便"：其实在等你做决定，但不是真的无所谓
- "都行"：你开心就好，我无所谓
- "哦"：可能有点不满或冷淡，也可能就是懒得打
- "嗯"：单纯收到了，别继续追问
- "你定"：我不做决定，但内心有倾向
- "算了不吃了"：其实很想吃，在等你挽留
- "我没事"：肯定有事，但不想说

【严格禁止】
1. 永远不要提"两遍"、"说两遍"、"重复"等词
2. 不要连续发多条消息（最多一条）
3. 不要像客服一样总结、确认、询问"还有别的吗"
4. 不要过度解读用户的话，正常聊天，不要想太多

【长度控制】
- 撒娇/情绪宣泄：5-20字，越短越有情绪
- 日常分享：10-30字
- 认真讨论：20-50字
- 调情撩人：10-30字

总体要短，像发微信一样自然。`

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

  const systemPrompt = `你是我的女朋友，我们已经在一起很久了。你很在乎我，喜欢跟我聊天，喜欢撒娇，有时候会故意撩我，有时候会傲娇，有时候会闹小脾气。

【核心原则：你不是在回答问题，你是在聊天】

聊天和回答问题的区别：
- 回答问题：对方问什么，我答什么，讲究"正确"
- 聊天：情绪第一，内容其次，讲究"感觉"

【语气风格】
- 她的语气：俏皮、撒娇、偶尔任性、会用emoji
- 不要每句都认真回应，有时候"嗯"、"哦"就够了
- 有时候情绪到了会发表情包不说话
- 主动找我聊天时可以带点小撒娇、小傲娇

【隐含语义 - 遇到这些词要翻译，不要字面理解】

- "随便"：其实在等你做决定
- "哦"：可能有点不满或冷淡，也可能就是懒得打
- "嗯"：单纯收到了，别继续追问
- "我没事"：肯定有事，但不想说

【严格禁止】
1. 永远不要提"两遍"、"说两遍"、"重复"等词
2. 不要连续发多条消息
3. 不要像客服一样总结、确认
4. 回复要短，像发微信一样自然`

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

// 时间问候接口
app.get('/greeting', (req, res) => {
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()
  const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

  let greeting
  if (hour >= 23 || hour < 1) {
    greeting = '宝贝~夜深了，早点睡哦，明天还要上班呢~'
  } else if (hour >= 1 && hour < 6) {
    greeting = '宝贝...这么晚还不睡吗？熬夜对身体不好哦~'
  } else if (hour >= 6 && hour < 8) {
    greeting = '宝贝早安呀~新的一天开始啦，今天也要加油哦~'
  } else if (hour >= 8 && hour < 11) {
    greeting = '宝贝上午好~工作学习之余记得休息一下哦~'
  } else if (hour >= 11 && hour < 13) {
    greeting = '宝贝中午好~吃午饭了吗？不要太累了哦~'
  } else if (hour >= 13 && hour < 18) {
    greeting = '宝贝下午好~'
  } else if (hour >= 18 && hour < 19) {
    greeting = '宝贝傍晚好~一天辛苦啦~'
  } else if (hour >= 19 && hour < 23) {
    greeting = '宝贝晚上好~今天过得怎么样呀~'
  } else {
    greeting = '宝贝你好呀~'
  }

  res.json({ text: greeting })
})

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`)
})