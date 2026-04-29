import React, { useState, useEffect } from 'react';
import { Shield, Users, Ban, CheckCircle, Search, X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function AdminDashboard({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/users');
      setUsers(res.data.users);
    } catch (error) {
      toast.error('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (user) => {
    const action = user.isBanned ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} ${user.username || user.email}?`)) return;

    try {
      setIsProcessing(true);
      await api.post(`/api/admin/${action}`, { userId: user.id, reason: 'Violation of mission protocols' });
      toast.success(`User ${user.username || user.email} ${action}ned successfully.`);
      fetchUsers();
    } catch (error) {
      toast.error(`Failed to ${action} user.`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-card border border-primary/20 w-full max-w-4xl h-[80vh] rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.15)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border/40 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Security Oversight Deck</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Gossip Administrative Terminal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Search & Stats */}
        <div className="p-6 bg-white/5 border-b border-border/40 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by email or codename..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-primary/10 h-11"
            />
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-primary/10 rounded-xl border border-primary/10 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">{users.length} Enlisted</span>
            </div>
            <div className="px-4 py-2 bg-destructive/10 rounded-xl border border-destructive/10 flex items-center gap-2">
              <Ban className="w-4 h-4 text-destructive" />
              <span className="text-sm font-bold text-destructive">{users.filter(u => u.isBanned).length} Restricted</span>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse font-bold tracking-widest">SYNCHRONIZING USER DATABASE...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredUsers.map((u) => (
                <div 
                  key={u.id} 
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between group
                    ${u.isBanned ? 'bg-destructive/5 border-destructive/20 opacity-80' : 'bg-white/5 border-white/5 hover:border-primary/20'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary border border-primary/10 overflow-hidden shrink-0">
                      {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate">{u.username || 'Unassigned Codename'}</p>
                        {u.isAdmin && <ShieldCheck className="w-4 h-4 text-emerald-500" title="Administrator" />}
                        {u.isBanned && <span className="px-2 py-0.5 rounded-full bg-destructive text-[10px] font-bold text-white uppercase tracking-tighter">Banned</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={u.isBanned ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleBanToggle(u)}
                      disabled={isProcessing || u.isAdmin}
                      className={`rounded-xl h-10 px-4 font-bold uppercase text-[10px] tracking-widest transition-all
                        ${u.isBanned 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                          : 'text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20'}
                      `}
                    >
                      {u.isBanned ? (
                        <><CheckCircle className="w-3.5 h-3.5 mr-2" /> Revoke Ban</>
                      ) : (
                        <><Ban className="w-3.5 h-3.5 mr-2" /> Execute Ban</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-border/40 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground flex items-center gap-2 uppercase tracking-widest font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Authorized Admin Use Only
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">GOSSIP-SEC-CORE-v2.0</p>
        </div>
      </div>
    </div>
  );
}
