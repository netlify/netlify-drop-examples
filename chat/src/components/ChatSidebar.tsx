import { Edit2, MessageCircle, PlusCircle, Trash2 } from 'lucide-react'
import {
  Button,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from 'app-packs-ui'
import { appConfig } from '../config/app'

interface ChatSidebarProps {
  conversations: Array<{ id: string; title: string }>
  currentConversationId: string | null
  handleNewChat: () => void
  setCurrentConversationId: (id: string) => void
  handleDeleteChat: (id: string) => void
  editingChatId: string | null
  setEditingChatId: (id: string | null) => void
  editingTitle: string
  setEditingTitle: (title: string) => void
  handleUpdateChatTitle: (id: string, title: string) => void
}

export const ChatSidebar = ({
  conversations,
  currentConversationId,
  handleNewChat,
  setCurrentConversationId,
  handleDeleteChat,
  editingChatId,
  setEditingChatId,
  editingTitle,
  setEditingTitle,
  handleUpdateChatTitle,
}: ChatSidebarProps) => {
  const { collapsed, setMobileOpen } = useSidebar()

  return (
    <Sidebar aria-label="Conversations" className="h-svh md:sticky md:top-0">
      <SidebarHeader>
        <MessageCircle className="size-5 shrink-0 text-accent" />
        <span className="truncate font-semibold">{appConfig.productName}</span>
      </SidebarHeader>

      <SidebarContent>
        <Button
          onClick={() => {
            handleNewChat()
            setMobileOpen(false)
          }}
          size={collapsed ? 'icon' : 'small'}
          aria-label="New chat"
          className="mb-5 w-full"
        >
          <PlusCircle className="size-4" />
          {collapsed ? null : 'New chat'}
        </Button>

        {conversations.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarMenu>
              {conversations.map((chat) => (
                <SidebarMenuItem key={chat.id} className="group relative">
                  {editingChatId === chat.id ? (
                    <input
                      type="text"
                      aria-label="Conversation title"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => {
                        if (editingTitle.trim()) {
                          handleUpdateChatTitle(chat.id, editingTitle)
                        }
                        setEditingChatId(null)
                        setEditingTitle('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingTitle.trim()) {
                          handleUpdateChatTitle(chat.id, editingTitle)
                        } else if (e.key === 'Escape') {
                          setEditingChatId(null)
                          setEditingTitle('')
                        }
                      }}
                      className="ap-input py-2 text-sm"
                      autoFocus
                    />
                  ) : (
                    <>
                      <SidebarMenuButton
                        active={chat.id === currentConversationId}
                        tooltip={chat.title}
                        onClick={() => {
                          setCurrentConversationId(chat.id)
                          setMobileOpen(false)
                        }}
                        className="pr-16"
                      >
                        <MessageCircle className="size-4 shrink-0" />
                        <span className="truncate">{chat.title}</span>
                      </SidebarMenuButton>
                      {collapsed ? null : (
                        <div className="absolute top-1/2 right-1 hidden -translate-y-1/2 items-center group-focus-within:flex group-hover:flex">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Rename ${chat.title}`}
                            onClick={() => {
                              setEditingChatId(chat.id)
                              setEditingTitle(chat.title)
                            }}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${chat.title}`}
                            className="hover:text-destructive"
                            onClick={() => handleDeleteChat(chat.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
