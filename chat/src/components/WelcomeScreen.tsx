import { appConfig } from '../config/app'
import { ChatInput } from './ChatInput'

interface WelcomeScreenProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  isLoading: boolean
  maxLength?: number
}

export const WelcomeScreen = (props: WelcomeScreenProps) => (
  <div className="flex flex-1 items-center justify-center px-4">
    <div className="w-full max-w-2xl text-center">
      <h1 className="mb-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        {appConfig.productName}
      </h1>
      <p className="mx-auto mb-8 max-w-lg text-lg text-muted-foreground">{appConfig.tagline}</p>
      <div className="text-left">
        <ChatInput {...props} autoFocus />
      </div>
    </div>
  </div>
)
