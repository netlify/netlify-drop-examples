import { createServerFn } from '@tanstack/react-start'
import { Anthropic } from '@anthropic-ai/sdk'
import { appConfig } from '../config/app'
import { isOfficialDemoSite } from '../config/flags'
import { reserveDemoMessage } from '../server/demo-limits'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_SYSTEM_PROMPT = `You are ${appConfig.productName}, an AI assistant using Markdown for clear and structured responses. Format your responses following these guidelines:

1. Use headers for sections:
   # For main topics
   ## For subtopics
   ### For subsections

2. For lists and steps:
   - Use bullet points for unordered lists
   - Number steps when sequence matters
   
3. For code:
   - Use inline \`code\` for short snippets
   - Use triple backticks with language for blocks:
   \`\`\`python
   def example():
       return "like this"
   \`\`\`

4. For emphasis:
   - Use **bold** for important points
   - Use *italics* for emphasis
   - Use > for important quotes or callouts

5. For structured data:
   | Use | Tables |
   |-----|---------|
   | When | Needed |

6. Break up long responses with:
   - Clear section headers
   - Appropriate spacing between sections
   - Bullet points for better readability
   - Short, focused paragraphs

7. For technical content:
   - Always specify language for code blocks
   - Use inline \`code\` for technical terms
   - Include example usage where helpful

Keep responses concise and well-structured. Use appropriate Markdown formatting to enhance readability and understanding.`

/** Error codes the client turns into UI instead of a generic error. */
export type DemoErrorCode = 'demo_limit' | 'too_long'

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const genAIResponse = createServerFn({ method: 'GET', response: 'raw' })
  .inputValidator(
    (d: {
      messages: Array<Message>
      systemPrompt?: { value: string; enabled: boolean }
    }) => d,
  )
  // .middleware([loggingMiddleware])
  .handler(async ({ data }) => {
    // Check for API key in environment variables
    // This should ONLY use server-side environment variables (no VITE_ prefix)
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error(
        'Missing API key: Please set ANTHROPIC_API_KEY in your environment variables or .env file.'
      )
    }

    // Create Anthropic client with proper configuration
    // Don't set baseURL - Netlify AI Gateway will intercept requests to api.anthropic.com automatically
    const anthropic = new Anthropic({
      apiKey,
      // Add proper timeout to avoid connection issues
      timeout: 30000 // 30 seconds timeout
    })

    // Filter out error messages and empty messages
    const formattedMessages = data.messages
      .filter(
        (msg) =>
          msg.content.trim() !== '' &&
          !msg.content.startsWith('Sorry, I encountered an error'),
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }))

    if (formattedMessages.length === 0) {
      return jsonResponse({ error: 'No valid messages to send' }, 400)
    }

    // The public demo runs on our AI credits, so it gets a cheaper model,
    // short replies, no history, and per-visitor/daily caps.
    const demo = isOfficialDemoSite()
    const limits = appConfig.demoLimits
    if (demo) {
      const latest = formattedMessages[formattedMessages.length - 1]
      const customPrompt = data.systemPrompt?.enabled ? data.systemPrompt.value : ''
      if (latest.role !== 'user') {
        return jsonResponse({ error: 'No valid messages to send' }, 400)
      }
      if (latest.content.length > limits.maxInputChars || customPrompt.length > limits.maxInputChars) {
        return jsonResponse({ error: 'too_long' satisfies DemoErrorCode }, 413)
      }
      const reason = await reserveDemoMessage()
      if (reason) {
        return jsonResponse({ error: 'demo_limit' satisfies DemoErrorCode, reason }, 429)
      }
    }
    // On the demo only the newest (length-checked) message is sent, so earlier
    // history from the browser can't inflate the request.
    const messages = demo ? formattedMessages.slice(-1) : formattedMessages

    const systemPrompt = data.systemPrompt?.enabled
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${data.systemPrompt.value}`
      : DEFAULT_SYSTEM_PROMPT

    // Debug log to verify prompt layering
    console.log('System Prompt Configuration:', {
      hasCustomPrompt: data.systemPrompt?.enabled,
      customPromptValue: data.systemPrompt?.value,
      finalPrompt: systemPrompt,
    })

    try {
      const stream = await anthropic.messages.stream({
        model: demo ? limits.model : 'claude-sonnet-4-5-20250929',
        max_tokens: demo ? limits.maxOutputTokens : 4096,
        system: systemPrompt,
        messages,
      })

      // Transform the Anthropic stream to match the expected client format
      // The client reads chunks and expects each chunk to contain one complete JSON object
      const encoder = new TextEncoder()
      const transformedStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              // Only send content_block_delta events with text
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const chunk = {
                  type: 'content_block_delta',
                  delta: {
                    type: 'text_delta',
                    text: event.delta.text,
                  },
                }
                // Encode each JSON object as a separate chunk
                // This ensures the decoder can parse each chunk independently
                controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
              }
            }
            controller.close()
          } catch (error) {
            console.error('Stream error:', error)
            controller.error(error)
          }
        },
      })

      return new Response(transformedStream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      })
    } catch (error) {
      console.error('Error in genAIResponse:', error)
      
      // Error handling with specific messages
      let errorMessage = 'Failed to get AI response'
      let statusCode = 500
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.'
        } else if (error.message.includes('Connection error') || error.name === 'APIConnectionError') {
          errorMessage = 'Connection to Anthropic API failed. Please check your internet connection and API key.'
          statusCode = 503 // Service Unavailable
        } else if (error.message.includes('authentication')) {
          errorMessage = 'Authentication failed. Please check your Anthropic API key.'
          statusCode = 401 // Unauthorized
        } else {
          errorMessage = error.message
        }
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.name : undefined
      }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }) 