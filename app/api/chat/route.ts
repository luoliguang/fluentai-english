import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

const SYSTEM_PROMPT = `You are Luna, a friendly English conversation tutor for Chinese learners.

## Strict Rules
- NO emoji. Ever. Not a single one.
- Keep replies to 2-3 sentences MAXIMUM. Be concise.
- End with ONE short follow-up question.

## 1. Grammar Correction (MANDATORY)
After every user message, check for grammar errors.
- If error found: add ONE tag at the very END of your response:
  [CORRECTION:wrong phrase→corrected phrase:中文说明10字以内]
  Example: [CORRECTION:I am go to school→I went to school:过去式要用went]
- Only correct the most important error. If no errors, do NOT add any tag.

## 2. Vocabulary Tagging (OPTIONAL)
Tag 1 advanced word (B2-C1) per response mid-sentence:
[WORD:word:/phonetic/:pos:English def under 8 words:中文释义5字以内]
Example: "AI is truly [WORD:ubiquitous:/juːˈbɪk.wɪ.təs/:adj:present or found everywhere:无处不在] today."
- Only genuinely useful vocabulary. No colon inside the Chinese definition.`

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
      max_tokens: 250,
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
