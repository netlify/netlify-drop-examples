import { Send } from 'lucide-react'
import { Button } from 'app-packs-ui'

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  isLoading: boolean
  autoFocus?: boolean
  maxLength?: number
}

export const ChatInput = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
  autoFocus = false,
  maxLength,
}: ChatInputProps) => (
  <form onSubmit={handleSubmit} className="relative">
    <label htmlFor="chat-input" className="sr-only">
      Message
    </label>
    <textarea
      id="chat-input"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSubmit(e)
        }
      }}
      placeholder="Type something clever (or don't, we won't judge)..."
      className="ap-input block resize-none overflow-hidden pr-14 shadow-sm"
      rows={1}
      autoFocus={autoFocus}
      maxLength={maxLength}
      style={{ minHeight: '56px', maxHeight: '200px' }}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement
        target.style.height = 'auto'
        target.style.height = Math.min(target.scrollHeight, 200) + 'px'
      }}
    />
    <Button
      type="submit"
      size="icon-sm"
      aria-label="Send message"
      disabled={!input.trim() || isLoading}
      className="absolute right-2 bottom-2"
    >
      <Send className="size-4" />
    </Button>
  </form>
)
