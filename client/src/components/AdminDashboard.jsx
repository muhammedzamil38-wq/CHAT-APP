import React, { useState, useEffect } from 'react';
import { Shield, User, Ban, Unlock, Trash2, Search, Loader2, Mail, Calendar, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data.users);
    } catch (error) {
      toast.error('Failed to synchronize crew list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBan = async (userId, reason) => {
    try {
      setActionLoading(userId);
      await api.post('/api/admin/ban', { userId, reason });
      toast.success('Crew member restricted successfully.');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to issue restriction command.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (userId) => {
    try {
      setActionLoading(userId);
      await api.post('/api/admin/unban', { userId });
      toast.success('Uplink restored successfully.');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to restore uplink.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border/40 bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="font-bold text-xl tracking-tight">Command Control Center</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by email or codename..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-border/50"
            />
          </div>
          <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
            {filteredUsers.length} Active Personnel
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar relative z-10">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground italic">
            <Loader2 className="w-5 h-5 animate-spin" /> Synchronizing logs...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div 
                key={user.id} 
                className={`group p-4 rounded-2xl border transition-all duration-300 ${user.isBanned ? 'bg-destructive/5 border-destructive/20 opacity-80' : 'bg-card/40 border-border/40 hover:border-primary/40 hover:bg-white/5'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg ${user.isBanned ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                      {(user.username || user.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold truncate max-w-[150px]">{user.username || 'Unidentified'}</h3>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</p>
                    </div>
                  </div>
                  {user.isAdmin && (
                    <div className="px-2 py-0.5 bg-primary/20 text-[8px] font-black uppercase tracking-tighter text-primary rounded border border-primary/30">Admin</div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    <Calendar className="w-3 h-3" /> Enlisted: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                  {user.isBanned && (
                    <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg text-[10px] text-destructive leading-tight border border-destructive/10 italic">
                      <Info className="w-3 h-3 shrink-0" /> Reason: {user.banReason}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {user.isBanned ? (
                    <Button 
                      onClick={() => handleUnban(user.id)}
                      disabled={actionLoading === user.id}
                      className="flex-1 h-9 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-emerald-500/20"
                      variant="outline"
                    >
                      {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Unlock className="w-4 h-4 mr-2" /> Restore Uplink</>}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleBan(user.id, "Violation of network security policies")}
                      disabled={actionLoading === user.id || user.isAdmin}
                      className="flex-1 h-9 text-destructive bg-destructive/10 hover:bg-destructive/20 border-destructive/20"
                      variant="outline"
                    >
                      {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4 mr-2" /> Terminate Access</>}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
