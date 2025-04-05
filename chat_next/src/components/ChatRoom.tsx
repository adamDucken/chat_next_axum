'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function Chat() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [username, setUsername] = useState('')
  const [showModal, setShowModal] = useState(false)
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [])

  const connectToChat = () => {
    if (username) {
      ws.current = new WebSocket('ws://127.0.0.1:3001/websocket')

      ws.current.onopen = () => {
        setIsConnected(true)
        ws.current?.send(username)
      }

      ws.current.onmessage = (event) => {
        setMessages(prev => [...prev, event.data])
      }

      ws.current.onclose = () => {
        setIsConnected(false)
      }

      setShowModal(false)
    }
  }

  const disconnectFromChat = () => {
    if (ws.current) {
      ws.current.close()
      setIsConnected(false)
      setMessages([])
    }
  }

  const sendMessage = () => {
    if (ws.current && inputMessage) {
      ws.current.send(inputMessage)
      setInputMessage('')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Chat Room</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {messages.map((msg, index) => (
              <div key={index} className="mb-2">
                {msg}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex justify-between">
          {!isConnected ? (
            <Button onClick={() => setShowModal(true)}>Join Chat</Button>
          ) : (
            <>
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <div className="ml-2 flex space-x-2">
                <Button onClick={sendMessage}>Send</Button>
                <Button variant="outline" onClick={disconnectFromChat}>Leave Chat</Button>

              </div>
            </>
          )}
        </CardFooter>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Username</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={connectToChat}>Join Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
