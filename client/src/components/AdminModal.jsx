import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Users, Mail, Clock, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '../lib/api';

export function AdminModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersRes, reportsRes] = await Promise.all([
          api.get('/api/users/admin/all'),
          api.get('/api/users/admin/reports')
        ]);
        setUsers(usersRes.data.users);
        setReports(reportsRes.data.reports);
      } catch (error) {
        console.error('Failed to fetch admin directory', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/90 backdrop-blur-md sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card w-full h-full sm:w-[98vw] sm:h-[98vh] sm:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-primary/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
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
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border/40 pb-2">
            <button 
              className={`text-sm font-bold uppercase tracking-wider pb-2 px-2 border-b-2 transition-colors ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('users')}
            >
              Global Roster
            </button>
            <button 
              className={`text-sm font-bold uppercase tracking-wider pb-2 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'reports' ? 'border-red-500 text-red-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('reports')}
            >
              Investigation Reports
              {reports.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{reports.length}</span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
              <p className="text-sm font-medium tracking-widest uppercase">Decrypting Database...</p>
            </div>
          ) : activeTab === 'users' ? (
            <div className="rounded-md border border-border/40 overflow-x-auto">
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
                                // Update reports list too if we ban them from the users tab
                                setReports(reports.map(r => r.reportedId === user.id ? { ...r, isBanned: !user.isBanned } : r));
                                alert(`Success: User is now ${!user.isBanned ? 'BANNED' : 'UNBANNED'}`);
                              } catch (error) {
                                console.error('Failed to update ban status', error);
                                alert(`Error: ${error.response?.data?.message || error.message}`);
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
          ) : (
            <div className="rounded-md border border-border/40 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Suspect</th>
                    <th className="px-4 py-3 font-medium">Reporter</th>
                    <th className="px-4 py-3 font-medium">Reason for Report</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-card/50">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{report.reportedUsername || 'Unknown'}</div>
                        <div className="text-[10px] text-muted-foreground break-all">{report.reportedEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{report.reporterUsername || 'Unknown'}</div>
                        <div className="text-[10px] text-muted-foreground break-all">{report.reporterEmail}</div>
                        <div className="text-[10px] text-primary/60">{new Date(report.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs italic">
                          "{report.reason}"
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-[10px] font-bold uppercase tracking-wider ${
                            report.isBanned 
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20'
                          }`}
                          onClick={async () => {
                            try {
                              await api.post(`/api/users/admin/ban/${report.reportedId}`, { isBanned: !report.isBanned });
                              setReports(reports.map(r => r.reportedId === report.reportedId ? { ...r, isBanned: !report.isBanned } : r));
                              setUsers(users.map(u => u.id === report.reportedId ? { ...u, isBanned: !report.isBanned } : u));
                              alert(`Success: User is now ${!report.isBanned ? 'BANNED' : 'UNBANNED'}`);
                            } catch (error) {
                              console.error('Failed to update ban status', error);
                              alert(`Error: ${error.response?.data?.message || error.message}`);
                            }
                          }}
                        >
                          {report.isBanned ? 'Unban Operative' : 'Ban Operative'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground italic">
                        No reports have been filed. The network is secure.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function UserAvatarFallback({ name }) {
  return (
    <span className="text-xs font-bold text-primary">
      {name[0].toUpperCase()}
    </span>
  );
}
