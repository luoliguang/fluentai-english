export interface Word {
  id: string
  word: string
  phonetic: string
  pos: string          // 词性: adj / noun / verb / adv
  definition: string
  definitionZh?: string
  example: string      // 原始对话中的例句
  savedAt: number      // timestamp
  mastery: number      // 0-100 掌握程度
}

export interface Correction {
  wrong: string        // 用户说的（错误部分）
  right: string        // 正确说法
  explanation: string  // 中文说明
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string           // 原始内容（含 [WORD:...] [CORRECTION:...] 标签）
  displayContent: string    // 解析后用于展示的内容（标签已处理）
  words: Word[]             // 本条消息中提取的单词
  corrections: Correction[] // 本条消息中提取的语法纠错
  timestamp: number
}

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
}
