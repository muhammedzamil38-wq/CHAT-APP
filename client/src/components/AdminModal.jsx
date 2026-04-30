import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Mail, Clock, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '../lib/api';

export function AdminModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const res = await api.get('/api/users/admin/all');
        setUsers(res.data.users);
      } catch (error) {
        console.error('Failed to fetch admin directory', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllUsers();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl border border-primary/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Mission Control Directory
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-wider">Top Secret</span>
              </h2>
              <p className="text-xs text-muted-foreground">Classified overview of all registered operatives.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
              <p className="text-sm font-medium tracking-widest uppercase">Decrypting Global Roster...</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/40 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Operative</th>
                    <th className="px-4 py-3 font-medium">Contact Signal</th>
                    <th className="px-4 py-3 font-medium">Clearance</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-card/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <UserAvatarFallback name={user.username || user.email} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.username || 'Unknown Agent'}</p>
                            {user.bio && <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{user.bio}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground break-all">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 opacity-50 shrink-0" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                            <Users className="w-3 h-3" /> User
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-[10px] font-bold uppercase tracking-wider ${
                              user.isBanned 
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20'
                            }`}
                            onClick={async () => {
                              try {
                                await api.post(`/api/users/admin/ban/${user.id}`, { isBanned: !user.isBanned });
                                setUsers(users.map(u => u.id === user.id ? { ...u, isBanned: !user.isBanned } : u));
                              } catch (error) {
                                console.error('Failed to update ban status', error);
                              }
                            }}
                          >
                            {user.isBanned ? 'Unban Operative' : 'Ban Operative'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground italic">
                        No external operatives found in the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserAvatarFallback({ name }) {
  return (
    <span className="text-xs font-bold text-primary">
      {name[0].toUpperCase()}
    </span>
  );
}
