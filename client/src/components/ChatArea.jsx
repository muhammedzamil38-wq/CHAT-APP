import React, { useState, useRef, useEffect } from 'react';
import { 
  Paperclip, Send, Smile, Phone, Video, Info, MoreVertical, Copy, 
  Edit2, Trash2, Forward, FileIcon, Download, X, ImageIcon, 
  Loader2, Check, CheckCheck, ChevronLeft, MessageSquare 
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ImageEditorModal } from './ImageEditorModal';
import { EmojiPicker } from './EmojiPicker';
import { UserInfoModal } from './UserInfoModal';

export function ChatArea({ selectedUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { socket, onlineUsers, triggerNotification } = useSocket();
  const { user } = useAuth();
  const endRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const fileInputRef = useRef(null);
  
  // File states
  const [pendingFile, setPendingFile] = useState(null); // { file, preview, type }
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modals
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);

  const handleMessage = (message) => {
    // Only show messages if they belong to this conversation
    const isFromMe = Number(message.senderId) === Number(user?.id) && Number(message.to) === Number(selectedUser?.id);
    const isToMe = Number(message.senderId) === Number(selectedUser?.id) && Number(message.to) === Number(user?.id);
    
    if (isFromMe || isToMe) {
      setMessages((prev) => {
        if (prev.some(m => Number(m.id) === Number(message.id))) return prev;
        return [...prev, message];
      });
      
      // Notification logic
      if (document.visibilityState === 'hidden' && isToMe) {
        triggerNotification(selectedUser.username || selectedUser.email, message.text || 'Shared a file');
      }
    }
  };

  useEffect(() => {
    if (!socket || !selectedUser) return;
    
    socket.on('receive_message', handleMessage);
    socket.on('message_edited', (updatedMessage) => {
      setMessages(prev => prev.map(m => Number(m.id) === Number(updatedMessage.id) ? updatedMessage : m));
    });

    const handleDelete = (updatedMessage) => {
      setMessages(prev => prev.map(m => Number(m.id) === Number(updatedMessage.id) ? { ...m, ...updatedMessage } : m));
    };

    socket.on('message_deleted', handleDelete);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('message_edited');
      socket.off('message_deleted');
    };
  }, [socket, selectedUser, triggerNotification]);

  // Load message history
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/api/messages/${selectedUser.id}`);
        setMessages(res.data?.messages || []);
      } catch (error) {
        console.error('Failed to fetch messages', error);
      }
    };
    if (selectedUser) fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() && !pendingFile) return;

    setIsUploading(true);
    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    try {
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile.file);
        const uploadRes = await api.post('/api/files/upload', formData);
        fileUrl = uploadRes.data.url;
        fileType = pendingFile.type;
        fileName = pendingFile.file.name;
      }

      socket.emit('private_message', {
        to: selectedUser.id,
        text: input,
        senderId: user.id,
        fileUrl,
        fileType,
        fileName
      });

      setInput('');
      setPendingFile(null);
    } catch (error) {
      toast.error("Failed to deliver message");
    } finally {
      setIsUploading(false);
    }
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

  const executeDelete = async (msgId, mode) => {
    try {
      const res = await api.delete(`/api/messages/${msgId}?mode=${mode}`);
      if (mode === 'everyone') {
        socket.emit('message_deleted', res.data);
      } else {
        setMessages(prev => prev.filter(m => Number(m.id) !== Number(msgId)));
      }
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInput(prev => prev + emoji);
  };

  const handleDeleteMsg = (msg) => {
    if (Number(msg.senderId) === Number(user?.id)) {
      if (window.confirm('Delete this message for everyone?')) {
        executeDelete(msg.id, 'everyone');
      }
    } else {
      if (window.confirm('Delete this message for you?')) {
        executeDelete(msg.id, 'me');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit');
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingFile({ file, preview: event.target.result, type: 'image' });
        setIsEditorOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      setPendingFile({ file, type: 'file' });
    }
  };

  const handleEditedImage = (editedBlob) => {
    const editedFile = new File([editedBlob], pendingFile.file.name, { type: 'image/jpeg' });
    setPendingFile({
      file: editedFile,
      preview: URL.createObjectURL(editedBlob),
      type: 'image'
    });
    setIsEditorOpen(false);
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50 backdrop-blur-sm text-muted-foreground p-8 text-center">
        <div className="max-w-xs space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
            <MessageSquare className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-sm font-medium">Uplink established. Select a crew member to start a mission.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[hsl(var(--chat-bg))]" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')` }} />

      {/* Header */}
      <div className="h-16 border-b border-border/40 bg-card/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-2 md:gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-10 w-10 md:hidden -ml-2" onClick={onBack}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary text-sm overflow-hidden">
            {selectedUser.avatarUrl ? (
              <img src={selectedUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              selectedUser.email[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate max-w-[120px] md:max-w-none">{selectedUser.username || selectedUser.email}</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
              {onlineUsers.includes(String(selectedUser.id)) ? (
                <>
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Online
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground/30 block"></span>
                  Offline
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-1 md:gap-2 text-muted-foreground">
          {!isMobile && (
            <>
              <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10" title="Voice Call"><Phone className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10" title="Video Call"><Video className="w-5 h-5" /></Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:text-foreground rounded-full hover:bg-white/10" 
            title="User Info"
            onClick={() => setShowUserInfo(true)}
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col group ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
            <div className="max-w-[85%] md:max-w-[70%] relative">
              <div className={`
                px-4 py-2 rounded-2xl text-sm shadow-sm relative group border
                ${m.senderId === user.id 
                  ? 'bg-primary text-primary-foreground rounded-tr-none border-primary/20' 
                  : 'bg-secondary/60 dark:bg-[#2a2a2a] text-foreground rounded-tl-none border-border/40 dark:border-white/5'}
                ${m.isDeleted ? 'opacity-50 italic' : ''}
              `}>
                {m.fileUrl && !m.isDeleted && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                    {m.fileType === 'image' ? (
                      <img src={m.fileUrl} alt="shared" className="max-h-60 w-full object-cover cursor-pointer" onClick={() => window.open(m.fileUrl)} />
                    ) : (
                      <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/20 hover:bg-black/30 transition-colors" title="Download File">
                        <FileIcon className="w-5 h-5" />
                        <span className="text-xs truncate max-w-[150px]">{m.fileName || 'Document'}</span>
                        <Download className="w-4 h-4 ml-auto" />
                      </a>
                    )}
                  </div>
                )}
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                  <span className="text-[10px]">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.senderId === user.id && (
                    <CheckCheck className={`w-3 h-3 ${onlineUsers.includes(String(selectedUser.id)) ? 'text-blue-400' : ''}`} />
                  )}
                </div>

                {/* Message Actions - Now with Frosted Glass and High Contrast */}
                {!m.isDeleted && (
                  <div className={`
                    absolute top-0 flex gap-1 p-1 bg-white/10 dark:bg-black/60 backdrop-blur-xl rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 border border-white/20
                    ${m.senderId === user.id ? 'right-full mr-3' : 'left-full ml-3'}
                  `}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/20 text-foreground" onClick={() => navigator.clipboard.writeText(m.text)} title="Copy">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/20 text-destructive" onClick={() => handleDeleteMsg(m)} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {m.senderId === user.id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/20 text-foreground" onClick={() => startEdit(m)} title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card/30 backdrop-blur-xl border-t border-border/40 relative z-20">
        {/* File Preview */}
        {pendingFile && (
          <div className="absolute bottom-full left-4 right-4 p-2 bg-background/90 backdrop-blur-md border border-border/40 rounded-t-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
            {pendingFile.type === 'image' ? (
              <img src={pendingFile.preview} alt="preview" className="w-12 h-12 rounded object-cover" />
            ) : (
              <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center"><FileIcon className="w-6 h-6 text-primary" /></div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{pendingFile.file.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{pendingFile.type}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPendingFile(null)}><X className="w-4 h-4" /></Button>
          </div>
        )}

        {showEmojiPicker && <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}

        <form onSubmit={editingMessage ? submitEdit : handleSendMessage} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add Emoji">
            <Smile className="w-5 h-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => fileInputRef.current.click()} title="Attach File">
            <Paperclip className="w-5 h-5" />
          </Button>
          <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} />
          
          <div className="flex-1 relative">
            <Input 
              placeholder={editingMessage ? "Edit message..." : "Type a mission update..."} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="bg-background/50 border-border/50 h-11 pr-10"
            />
            {editingMessage && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setEditingMessage(null); setInput(''); }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Button type="submit" size="icon" className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20" disabled={isUploading || (!input.trim() && !pendingFile)} title="Send Message">
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && pendingFile && (
        <ImageEditorModal 
          file={pendingFile.file} 
          onConfirm={handleEditedImage} 
          onCancel={() => setIsEditorOpen(false)} 
        />
      )}

      <UserInfoModal 
        user={selectedUser} 
        isOpen={showUserInfo} 
        onClose={() => setShowUserInfo(false)} 
      />
    </div>
  );
}
