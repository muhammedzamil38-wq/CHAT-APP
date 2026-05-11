import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Users, Mail, Clock, ShieldAlert, BarChart3, Activity, AlertTriangle, Zap, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Button } from './ui/button';
import { api } from '../lib/api';
import { useSocket } from '../contexts/SocketContext';

export function AdminModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const { onlineUsers } = useSocket();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAdminData();
    }, 300); // Simple debounce
    return () => clearTimeout(timer);
  }, [activeTab, page, search]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const res = await api.get('/api/users/admin/analytics');
        setAnalytics(res.data.analytics);
      } else if (activeTab === 'users') {
        const res = await api.get(`/api/users/admin/all?page=${page}&limit=10&search=${search}`);
        setUsers(res.data.users);
        setTotalPages(res.data.pagination.totalPages);
      } else if (activeTab === 'reports') {
        const res = await api.get('/api/users/admin/reports');
        setReports(res.data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = (data) => {
    if (!data) return [];
    return data.map(item => ({
      ...item,
      day: new Date(item.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    }));
  };

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
                Mission Control Command Center
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-wider">Restricted Access</span>
              </h2>
              <p className="text-xs text-muted-foreground">Global network intelligence and asset management.</p>
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
              className={`text-sm font-bold uppercase tracking-wider pb-2 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 className="w-4 h-4" /> Mission Overview
            </button>
            <button 
              className={`text-sm font-bold uppercase tracking-wider pb-2 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => {
                setActiveTab('users');
                setPage(1);
              }}
            >
              <Users className="w-4 h-4" /> Global Roster
            </button>
            <button 
              className={`text-sm font-bold uppercase tracking-wider pb-2 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'reports' ? 'border-red-500 text-red-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('reports')}
            >
              <AlertTriangle className="w-4 h-4" /> Investigation Reports
              {reports.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{reports.length}</span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
              <p className="text-sm font-medium tracking-widest uppercase">Syncing Mission Intelligence...</p>
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Active Operatives</p>
                  <h3 className="text-3xl font-bold text-foreground flex items-baseline gap-2">
                    {onlineUsers.length}
                    <span className="text-[10px] text-emerald-500 animate-pulse font-mono uppercase">Live Signal</span>
                  </h3>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Network Assets</p>
                  <h3 className="text-3xl font-bold text-foreground">{analytics?.stats.totalUsers || 0}</h3>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/40">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Rogue Reports</p>
                  <h3 className="text-3xl font-bold text-foreground">{analytics?.stats.totalReports || 0}</h3>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/40">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Banned Assets</p>
                  <h3 className="text-3xl font-bold text-foreground">{analytics?.stats.bannedUsers || 0}</h3>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-card border border-border/40 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Network Traffic (Messages)
                    </h4>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formatChartData(analytics?.trends.messages)}>
                        <defs>
                          <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                          itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                        />
                        <Area type="monotone" dataKey="count" name="Messages" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorMsg)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border/40 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-500" /> Operative Enlistment (Growth)
                    </h4>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={formatChartData(analytics?.trends.users)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                          itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                        />
                        <Line type="monotone" dataKey="count" name="New Agents" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <>
              {/* Search Bar */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search operatives by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                  className="w-full bg-muted/20 border border-border/40 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="rounded-md border border-border/40 overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm text-left">
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

              {/* Pagination Controls */}
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page === 1} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-border/40 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm text-left">
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
