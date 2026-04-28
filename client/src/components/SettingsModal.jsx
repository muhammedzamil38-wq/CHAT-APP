import React, { useState } from 'react';
import { X, LogOut, Trash2, User, Shield, Moon, Camera, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function SettingsModal({ isOpen, onClose }) {
  const { user, logout, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);

  if (!isOpen) return null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUpdating(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await api.post('/api/files/upload', formData);
      const avatarUrl = uploadRes.data.url;
      
      const res = await api.put('/api/users/profile', { avatarUrl });
      login(res.data.user);
      setAvatarPreview(avatarUrl);
      toast.success('Mission identity portrait updated.');
    } catch (error) {
      toast.error('Portrait upload failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const res = await api.put('/api/users/profile', { username, bio });
      login(res.data.user);
      toast.success('Mission identity updated successfully.');
    } catch (error) {
      toast.error('Identity update failed.');
    } finally {
      setIsUpdating(false);
    }
  };

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
      <div className="bg-card border border-border/50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-white/5 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Mission Settings
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Profile Section */}
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (user?.username || user?.email || 'A')[0].toUpperCase()
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" hidden accept="image/*" onChange={handleAvatarChange} disabled={isUpdating} />
                </label>
                {isUpdating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-full">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="font-bold text-xl">{user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Mission Codename (Username)</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter new codename"
                  className="bg-background/40 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Mission Brief (Bio)</Label>
                <textarea 
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your current status..."
                  className="w-full min-h-[100px] bg-background/40 border border-border/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all no-scrollbar"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Mission Identity
              </Button>
            </form>
          </div>

          {/* Preferences Section */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Preferences</h3>
            <div className="space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
              >
                <Moon className="w-5 h-5" /> Appearance: <span className="font-bold text-primary ml-auto">{theme.toUpperCase()}</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground">
                <User className="w-5 h-5" /> Privacy Settings
              </Button>
            </div>
          </div>

          {/* Destructive Actions */}
          <div className="pt-4 border-t border-border/40 space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 border-border/50 hover:bg-white/5"
              onClick={() => { logout(); onClose(); }}
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
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Gossip Mission Control v1.1.0</p>
        </div>
      </div>
    </div>
  );
}
