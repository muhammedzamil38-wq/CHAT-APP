import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Smile, Phone, Video, Info, MoreVertical, Copy, Edit2, Trash2, Forward, FileIcon, Download, X, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function ChatArea({ selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socket = useSocket();
  const { user } = useAuth();
  const endRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardContent, setForwardContent] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleMessage = (message) => {
      // Only show messages if they belong to this conversation
      const isFromMe = Number(message.senderId) === Number(user?.id) && Number(message.to) === Number(selectedUser?.id);
      const isToMe = Number(message.senderId) === Number(selectedUser?.id) && Number(message.to) === Number(user?.id);
      
      if (isFromMe || isToMe) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleEdit = (editedMessage) => {
      setMessages(prev => prev.map(m => m.id === editedMessage.id ? editedMessage : m));
    };

    const handleDelete = ({ id }) => {
      setMessages(prev => prev.filter(m => m.id !== id));
    };

    socket.on('receive_message', handleMessage);
    socket.on('message_edited', handleEdit);
    socket.on('message_deleted', handleDelete);
    
    // Clear messages when user changes
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
      socket.off('message_edited', handleEdit);
      socket.off('message_deleted', handleDelete);
    };
  }, [socket, selectedUser, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || !socket || !selectedUser) return;

    let fileData = null;

    if (selectedFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const res = await api.post('/api/files/process', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileData = {
          fileUrl: res.data.media.secure_url,
          fileType: selectedFile.type,
          fileName: selectedFile.name
        };
        setSelectedFile(null);
      } catch (error) {
        toast.error('Failed to upload file');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const messageData = {
      to: selectedUser.id,
      text: input || (fileData ? `Sent a file: ${fileData.fileName}` : ''),
      senderId: user.id,
      ...fileData
    };

    socket.emit('private_message', messageData);
    setInput('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied');
  };

  const startEdit = (msg) => {
    setEditingMessage(msg);
    setInput(msg.text);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !editingMessage) return;

    try {
      const res = await api.put(`/api/messages/${editingMessage.id}`, { text: input });
      socket.emit('message_edited', res.data.message);
      setEditingMessage(null);
      setInput('');
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMsg = async (msgId) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    if (Number(msg.senderId) === Number(user?.id)) {
      // It's my message, show options
      setMessageToDelete(msg);
      setShowDeleteModal(true);
    } else {
      // It's someone else's message, only allow 'Delete for Me'
      if (window.confirm('Hide this message from your view?')) {
        executeDelete(msgId, 'me');
      }
    }
  };

  const executeDelete = async (msgId, mode) => {
    try {
      const res = await api.delete(`/api/messages/${msgId}?mode=${mode}`);
      if (mode === 'everyone') {
        socket.emit('message_deleted', res.data);
      } else {
        // Just remove from local state
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
      setShowDeleteModal(false);
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleForward = (text) => {
    setForwardContent(text);
    setShowForwardModal(true);
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
          <div key={m.id} className={`flex flex-col group ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 group">
              {m.senderId === user.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopy(m.text)}><Copy className="w-4 h-4" /></Button>
                  {(new Date() - new Date(m.createdAt) < 10 * 60 * 1000) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => startEdit(m)}><Edit2 className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDeleteMsg(m.id)}><Trash2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleForward(m.text)}><Forward className="w-4 h-4" /></Button>
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 mt-1 shadow-sm ${m.senderId === user.id ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border/50 text-card-foreground rounded-tl-sm'}`}>
                {m.fileUrl && (
                  <div className="mb-2 overflow-hidden rounded-lg border border-white/10">
                    {m.fileType?.startsWith('image/') ? (
                      <img src={m.fileUrl} alt="attachment" className="max-w-full h-auto object-cover max-h-60" />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-black/20">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{m.fileName || 'Document'}</p>
                          <p className="text-[10px] opacity-60 uppercase">{m.fileType?.split('/')[1] || 'File'}</p>
                        </div>
                        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" download={m.fileName} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{m.text}</p>
                {m.isEdited && <span className="text-[10px] opacity-70 block text-right mt-0.5">(edited)</span>}
              </div>
              {m.senderId !== user.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopy(m.text)}><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleForward(m.text)}><Forward className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDeleteMsg(m.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 mx-1">
              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card/30 backdrop-blur-md border-t border-border/40 shrink-0 relative z-10">
        {editingMessage && (
          <div className="mb-2 flex items-center justify-between text-xs text-primary px-2 bg-primary/10 py-1 rounded-lg">
            <span>Editing message...</span>
            <button onClick={() => { setEditingMessage(null); setInput(''); }} className="underline">Cancel</button>
          </div>
        )}
        <form onSubmit={editingMessage ? submitEdit : handleSend} className="flex items-end gap-2 bg-background/50 border border-border/50 p-2 rounded-2xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm">
          <Button type="button" variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-10 w-10">
            <Smile className="w-5 h-5" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-10 w-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.zip"
          />
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedFile ? `File selected: ${selectedFile.name}` : "Type a message..."} 
            className={`flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 shadow-none h-10 resize-none ${selectedFile ? 'text-primary font-medium' : ''}`}
            autoComplete="off"
            disabled={isUploading}
          />
          {selectedFile && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-destructive"
              onClick={() => setSelectedFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button type="submit" size="icon" className="rounded-full shrink-0 h-10 w-10 bg-primary/90 hover:bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95 border-0">
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>

      {/* Delete Options Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Delete Message?</h3>
            <p className="text-sm text-muted-foreground mb-6">Choose how you want to purge this message from the logs.</p>
            <div className="flex flex-col gap-3">
              <Button 
                variant="destructive" 
                className="w-full justify-start gap-2" 
                onClick={() => executeDelete(messageToDelete.id, 'everyone')}
              >
                <Trash2 className="w-4 h-4" /> Delete for Everyone
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start gap-2" 
                onClick={() => executeDelete(messageToDelete.id, 'me')}
              >
                <Info className="w-4 h-4" /> Delete for Me
              </Button>
              <hr className="border-border/50 my-1" />
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Basic Forward Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Forward Message</h3>
            <p className="text-sm text-muted-foreground mb-4 italic">"{forwardContent.substring(0, 50)}..."</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Select Target</p>
              {/* This is a simple implementation, ideally you'd list all friends here */}
              <p className="text-xs italic opacity-50">Select a contact from your sidebar to forward. (Work in Progress)</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowForwardModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
