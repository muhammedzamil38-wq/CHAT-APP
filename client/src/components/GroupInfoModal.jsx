import React, { useState, useEffect } from 'react';
import { X, UserMinus, Shield, ShieldAlert, LogOut, Settings, Camera, Save } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function GroupInfoModal({ isOpen, onClose, group, onUpdate }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(group?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(group?.avatar_url || '');
  const [permissions, setPermissions] = useState(group?.permissions || { allow_member_edit: true });

  const isAdmin = members.find(m => m.id === user.id)?.role === 'admin';
  const canEdit = isAdmin || permissions.allow_member_edit;

  useEffect(() => {
    if (isOpen && group) {
      fetchMembers();
      setName(group.name);
      setAvatarUrl(group.avatar_url || '');
      setPermissions(group.permissions || { allow_member_edit: true });
    }
  }, [isOpen, group]);

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/api/groups/${group.id}`);
      setMembers(res.data.members || []);
    } catch (error) {
      toast.error("Failed to fetch member manifest.");
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await api.put(`/api/groups/${group.id}`, {
        name,
        avatarUrl,
        permissions
      });
      toast.success("Group intelligence updated.");
      onUpdate(res.data.group);
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update group parameters.");
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await api.delete(`/api/groups/${group.id}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success("Operative removed from group.");
    } catch (error) {
      toast.error("Failed to remove operative.");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Abort mission and leave this group?")) return;
    try {
      await api.delete(`/api/groups/${group.id}/members/${user.id}`);
      toast.success("You have left the group.");
      onClose();
      window.location.reload(); // Simple way to refresh UI
    } catch (error) {
      toast.error("Failed to leave group.");
    }
  };

  if (!group) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Group Intelligence"
      description="Manifest of active operatives and channel parameters."
    >
      <div className="space-y-6 py-4">
        {/* Header / Edit Section */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Settings className="w-10 h-10 text-primary/40" />
              )}
            </div>
            {canEdit && (
              <button 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
                onClick={() => setIsEditing(true)}
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="w-full space-y-3">
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Group Name"
                className="text-center font-bold h-10"
              />
              <Input 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)} 
                placeholder="Avatar URL"
                className="text-xs"
              />
              {isAdmin && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    id="allow_edit"
                    checked={permissions.allow_member_edit}
                    onChange={(e) => setPermissions(p => ({ ...p, allow_member_edit: e.target.checked }))}
                    className="w-4 h-4 rounded border-primary bg-background"
                  />
                  <label htmlFor="allow_edit" className="text-xs text-muted-foreground">Allow members to edit name/avatar</label>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={handleUpdate}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold">{group.name}</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">{members.length} Operatives Active</p>
            </div>
          )}
        </div>

        {/* Member List */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2">Member Manifest</h4>
          <div className="max-h-[250px] overflow-y-auto pr-2 no-scrollbar space-y-2">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between group/member">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs overflow-hidden">
                    {member.avatarUrl ? <img src={member.avatarUrl} className="w-full h-full object-cover" /> : member.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      {member.username || member.email}
                      {member.role === 'admin' && <Shield className="w-3 h-3 text-amber-500" title="Group Commander" />}
                      {member.id === user.id && <span className="text-[10px] text-primary">(You)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground italic">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {isAdmin && member.id !== user.id && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 group-hover/member:opacity-100 transition-opacity"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 flex flex-col gap-2">
          <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={handleLeaveGroup}>
            <LogOut className="w-4 h-4 mr-2" />
            Abort Mission (Leave Group)
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
