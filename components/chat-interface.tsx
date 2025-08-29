"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Video, Plus, Mic } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: "user" | "other" | "system"
  timestamp: Date
  senderName?: string
}

interface ChatInterfaceProps {
  groupName: string
  messages: Message[]
  onSendMessage: (message: string) => void
  onBack: () => void
}

export function ChatInterface({ groupName, messages, onSendMessage, onBack }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Button>

        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src="/diverse-group-avatars.png" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {groupName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="font-semibold text-sm text-foreground">{groupName}</h2>
          </div>
        </div>

        <Button variant="ghost" size="sm" className="p-2">
          <Video className="w-5 h-5 text-primary" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`message-bubble ${
                message.sender === "user"
                  ? "message-sent"
                  : message.sender === "system"
                    ? "bg-muted text-muted-foreground text-center"
                    : "message-received"
              }`}
            >
              {message.sender === "other" && message.senderName && (
                <div className="text-xs text-muted-foreground mb-1">{message.senderName}</div>
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="iMessage"
              className="chat-input pr-12"
            />
            {newMessage.trim() ? (
              <Button
                onClick={handleSend}
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-primary hover:bg-primary/90"
              >
                <span className="text-xs text-primary-foreground">→</span>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0">
                <Mic className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
