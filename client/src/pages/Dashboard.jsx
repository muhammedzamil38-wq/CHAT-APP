import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatArea } from '../components/ChatArea';
import { SettingsModal } from '../components/SettingsModal';

export function Dashboard() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-background overflow-hidden text-foreground flex">
      <Sidebar 
        onSelectUser={setSelectedUser} 
        selectedUser={selectedUser} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <ChatArea selectedUser={selectedUser} />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
