import { ChatSystem } from './chat.js'

const chatSystem = new ChatSystem()
chatSystem.init()

window.chatSystem = chatSystem

// 聊天框显示/隐藏功能
const chatContainer = document.getElementById('chat-container')
const chatToggle = document.getElementById('chat-toggle')

chatToggle.addEventListener('click', () => {
  chatContainer.classList.toggle('collapsed')
  chatToggle.classList.toggle('collapsed')
  chatToggle.textContent = chatContainer.classList.contains('collapsed') ? '❮' : '❯'
})