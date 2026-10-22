import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { Avatar } from 'app-packs-ui'
import { appConfig } from '../config/app'
import type { Message } from '../utils/ai'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export const ChatMessage = ({ message, isStreaming = false }: ChatMessageProps) => {
  const isAssistant = message.role === 'assistant'

  return (
    <div className="streaming-message flex items-start gap-4 py-6">
      <Avatar
        name={isAssistant ? appConfig.assistantName : 'You'}
        className={isAssistant ? 'bg-accent-subtle text-accent-subtle-foreground' : undefined}
      />
      <div className={`min-w-0 flex-1 ${isStreaming ? 'streaming-cursor' : ''}`}>
        <div className="mb-1 text-sm font-medium">
          {isAssistant ? appConfig.assistantName : 'You'}
        </div>
        <ReactMarkdown
          className="prose max-w-none"
          rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
