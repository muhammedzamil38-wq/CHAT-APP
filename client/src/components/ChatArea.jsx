import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Smile, Phone, Video, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

export function ChatArea({ selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socket = useSocket();
  const { user } = useAuth();
  const endRef = useRef(null);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleMessage = (message) => {
      // Only show messages if they belong to this conversation
      if (
        (message.senderId === user.id && message.to === selectedUser.id) ||
        (message.senderId === selectedUser.id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on('receive_message', handleMessage);
    
    // Clear messages when user changes (since we don't have persistence yet)
    setMessages([]);

    const fetchHistory = async () => {
      try {
        const res = await api.get(`/api/messages/${selectedUser.id}`);
        setMessages(res.data.history);
      } catch (error) {
        console.error('Failed to fetch history', error);
      }
    };
    fetchHistory();

    return () => {
      socket.off('receive_message', handleMessage);
    };
  }, [socket, selectedUser, user.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket || !selectedUser) return;

    const messageData = {
      to: selectedUser.id,
      text: input,
      senderId: user.id
    };

    socket.emit('private_message', messageData);
    setInput('');
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        <div className="text-center z-10">
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">Select a crew member</h2>
          <p className="text-sm text-muted-foreground/60">Choose someone to start a secure mission broadcast.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Subtle Chat Background Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      {/* Chat Header */}
      <div className="h-16 border-b border-border/40 bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
            {selectedUser.email[0].toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-sm">{selectedUser.username || selectedUser.email}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
              Online
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-muted-foreground">
          <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10"><Phone className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10"><Video className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10"><Info className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 mt-1 shadow-sm ${m.senderId === user.id ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border/50 text-card-foreground rounded-tl-sm'}`}>
              <p className="text-sm leading-relaxed">{m.text}</p>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 mx-1">{m.time}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card/30 backdrop-blur-md border-t border-border/40 shrink-0 relative z-10">
        <form onSubmit={handleSend} className="flex items-end gap-2 bg-background/50 border border-border/50 p-2 rounded-2xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm">
          <Button type="button" variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-10 w-10">
            <Smile className="w-5 h-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-10 w-10">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 shadow-none h-10 resize-none"
            autoComplete="off"
          />
          <Button type="submit" size="icon" className="rounded-full shrink-0 h-10 w-10 bg-primary/90 hover:bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95 border-0">
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
