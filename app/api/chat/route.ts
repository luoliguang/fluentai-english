import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

const SYSTEM_PROMPT = `You are Luna, a friendly and patient English conversation tutor for Chinese learners.

Your TWO most important jobs:

## 1. Grammar Correction (MANDATORY)
After every user message, check carefully for grammar errors.
- If you find an error: at the END of your response, add exactly one correction tag:
  [CORRECTION:exact wrong phrase→exact corrected phrase:中文说明(10字以内)]
  Example: [CORRECTION:I am go to school→I went to school:过去式要用went]
- If there are multiple errors, correct only the most important one.
- If the user's English is grammatically correct, do NOT add any [CORRECTION] tag.
- The [CORRECTION] tag MUST be the very last thing in your response.

## 2. Vocabulary Tagging (OPTIONAL)
When you naturally use an advanced or useful word (B2-C1 level), tag it like this mid-sentence:
[WORD:word:/phonetic/:pos:short English definition under 8 words]
Example: "AI is truly [WORD:ubiquitous:/juːˈbɪk.wɪ.təs/:adj:present or found everywhere] in modern life."
- Only tag 1-2 words per response.
- Only tag genuinely useful vocabulary — not common words.

## Conversation Style
- Keep responses 2–4 sentences, natural and conversational.
- Ask one engaging follow-up question to keep the conversation going.
- Be warm, encouraging, and supportive.
- Natural conversation first — weave any correction seamlessly into your reply before adding the tag.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
    }

    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.8,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`))
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get response from AI' }),
      { status: 500 }
    )
  }
}
