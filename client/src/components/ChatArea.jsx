import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Smile, Phone, Video, Info, MoreVertical, Copy, Edit2, Trash2, Forward, FileIcon, Download, X, ImageIcon, Loader2, Check, CheckCheck, ChevronLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ImageEditorModal } from './ImageEditorModal';
import { EmojiPicker } from './EmojiPicker';

export function ChatArea({ selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { socket, onlineUsers, triggerNotification } = useSocket();
  const { user } = useAuth();
  const endRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardContent, setForwardContent] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  const triggerNotification = (senderName, text) => {
    if (Notification.permission === 'granted') {
      new Notification(`New message from ${senderName}`, {
        body: text,
      });
    }
  };

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleMessage = (message) => {
      if (Number(message.senderId) === Number(selectedUser.id) || Number(message.to) === Number(selectedUser.id)) {
        setMessages((prev) => [...prev, message]);
        
        // If tab is hidden, still trigger a notification even if this is the active chat
        if (document.visibilityState === 'hidden' && Number(message.senderId) === Number(selectedUser.id)) {
          triggerNotification(selectedUser.username || selectedUser.email, message.text || 'Shared a file');
        }
      }
    };

    const handleEdit = (editedMessage) => {
      setMessages(prev => prev.map(m => m.id === editedMessage.id ? editedMessage : m));
    };

    const handleDelete = (updatedMessage) => {
      setMessages(prev => prev.map(m => Number(m.id) === Number(updatedMessage.id) ? { ...m, ...updatedMessage } : m));
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
        console.error('[UPLOAD-ERROR]', error);
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
    removeSelectedFile();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size exceeds 50MB limit');
        return;
      }
      
      if (file.type.startsWith('image/')) {
        setEditingFile(file);
        setShowEditor(true);
      } else {
        setSelectedFile(file);
        setFilePreview(null); // For non-images, we could show an icon
      }
    }
  };

  const handleEditorConfirm = (editedFile) => {
    setSelectedFile(editedFile);
    if (editedFile.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(editedFile));
    }
    setShowEditor(false);
    setEditingFile(null);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
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
    setPendingFile(null);
  };

  const executeDelete = async (msgId, mode) => {
    try {
      const res = await api.delete(`/api/messages/${msgId}?mode=${mode}`);
      if (mode === 'everyone') {
        socket.emit('message_deleted', res.data);
      } else {
        setMessages(prev => prev.filter(m => Number(m.id) !== Number(msgId)));
      }
      setShowDeleteModal(false);
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInput(prev => prev + emoji);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

  const handleForward = (message) => {
    setForwardingMessage(message);
    setIsForwardModalOpen(true);
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

      <div className="h-16 border-b border-border/40 bg-card/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-2 md:gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-10 w-10 md:hidden -ml-2" onClick={onBack}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary text-sm">
            {selectedUser.email[0].toUpperCase()}
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
        <div className="flex gap-0 md:gap-2 text-muted-foreground">
          {!isMobile && (
            <>
              <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10" title="Voice Call"><Phone className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10" title="Video Call"><Video className="w-5 h-5" /></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full hover:bg-white/10" title="User Info"><Info className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col group ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 group">
              {m.senderId === user.id && !m.isDeleted && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopy(m.text)} title="Copy Message"><Copy className="w-4 h-4" /></Button>
                  {(new Date() - new Date(m.createdAt) < 10 * 60 * 1000) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => startEdit(m)} title="Edit Message"><Edit2 className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDeleteMsg(m.id)} title="Delete Message"><Trash2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleForward(m.text)} title="Forward Message"><Forward className="w-4 h-4" /></Button>
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 mt-1 shadow-sm relative ${m.senderId === user.id ? 'bg-[hsl(var(--sender-bubble))] text-[hsl(var(--bubble-text))] rounded-tr-none' : 'bg-[hsl(var(--recipient-bubble))] text-[hsl(var(--bubble-text))] rounded-tl-none border border-border/50'} ${m.isDeleted ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                <p className={`text-[14.2px] leading-relaxed pr-10 ${m.isDeleted ? 'italic text-muted-foreground' : ''}`}>
                  {m.text}
                </p>
                {!m.isDeleted && m.fileUrl && (
                  <div className="mt-1.5 overflow-hidden rounded-lg border border-white/10">
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
                        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" download={m.fileName} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Download File">
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {m.isEdited && !m.isDeleted && <span className="text-[10px] opacity-50">(edited)</span>}
                  <span className="text-[10px] opacity-60 uppercase">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  {m.senderId === user.id && !m.isDeleted && (
                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                  )}
                </div>
              </div>
              {m.senderId !== user.id && !m.isDeleted && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopy(m.text)} title="Copy Message"><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleForward(m.text)} title="Forward Message"><Forward className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDeleteMsg(m.id)} title="Delete for Me"><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
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

        {/* Selected File Preview Bar */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="relative group">
              {filePreview ? (
                <img src={filePreview} className="w-16 h-16 rounded-xl object-cover border-2 border-primary shadow-lg" alt="Preview" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-card border-2 border-dashed border-primary/50 flex items-center justify-center">
                  <FileIcon className="w-6 h-6 text-primary" />
                </div>
              )}
              <button 
                onClick={removeSelectedFile}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to send</p>
            </div>
          </div>
        )}

        <form onSubmit={editingMessage ? submitEdit : handleSend} className="flex items-end gap-2 bg-background/50 border border-border/50 p-2 rounded-2xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm relative">
          {showEmojiPicker && (
            <EmojiPicker 
              onEmojiSelect={handleEmojiSelect} 
              onClose={() => setShowEmojiPicker(false)} 
            />
          )}
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className={`rounded-full shrink-0 h-10 w-10 ${showEmojiPicker ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-10 w-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach Files"
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
            placeholder="Type a message..." 
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 shadow-none h-10 resize-none"
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
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full shrink-0 h-10 w-10 bg-primary/90 hover:bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95 border-0"
            title="Send Message"
          >
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
      {/* Image Editor Modal */}
      {showEditor && editingFile && (
        <ImageEditorModal 
          file={editingFile} 
          onConfirm={handleEditorConfirm}
          onCancel={() => {
            setShowEditor(false);
            setEditingFile(null);
          }}
        />
      )}
    </div>
  );
}
