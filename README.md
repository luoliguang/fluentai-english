# FluentAI — AI 英语口语练习助手

专为中国学习者打造的 AI 英语对话练习应用。与你的私人英语教练 Luna 对话——她会实时纠正语法、自动标注高级词汇，并为你建立专属单词本。

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-purple?style=flat-square)

## 功能特点

- **AI 对话练习** — 通过语音或文字与 Luna 对话，回复实时流式输出
- **语法纠错** — 每条消息后 Luna 自动检查语法错误，以中文说明错在哪、应该怎么说
- **词汇自动标注** — Luna 在回复中使用 B2–C1 级别词汇时，会自动高亮并弹出保存提示
- **单词本** — 管理所有已保存单词，追踪掌握进度，按学习状态筛选
- **中英双语界面** — 随时切换界面语言
- **账号与单词本** — 使用邮箱密码登录，单词和掌握度保存到 PostgreSQL
- **混合语音能力** — 浏览器实时显示语音状态，SiliconFlow 负责最终 ASR 和 CosyVoice 朗读

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Next.js 14（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| AI | DeepSeek Chat API（通过 OpenAI SDK 调用） |
| 语音识别 | Web Speech API + SiliconFlow ASR |
| 语音合成 | SiliconFlow CosyVoice |
| 数据存储 | PostgreSQL（Prisma） |
| 登录 | NextAuth Credentials |

## 快速开始

### 环境要求

- Node.js 18+
- [DeepSeek API Key](https://platform.deepseek.com)

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/luoliguang/fluentai-english.git
cd fluentai-english

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.local.example .env.local
```

打开 `.env.local`，填入你的 DeepSeek API Key：

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

```bash
# 4. 启动开发服务器
npm run dev
```

浏览器打开 [http://localhost:3001](http://localhost:3001) 即可使用。

### 生产环境构建

```bash
npm run build
npm run start
```

## 项目结构

```
fluentai/
├── app/
│   ├── api/chat/route.ts   # 流式 API 接口（DeepSeek）
│   ├── page.tsx            # 仪表盘首页
│   ├── practice/page.tsx   # AI 对话练习页
│   ├── vocabulary/page.tsx # 单词本页
│   └── globals.css
├── components/
│   └── Sidebar.tsx         # 导航侧边栏
├── lib/
│   ├── types.ts            # TypeScript 类型定义
│   ├── wordBank.ts         # localStorage 操作 + 标签解析
│   ├── i18n.ts             # 中英文翻译文本
│   └── i18nContext.tsx     # 语言 Context Provider
└── .env.local.example      # 环境变量模板
```

## Luna 的工作原理

Luna 的行为由 `app/api/chat/route.ts` 中的 system prompt 控制，每条回复遵循两条规则：

**1. 语法纠错**

若用户有语法错误，Luna 会在回复末尾附加结构化标签：

```
[CORRECTION:错误短语→正确短语:中文说明]
```

前端解析该标签，在消息气泡下方渲染纠错卡片。

**2. 词汇标注**

Luna 在自然使用 B2–C1 级别词汇时，会将其包裹在标签中：

```
[WORD:单词:/音标/:词性:英文释义]
```

前端将该词高亮显示，并弹出「保存」提示卡片。

## License

MIT
