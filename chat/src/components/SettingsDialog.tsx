import { useState } from 'react'
import { PlusCircle, Sparkles, Trash2, X } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
  Switch,
} from 'app-packs-ui'
import { useAppState } from '../store/hooks'
import { Modal } from './Modal'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [promptForm, setPromptForm] = useState({ name: '', content: '' })
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const { prompts, createPrompt, deletePrompt, setPromptActive } = useAppState()

  const handleAddPrompt = () => {
    if (!promptForm.name.trim() || !promptForm.content.trim()) return
    createPrompt(promptForm.name, promptForm.content)
    setPromptForm({ name: '', content: '' })
    setIsAddingPrompt(false)
  }

  const handleClose = () => {
    onClose()
    setIsAddingPrompt(false)
    setPromptForm({ name: '', content: '' })
  }

  return (
    <Modal open={isOpen} onClose={handleClose} labelledBy="settings-title">
      <Card className="max-h-[85vh] overflow-y-auto shadow-xl">
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <CardTitle id="settings-title">Settings</CardTitle>
            <CardDescription>
              Create and manage custom system prompts. Only one prompt can be active at a time.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close settings" onClick={handleClose}>
            <X className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">System prompts</h3>
            {isAddingPrompt ? null : (
              <Button size="small" variant="subtle" onClick={() => setIsAddingPrompt(true)}>
                <PlusCircle className="size-4" />
                Add prompt
              </Button>
            )}
          </div>

          {isAddingPrompt && (
            <Card variant="muted">
              <CardContent className="space-y-4">
                <Field label="Name" htmlFor="prompt-name">
                  <Input
                    id="prompt-name"
                    value={promptForm.name}
                    onChange={(e) => setPromptForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Friendly pirate"
                    autoFocus
                  />
                </Field>
                <Field label="Prompt" htmlFor="prompt-content">
                  <textarea
                    id="prompt-content"
                    value={promptForm.content}
                    onChange={(e) =>
                      setPromptForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Describe how the assistant should behave..."
                    className="ap-input h-32"
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button size="small" variant="ghost" onClick={() => setIsAddingPrompt(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    onClick={handleAddPrompt}
                    disabled={!promptForm.name.trim() || !promptForm.content.trim()}
                  >
                    Save prompt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {prompts.length === 0 && !isAddingPrompt ? (
            <EmptyState
              icon={<Sparkles className="size-5" />}
              title="No system prompts yet"
              description="Add a prompt to customize how the assistant responds."
            />
          ) : (
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <Item key={prompt.id}>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="truncate">{prompt.name}</ItemTitle>
                    <ItemDescription className="truncate">{prompt.content}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Switch
                      label={<span className="sr-only">Use {prompt.name}</span>}
                      checked={prompt.is_active}
                      onChange={() => setPromptActive(prompt.id, !prompt.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${prompt.name}`}
                      className="hover:text-destructive"
                      onClick={() => deletePrompt(prompt.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter variant="muted" className="justify-end">
          <Button size="small" onClick={handleClose}>
            Done
          </Button>
        </CardFooter>
      </Card>
    </Modal>
  )
}
