import { Avatar } from 'app-packs-ui'
import { appConfig } from '../config/app'

export const LoadingIndicator = () => (
  <div className="flex items-start gap-4 py-6" role="status" aria-live="polite">
    <Avatar
      name={appConfig.assistantName}
      className="animate-pulse bg-accent-subtle text-accent-subtle-foreground"
    />
    <div className="flex items-center gap-3 pt-1.5">
      <span className="text-sm text-muted-foreground">Thinking</span>
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 200, 400].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-accent animate-[bounce_0.8s_infinite]"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  </div>
)
