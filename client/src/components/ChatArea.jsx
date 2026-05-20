import React, { useState, useRef, useEffect } from 'react';
import { 
  Paperclip, Send, Smile, Phone, Video, Info, MoreVertical, Copy, 
  Edit2, Trash2, Forward, FileIcon, Download, X, ImageIcon, 
  Loader2, Check, CheckCheck, ChevronLeft, MessageSquare,
  Mic, Play, Pause, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { api } from '../lib/api';
import { ImageEditorModal } from './ImageEditorModal';
import { EmojiPicker } from './EmojiPicker';
import { UserInfoModal } from './UserInfoModal';
import { GroupInfoModal } from './GroupInfoModal';
import { Dialog } from './ui/dialog';

function VoicePlayer({ fileUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [fileUrl]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error("Audio playback failed", e));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-black/10 dark:bg-white/5 rounded-xl border border-white/10 min-w-[200px]">
      <audio ref={audioRef} src={fileUrl} preload="metadata" />
      <button 
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-blue-500/20 dark:bg-blue-400/25 hover:bg-blue-500/30 dark:hover:bg-blue-400/40 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors shrink-0 animate-pulse-subtle"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current text-blue-600 dark:text-blue-400" /> : <Play className="w-4 h-4 fill-current text-blue-600 dark:text-blue-400 translate-x-[1px]" />}
      </button>
      <div className="flex-1 space-y-1">
        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          value={currentTime} 
          onChange={handleSeek}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500 dark:accent-blue-400" 
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export function ChatArea({ selectedUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { socket, onlineUsers, triggerNotification } = useSocket();
  const { user } = useAuth();
  const { initiateCall, joinGroupCall } = useCall();
  const endRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const fileInputRef = useRef(null);
  
  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  
  // File states
  const [pendingFile, setPendingFile] = useState(null); // { file, preview, type }
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modals
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  
  // Reply and Delete states
  const [replyingTo, setReplyingTo] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [groupCallActive, setGroupCallActive] = useState(false);
  const [groupCallIsVideo, setGroupCallIsVideo] = useState(false);

  useEffect(() => {
    if (!socket || !selectedUser || !selectedUser.isGroup) {
      setGroupCallActive(false);
      return;
    }

    const handleActiveStatus = (data) => {
      if (Number(data.groupId) === Number(selectedUser.id)) {
        setGroupCallActive(data.isActive);
        setGroupCallIsVideo(data.isVideo || false);
      }
    };

    const handleStatusUpdate = (data) => {
      if (Number(data.groupId) === Number(selectedUser.id)) {
        setGroupCallActive(data.isActive);
        setGroupCallIsVideo(data.isVideo || false);
      }
    };

    socket.on("group_call_active_status", handleActiveStatus);
    socket.on("group_call_status_update", handleStatusUpdate);

    // Initial check
    socket.emit("group_call_check_active", { groupId: selectedUser.id });

    return () => {
      socket.off("group_call_active_status", handleActiveStatus);
      socket.off("group_call_status_update", handleStatusUpdate);
    };
  }, [socket, selectedUser]);

  const handleMessage = (message) => {
    // Only show messages if they belong to this conversation/group
    if (selectedUser.isGroup) {
      if (Number(message.groupId) === Number(selectedUser.id)) {
        setMessages((prev) => {
          if (prev.some(m => Number(m.id) === Number(message.id))) return prev;
          return [...prev, message];
        });

        // Trigger Notification if window is in background and message is from someone else
        if (document.visibilityState === 'hidden' && Number(message.senderId) !== Number(user?.id)) {
          triggerNotification(
            selectedUser.name, 
            `${message.senderName || 'Operative'}: ${message.text || 'Shared a file'}`
          );
        }
      }
      return;
    }

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

    const handleProfileUpdate = (updatedUser) => {
      setMessages(prev => prev.map(m => {
        if (Number(m.senderId) === Number(updatedUser.userId)) {
          return { ...m, senderAvatar: updatedUser.avatarUrl, senderName: updatedUser.username };
        }
        return m;
      }));
    };

    socket.on('message_deleted', handleDelete);
    socket.on('user_profile_updated', handleProfileUpdate);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('user_profile_updated', handleProfileUpdate);
    };
  }, [socket, selectedUser, triggerNotification]);

  // Load message history
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const endpoint = selectedUser.isGroup 
          ? `/api/messages/group/${selectedUser.id}` 
          : `/api/messages/${selectedUser.id}`;
        const res = await api.get(endpoint);
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
        const uploadRes = await api.post('/api/files/process', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = uploadRes.data.media.secure_url;
        fileType = pendingFile.type;
        fileName = pendingFile.file.name;
      }

      if (selectedUser.isGroup) {
        socket.emit('group_message', {
          groupId: selectedUser.id,
          text: input,
          senderId: user.id,
          fileUrl,
          fileType,
          fileName,
          replyToId: replyingTo?.id
        });
      } else {
        socket.emit('private_message', {
          to: selectedUser.id,
          text: input,
          senderId: user.id,
          fileUrl,
          fileType,
          fileName,
          replyToId: replyingTo?.id
        });
      }

      setInput('');
      setPendingFile(null);
      setReplyingTo(null);
    } catch (error) {
      toast.error("Failed to deliver message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleForwardMessage = async (recipient) => {
    if (!forwardingMessage) return;
    try {
      if (recipient.isGroup) {
        socket.emit('group_message', {
          groupId: recipient.id,
          text: forwardingMessage.text,
          senderId: user.id,
          fileUrl: forwardingMessage.fileUrl,
          fileType: forwardingMessage.fileType,
          fileName: forwardingMessage.fileName,
          isForwarded: true
        });
      } else {
        socket.emit('private_message', {
          to: recipient.id,
          text: forwardingMessage.text,
          senderId: user.id,
          fileUrl: forwardingMessage.fileUrl,
          fileType: forwardingMessage.fileType,
          fileName: forwardingMessage.fileName,
          isForwarded: true
        });
      }
      setIsForwardModalOpen(false);
      setForwardingMessage(null);
      toast.success(`Message forwarded to ${recipient.name || recipient.username || recipient.email}`);
    } catch (error) {
      toast.error("Forwarding failed");
    }
  };

  const fetchContacts = async () => {
    try {
      const [usersRes, groupsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/groups')
      ]);
      const users = (usersRes.data.users || []).map(u => ({ ...u, isGroup: false }));
      const groups = (groupsRes.data.groups || []).map(g => ({ ...g, isGroup: true, name: g.name }));
      setContacts([...groups, ...users]);
    } catch (error) {
      console.error('Failed to fetch forwarding targets', error);
    }
  };

  const startEdit = (msg) => {
    setEditingMessage(msg);
    setInput(msg.text);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied or error:", err);
      toast.error("Could not access microphone.");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const sendVoiceNote = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'voice_note.webm', { type: 'audio/webm' });
      
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', audioFile);
        
        const uploadRes = await api.post('/api/files/process', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const fileUrl = uploadRes.data.media.secure_url;

        if (selectedUser.isGroup) {
          socket.emit('group_message', {
            groupId: selectedUser.id,
            text: '🎤 Voice Note',
            senderId: user.id,
            fileUrl,
            fileType: 'audio',
            fileName: 'Voice Note'
          });
        } else {
          socket.emit('private_message', {
            to: selectedUser.id,
            text: '🎤 Voice Note',
            senderId: user.id,
            fileUrl,
            fileType: 'audio',
            fileName: 'Voice Note'
          });
        }
        
        toast.success("Voice note sent.");
      } catch (err) {
        console.error("Failed to upload/send voice note:", err);
        toast.error("Failed to deliver voice note.");
      } finally {
        setIsUploading(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
      }
    };

    mediaRecorderRef.current.stop();
  };

  const formatRecordingTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
        setMessages(prev => prev.map(m => Number(m.id) === Number(msgId) ? { ...m, isLocallyDeleted: true } : m));
      }
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInput(prev => prev + emoji);
  };

  const handleDeleteMsg = (msg) => {
    setMessageToDelete(msg);
    setIsDeleteModalOpen(true);
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
          <p className="text-sm font-medium">Select a user to start a conversation.</p>
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
            {selectedUser.isGroup ? (
              selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <Users className="w-5 h-5" />
            ) : (
              selectedUser.avatarUrl ? (
                <img src={selectedUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                selectedUser.email[0].toUpperCase()
              )
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate max-w-[120px] md:max-w-none">{selectedUser.name || selectedUser.username || selectedUser.email}</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
              {selectedUser.isGroup ? (
                'Secure Group Channel'
              ) : onlineUsers.includes(String(selectedUser.id)) ? (
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:text-foreground rounded-full hover:bg-white/10" 
            title="Voice Call"
            onClick={() => initiateCall(selectedUser.id, selectedUser, false)}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:text-foreground rounded-full hover:bg-white/10" 
            title="Video Call"
            onClick={() => initiateCall(selectedUser.id, selectedUser, true)}
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:text-foreground rounded-full hover:bg-white/10" 
            title="Channel Info"
            onClick={() => selectedUser.isGroup ? setShowGroupInfo(true) : setShowUserInfo(true)}
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Group Call Active Join Banner */}
      {selectedUser.isGroup && groupCallActive && (
        <div className="bg-primary/10 border-b border-primary/20 backdrop-blur-md px-6 py-3 flex items-center justify-between text-sm z-20 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
            </div>
            <span className="font-medium text-foreground flex items-center gap-1.5 text-xs md:text-sm">
              Active {groupCallIsVideo ? 'Video' : 'Voice'} Call in progress...
            </span>
          </div>
          <Button 
            size="sm" 
            onClick={() => joinGroupCall(selectedUser.id, selectedUser, groupCallIsVideo)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold px-4 flex items-center gap-1.5 shadow-md shadow-emerald-500/10 hover:scale-105 transition-all text-xs h-8"
          >
            {groupCallIsVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            Join Call
          </Button>
        </div>
      )}

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
                ${(m.isDeleted || m.isLocallyDeleted) ? 'opacity-50 italic' : ''}
              `}>
                {selectedUser.isGroup && m.senderId !== user.id && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                      {m.senderAvatar ? (
                        <img src={m.senderAvatar} alt="Sender" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] font-bold text-primary">{(m.senderName || 'O')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-primary opacity-90">
                      {m.senderName || 'Operative'}
                    </p>
                  </div>
                )}
                {m.replyToId && (
                  <div className={`
                    mb-2 p-2 rounded-lg border-l-4 text-xs bg-black/10 dark:bg-white/5 
                    ${m.senderId === user.id ? 'border-white/30' : 'border-primary/50'}
                  `}>
                    <p className="font-bold opacity-60 mb-1">
                      {m.replyToSenderId === user.id ? 'You' : (m.replyToSenderName || selectedUser.username || selectedUser.email)}
                    </p>
                    <p className="truncate italic">{m.replyToText || 'Original message not found'}</p>
                  </div>
                )}
                {m.isForwarded && (
                  <div className="flex items-center gap-1 opacity-40 text-[10px] mb-1 italic">
                    <Forward className="w-3 h-3" />
                    <span>Forwarded</span>
                  </div>
                )}
                {m.fileUrl && !m.isDeleted && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                    {m.fileType === 'image' ? (
                      <img src={m.fileUrl} alt="shared" className="max-h-60 w-full object-cover cursor-pointer" onClick={() => window.open(m.fileUrl)} />
                    ) : m.fileType === 'audio' ? (
                      <VoicePlayer fileUrl={m.fileUrl} />
                    ) : (
                      <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/20 hover:bg-black/30 transition-colors" title="Download File">
                        <FileIcon className="w-5 h-5" />
                        <span className="text-xs truncate max-w-[150px]">{m.fileName || 'Document'}</span>
                        <Download className="w-4 h-4 ml-auto" />
                      </a>
                    )}
                  </div>
                )}
                {(!m.fileType || m.fileType !== 'audio' || m.isLocallyDeleted) && (
                  <p className="leading-relaxed whitespace-pre-wrap">
                    {m.isLocallyDeleted ? '🚫 This message was deleted for you' : m.text}
                  </p>
                )}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/20 text-foreground" onClick={() => setReplyingTo(m)} title="Reply">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/20 text-foreground" onClick={() => { setForwardingMessage(m); fetchContacts(); setIsForwardModalOpen(true); }} title="Forward">
                      <Forward className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/20 text-foreground" onClick={() => navigator.clipboard.writeText(m.text)} title="Copy">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/20 text-destructive" onClick={() => handleDeleteMsg(m)} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {m.senderId === user.id && (new Date() - new Date(m.createdAt) < 10 * 60 * 1000) && (
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
        {/* Reply Preview */}
        {replyingTo && (
          <div className="absolute bottom-full left-4 right-4 p-3 bg-background/90 backdrop-blur-md border border-border/40 rounded-t-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <div className="w-1 bg-primary h-8 rounded-full" />
            <div className="flex-1 min-w-0 text-xs">
              <p className="font-bold text-primary mb-0.5">Replying to {replyingTo.senderId === user.id ? 'yourself' : (selectedUser.username || selectedUser.email)}</p>
              <p className="text-muted-foreground truncate">{replyingTo.text}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setReplyingTo(null)}><X className="w-4 h-4" /></Button>
          </div>
        )}
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

        {isRecording ? (
          <div className="flex items-center gap-3 w-full bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-1.5 h-11">
            <div className="flex items-center gap-2 flex-1">
              <span className="w-2 h-2 rounded-full bg-destructive animate-ping"></span>
              <span className="text-xs font-bold text-destructive uppercase tracking-wider">Recording Voice Note</span>
              <span className="text-sm font-mono font-bold text-foreground ml-auto">{formatRecordingTime(recordingTime)}</span>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={cancelRecording} title="Discard">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" className="h-8 w-8 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20" onClick={sendVoiceNote} title="Send Voice Note">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
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
                placeholder={editingMessage ? "Edit message..." : "Type a message..."} 
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

            {(!input.trim() && !pendingFile && !editingMessage) ? (
              <Button type="button" size="icon" className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20 bg-secondary/80 hover:bg-primary/10 hover:text-primary text-foreground" onClick={startRecording} title="Record Voice Note">
                <Mic className="w-5 h-5" />
              </Button>
            ) : (
              <Button type="submit" size="icon" className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20" disabled={isUploading || (!input.trim() && !pendingFile)} title="Send Message">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            )}
          </form>
        )}
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

      <GroupInfoModal
        isOpen={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        group={selectedUser}
        onUpdate={(updatedGroup) => {
          // This should update the group in the sidebar too, but for now we update local state
          // In a real app we'd use a global state or refetch.
          window.location.reload(); 
        }}
      />

      {/* Delete Modal */}
      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Message"
        description="Choose how you want to remove this mission log."
        footer={
          <>
            {messageToDelete?.senderId === user.id && (
              <Button 
                variant="destructive" 
                onClick={() => { executeDelete(messageToDelete.id, 'everyone'); setIsDeleteModalOpen(false); }}
              >
                Delete for Everyone
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => { executeDelete(messageToDelete.id, 'me'); setIsDeleteModalOpen(false); }}
            >
              Delete for Me
            </Button>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
          </>
        }
      />

      {/* Forward Modal */}
      <Dialog
        isOpen={isForwardModalOpen}
        onClose={() => setIsForwardModalOpen(false)}
        title="Forward Message"
        description="Select a contact to transmit this log."
      >
        <div className="space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
          {contacts.filter(c => c.isGroup || Number(c.id) !== Number(user?.id)).map(contact => (
            <button
              key={contact.isGroup ? `forward_group_${contact.id}` : `forward_user_${contact.id}`}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
              onClick={() => handleForwardMessage(contact)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary overflow-hidden shrink-0">
                {contact.isGroup ? (
                  contact.avatar_url ? (
                    <img src={contact.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )
                ) : (
                  contact.avatarUrl ? (
                    <img src={contact.avatarUrl} className="w-full h-full object-cover" />
                  ) : (
                    (contact.username || contact.email || 'U')[0].toUpperCase()
                  )
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{contact.isGroup ? contact.name : (contact.username || contact.email)}</p>
                <p className="text-xs text-muted-foreground">{contact.isGroup ? "Group Uplink" : "Active Operative"}</p>
              </div>
            </button>
          ))}
          {contacts.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No contacts found to forward to.</p>}
        </div>
      </Dialog>
    </div>
  );
}
