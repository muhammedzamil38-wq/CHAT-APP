import React from 'react';
import { X, LogOut, Trash2, User, Shield, Bell, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function SettingsModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  const handleDeleteAccount = async () => {
    if (window.confirm('WARNING: This will permanently delete your account and all mission data. Proceed?')) {
      try {
        await api.delete('/api/auth/delete-account');
        toast.success('Account purged successfully');
        logout();
      } catch (error) {
        toast.error('Failed to delete account');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border/50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-white/5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Mission Settings
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Section */}
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {(user?.username || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg truncate">{user?.username || 'Astronaut'}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Settings List */}
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" /> Notifications
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground">
              <Moon className="w-5 h-5" /> Appearance
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground">
              <User className="w-5 h-5" /> Privacy
            </Button>
          </div>

          <div className="pt-4 border-t border-border/40 space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 border-border/50 hover:bg-white/5"
              onClick={() => {
                logout();
                onClose();
              }}
            >
              <LogOut className="w-5 h-5 text-amber-500" />
              Terminate Session (Logout)
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="w-5 h-5" />
              Purge Account (Delete)
            </Button>
          </div>
        </div>

        <div className="p-4 bg-white/5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Gossip Mission Control v1.0.4</p>
        </div>
      </div>
    </div>
  );
}
