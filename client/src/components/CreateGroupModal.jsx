import React, { useState, useEffect } from 'react';
import { X, Search, Users, Check, Camera, Loader2 } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/api/users');
      setContacts(res.data.users || []);
    } catch (error) {
      console.error('Failed to fetch contacts', error);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
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
      toast.success('Portrait processed.');
    } catch (error) {
      toast.error('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return toast.error("Group name is required.");
    if (selectedMembers.length === 0) return toast.error("Select at least one operative.");

    setLoading(true);
    try {
      const res = await api.post('/api/groups', {
        name: groupName,
        memberIds: selectedMembers,
        avatar_url: avatarUrl
      });
      toast.success("Group established successfully.");
      onCreated(res.data.group);
      onClose();
      // Reset state
      setGroupName('');
      setSelectedMembers([]);
      setAvatarUrl('');
    } catch (error) {
      toast.error("Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    (c.username || c.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Establish Group Uplink"
      description="Create a secure channel for multiple operatives."
    >
      <div className="space-y-4 py-2">
        {/* Avatar Upload */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-8 h-8 text-primary/40" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
              <Camera className="w-6 h-6 text-white" />
              <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Group Name</label>
          <Input 
            placeholder="e.g. Tactical Ops" 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-background/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Select Operatives</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search contacts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 h-9"
            />
          </div>
          
          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2 no-scrollbar">
            {filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => toggleMember(contact.id)}
                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                  selectedMembers.includes(contact.id) ? 'bg-primary/20 border-primary/30' : 'hover:bg-white/5 border-transparent'
                } border`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                  {contact.avatarUrl ? <img src={contact.avatarUrl} className="w-full h-full object-cover rounded-full" /> : contact.email[0].toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{contact.username || contact.email}</p>
                </div>
                {selectedMembers.includes(contact.id) && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <Button 
          className="w-full h-11" 
          disabled={loading || !groupName.trim() || selectedMembers.length === 0}
          onClick={handleCreate}
        >
          {loading ? "Establishing..." : "Create Group"}
        </Button>
      </div>
    </Dialog>
  );
}
