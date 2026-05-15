import React, { useState, useEffect } from 'react';
import { X, UserMinus, Shield, ShieldAlert, LogOut, Settings, Camera, Save, UserPlus, Search, Loader2 } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function GroupInfoModal({ isOpen, onClose, group, onUpdate }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [name, setName] = useState(group?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(group?.avatar_url || '');
  const [permissions, setPermissions] = useState(group?.permissions || { allow_member_edit: true, allow_member_add: false });

  const isAdmin = members.find(m => m.id === user.id)?.role === 'admin';
  const canEdit = isAdmin || permissions.allow_member_edit;

  useEffect(() => {
    if (isOpen && group) {
      fetchMembers();
      fetchFriends();
      setName(group.name);
      setAvatarUrl(group.avatar_url || '');
      setPermissions(group.permissions || { allow_member_edit: true, allow_member_add: false });
    }
  }, [isOpen, group]);

  const fetchFriends = async () => {
    try {
      const res = await api.get('/api/users');
      setFriends(res.data.users || []);
    } catch (error) {
      console.error("Failed to fetch friends", error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/api/groups/${group.id}`);
      setMembers(res.data.members || []);
    } catch (error) {
      toast.error("Failed to fetch member manifest.");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await api.post('/api/files/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatarUrl(uploadRes.data.media.secure_url);
      toast.success('Group portrait processed.');
    } catch (error) {
      toast.error('Portrait upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await api.put(`/api/groups/${group.id}`, {
        name,
        avatar_url: avatarUrl,
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

  const handleAddMember = async (userId) => {
    try {
      await api.post(`/api/groups/${group.id}/members`, { userId });
      fetchMembers();
      setShowAddMember(false);
      toast.success("Operative added to group.");
    } catch (error) {
      toast.error("Failed to add operative.");
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
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Settings className="w-10 h-10 text-primary/40" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
            </div>
            {canEdit && (
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
              </label>
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
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={handleUpdate}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="group/name relative px-8">
              <h3 className="text-xl font-bold">{group.name}</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">{members.length} Operatives Active</p>
              {canEdit && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 absolute right-0 top-0 opacity-0 group-hover/name:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Group Permissions Section */}
        {isAdmin && (
          <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3 h-3 text-primary" />
              Group Permissions
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Allow Member Edits</p>
                  <p className="text-[10px] text-muted-foreground">Members can change name/avatar</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={permissions.allow_member_edit}
                  onChange={(e) => {
                    const newPerms = { ...permissions, allow_member_edit: e.target.checked };
                    setPermissions(newPerms);
                    api.put(`/api/groups/${group.id}`, { permissions: newPerms });
                  }}
                  className="w-4 h-4 rounded border-primary bg-background"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Allow Member Additions</p>
                  <p className="text-[10px] text-muted-foreground">Members can add new operatives</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={permissions.allow_member_add}
                  onChange={(e) => {
                    const newPerms = { ...permissions, allow_member_add: e.target.checked };
                    setPermissions(newPerms);
                    api.put(`/api/groups/${group.id}`, { permissions: newPerms });
                  }}
                  className="w-4 h-4 rounded border-primary bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* Member List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Member Manifest</h4>
            {(isAdmin || permissions.allow_member_add) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                {showAddMember ? 'Cancel' : <><UserPlus className="w-3 h-3 mr-1" /> Add Member</>}
              </Button>
            )}
          </div>

          {showAddMember && (
            <div className="space-y-2 p-2 bg-primary/5 rounded-xl border border-primary/20 animate-in slide-in-from-top-2">
              <p className="text-[10px] font-bold text-primary uppercase px-1">Available Operatives</p>
              <div className="max-h-[150px] overflow-y-auto no-scrollbar space-y-1">
                {friends.filter(f => !members.some(m => m.id === f.id)).map(friend => (
                  <button
                    key={friend.id}
                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                    onClick={() => handleAddMember(friend.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[10px] text-primary">
                        {friend.avatarUrl ? <img src={friend.avatarUrl} className="w-full h-full object-cover rounded-full" /> : friend.email[0].toUpperCase()}
                      </div>
                      <p className="text-xs font-medium">{friend.username || friend.email}</p>
                    </div>
                    <UserPlus className="w-3 h-3 text-primary" />
                  </button>
                ))}
                {friends.filter(f => !members.some(m => m.id === f.id)).length === 0 && (
                  <p className="text-center py-4 text-[10px] text-muted-foreground">All contacts are already deployed here.</p>
                )}
              </div>
            </div>
          )}

          <div className="max-h-[200px] overflow-y-auto pr-2 no-scrollbar space-y-2">
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
