import React, { useState, useEffect } from 'react';
import { Search, Settings, MoreVertical, UserPlus, Check } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function Sidebar({ onSelectUser, selectedUser, onOpenSettings }) {
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    try {
      const res = await api.get('/api/users');
      setContacts(res.data.users.map(u => ({
        ...u,
        avatar: (u.username || u.email)[0].toUpperCase(),
        lastMessage: 'Secure link active',
        time: '',
        unread: 0
      })));
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

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
      toast.success('Crew member added');
      setSearchQuery('');
      setSearchResults([]);
      fetchFriends();
    } catch (error) {
      toast.error('Failed to add crew member');
    }
  };

  return (
    <div className="w-80 border-r border-border/40 bg-card/30 backdrop-blur-xl flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Gossip</h2>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onOpenSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <MoreVertical className="h-4 w-4" />
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
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(user.username || user.email)[0].toUpperCase()}
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
                  >
                    {isAlreadyFriend ? <Check className="h-4 w-4 text-emerald-500" /> : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Contacts</div>
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
              className={`flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-border/10 ${selectedUser?.id === contact.id ? 'bg-white/5' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary shrink-0 relative">
                {contact.avatar}
                {contact.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-white font-bold border-2 border-background">
                    {contact.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-medium text-sm truncate">{contact.username || contact.email}</h3>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{contact.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
