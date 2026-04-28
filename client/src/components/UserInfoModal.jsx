import React from 'react';
import { X, Mail, Info, Calendar, MessageSquare, Shield } from 'lucide-react';
import { Button } from './ui/button';

export function UserInfoModal({ user, isOpen, onClose }) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-end p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border-l border-border/40 w-full max-w-sm h-full shadow-2xl overflow-hidden animate-in slide-in-from-right duration-500 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-white/5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Contact Intelligence
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-32 h-32 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-5xl font-bold text-primary overflow-hidden shadow-2xl">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (user.username || user.email || 'A')[0].toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{user.username || 'Crew Member'}</h3>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Mail className="w-3 h-3" /> {user.email}
              </p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3 text-primary" /> Mission Brief (Bio)
            </h4>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 min-h-[100px]">
              <p className="text-sm leading-relaxed text-foreground/90 italic">
                {user.bio || "No mission brief provided. This crew member is maintaining radio silence."}
              </p>
            </div>
          </div>

          {/* Stats/Meta */}
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary/60" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Enlisted On</p>
                <p className="text-sm font-medium">October 2023</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-primary/60" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Security Status</p>
                <p className="text-sm font-medium text-emerald-500">Verified Personnel</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/40 bg-white/5">
          <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5 text-primary" onClick={onClose}>
            Close Intelligence File
          </Button>
        </div>
      </div>
    </div>
  );
}
