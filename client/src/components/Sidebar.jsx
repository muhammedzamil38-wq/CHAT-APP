import React, { useState, useEffect } from 'react';
import { Search, Settings, MoreVertical, UserPlus, Check, ShieldAlert } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { AdminModal } from './AdminModal';
import { CreateGroupModal } from './CreateGroupModal';
import { Users, Plus } from 'lucide-react';

export function Sidebar({ onSelectUser, selectedUser, onOpenSettings }) {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { socket, onlineUsers, triggerNotification } = useSocket();
  const { user } = useAuth();

  const fetchFriends = async () => {
    try {
      const res = await api.get('/api/users');
      const users = res.data?.users || [];
      setContacts(users.map(u => ({
        ...u,
        avatar: (u.username || u.email)[0].toUpperCase(),
        lastMessage: u.lastMessage || 'Start a conversation',
        time: u.lastMessageAt ? new Date(u.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0
      })));
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/api/groups');
      setGroups(res.data?.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchGroups()]);
      setLoading(false);
    };
    init();
  }, []);

  // Listen for incoming messages to update unread counts
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Don't trigger notification if the message is from ourself
      if (Number(message.senderId) === Number(user?.id)) return;

      const isGroupMsg = message.groupId !== null && message.groupId !== undefined;

      if (isGroupMsg) {
        // If we are currently in this group chat, do not trigger notification or unread
        const isCurrentGroup = selectedUser && selectedUser.isGroup && Number(selectedUser.id) === Number(message.groupId);
        if (isCurrentGroup) return;

        // Find the group name for notification
        const group = groups.find(g => Number(g.id) === Number(message.groupId));
        const groupName = group ? group.name : 'Group Uplink';
        
        triggerNotification(groupName, `${message.senderName || 'Operative'}: ${message.text || 'Shared a file'}`);

        setGroups(prev => prev.map(g => {
          if (Number(g.id) === Number(message.groupId)) {
            return { 
              ...g, 
              unread: (g.unread || 0) + 1, 
              lastMessage: message.text,
              time: new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
          }
          return g;
        }));
      } else {
        // If we are currently in this private chat, do not trigger notification or unread
        const isCurrentPrivate = selectedUser && !selectedUser.isGroup && Number(selectedUser.id) === Number(message.senderId);
        if (isCurrentPrivate) return;

        // Find the contact name for the notification
        const sender = contacts.find(c => Number(c.id) === Number(message.senderId));
        const senderName = sender ? (sender.username || sender.email) : 'New Message';
        
        triggerNotification(senderName, message.text || 'Shared a file');

        setContacts(prev => prev.map(contact => {
          if (Number(contact.id) === Number(message.senderId)) {
            return { ...contact, unread: (contact.unread || 0) + 1, lastMessage: message.text };
          }
          return contact;
        }));
      }
    };

    const handleProfileUpdate = (updatedUser) => {
      setContacts(prev => prev.map(c => {
        if (Number(c.id) === Number(updatedUser.userId)) {
          return { 
            ...c, 
            username: updatedUser.username, 
            avatarUrl: updatedUser.avatarUrl, 
            bio: updatedUser.bio,
            avatar: updatedUser.avatarUrl ? undefined : (updatedUser.username || c.email || 'O')[0].toUpperCase()
          };
        }
        return c;
      }));
    };

    const handleGroupUpdate = (updatedGroup) => {
      setGroups(prev => prev.map(g => {
        if (Number(g.id) === Number(updatedGroup.groupId)) {
          return { 
            ...g, 
            name: updatedGroup.name, 
            avatar_url: updatedGroup.avatar_url, 
            permissions: updatedGroup.permissions 
          };
        }
        return g;
      }));
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('user_profile_updated', handleProfileUpdate);
    socket.on('group_updated', handleGroupUpdate);
    
    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('user_profile_updated', handleProfileUpdate);
      socket.off('group_updated', handleGroupUpdate);
    };
  }, [socket, selectedUser, contacts]);

  // Reset unread count when a user or group is selected
  useEffect(() => {
    if (selectedUser) {
      if (selectedUser.isGroup) {
        setGroups(prev => prev.map(g => {
          if (Number(g.id) === Number(selectedUser.id)) {
            return { ...g, unread: 0 };
          }
          return g;
        }));
      } else {
        setContacts(prev => prev.map(contact => {
          if (Number(contact.id) === Number(selectedUser.id)) {
            return { ...contact, unread: 0 };
          }
          return contact;
        }));
      }
    }
  }, [selectedUser]);

  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get(`/api/users/search?q=${searchQuery}`);
        setSearchResults(res.data.users);
      } catch (error) {
        console.error('Search failed', error);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFriend = async (friendId) => {
    try {
      await api.post('/api/users/add', { friendId });
      toast.success('User added to contacts');
      setSearchQuery('');
      setSearchResults([]);
      fetchFriends();
    } catch (error) {
      toast.error('Failed to add crew member');
    }
  };

  return (
    <div className="w-80 border-r border-border/40 bg-card/30 backdrop-blur-xl flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border/40 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onOpenSettings}>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="My Avatar" className="w-full h-full object-cover" />
              ) : (
                (user?.username || user?.email || 'U')[0].toUpperCase()
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{user?.username || 'Operative'}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Online</p>
          </div>
        </div>
        <div className="flex gap-1">
          {user?.role === 'admin' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              onClick={() => setShowAdminModal(true)}
              title="Mission Control Directory"
            >
              <ShieldAlert className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onOpenSettings}
            title="Mission Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search email or username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 h-9" 
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-3 right-3 mt-1 bg-card border border-border/40 rounded-lg shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
            {searchResults.map((user) => {
              const isAlreadyFriend = contacts.some(c => c.id === user.id);
              return (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-border/10 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (user.username || user.email)[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.username || user.email}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => !isAlreadyFriend && handleAddFriend(user.id)}
                    disabled={isAlreadyFriend}
                    title={isAlreadyFriend ? "Already in Contacts" : "Add Crew Member"}
                  >
                    {isAlreadyFriend ? <Check className="h-4 w-4 text-emerald-500" /> : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        <div className="px-4 py-2 flex items-center justify-between group">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Group Uplinks</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={() => setShowCreateGroup(true)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        {groups.map((group) => (
          <div 
            key={`group_${group.id}`} 
            onClick={() => onSelectUser({ ...group, isGroup: true })}
            className={`flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-border/10 ${selectedUser?.id === group.id && selectedUser?.isGroup ? 'bg-white/5' : ''}`}
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary overflow-hidden">
                {group.avatar_url ? (
                  <img src={group.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-6 h-6" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{group.name}</p>
                {group.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in duration-300">
                    {group.unread}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground truncate flex-1 pr-2">
                  {group.lastMessage || 'Channel established.'}
                </p>
                {group.time && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{group.time}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="px-4 py-2 mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Individual Operatives</div>
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm italic">Initializing telemetry...</div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <p className="mb-2">Your roster is empty.</p>
            <p className="text-xs opacity-60 italic text-primary">Search for other crew members above to start a mission.</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div 
              key={contact.id} 
              onClick={() => onSelectUser(contact)}
              className={`flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-border/10 ${selectedUser?.id === contact.id && !selectedUser?.isGroup ? 'bg-white/5' : ''}`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary overflow-hidden">
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    contact.avatar
                  )}
                </div>
                {onlineUsers.includes(String(contact.id)) && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse z-20"></span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {contact.username || contact.email}
                  </p>
                  {contact.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in duration-300">
                      {contact.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {contact.lastMessage}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdminModal && (
        <AdminModal onClose={() => setShowAdminModal(false)} />
      )}

      <CreateGroupModal 
        isOpen={showCreateGroup} 
        onClose={() => setShowCreateGroup(false)} 
        onCreated={(newGroup) => {
          setGroups(prev => [newGroup, ...prev]);
          onSelectUser({ ...newGroup, isGroup: true });
        }}
      />
    </div>
  );
}
