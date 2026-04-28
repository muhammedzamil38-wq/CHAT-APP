import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatArea } from '../components/ChatArea';
import { SettingsModal } from '../components/SettingsModal';

export function Dashboard() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen w-screen bg-background overflow-hidden text-foreground flex relative">
      {/* Sidebar View */}
      <div className={`
        ${isMobile ? 'absolute inset-0 z-20 transition-transform duration-300' : 'w-80 shrink-0 border-r border-border/40'}
        ${isMobile && selectedUser ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <Sidebar 
          onSelectUser={setSelectedUser} 
          selectedUser={selectedUser} 
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Chat Area View */}
      <div className={`
        flex-1 h-full
        ${isMobile ? 'absolute inset-0 z-10 transition-transform duration-300' : ''}
        ${isMobile && !selectedUser ? 'translate-x-full' : 'translate-x-0'}
      `}>
        {selectedUser ? (
          <ChatArea 
            selectedUser={selectedUser} 
            onBack={() => setSelectedUser(null)} 
            isMobile={isMobile}
          />
        ) : (
          <div className="hidden md:flex h-full items-center justify-center bg-card/10 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20 animate-pulse">
                <span className="text-4xl">🛸</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Gossip Uplink</h3>
                <p className="text-muted-foreground text-sm">Select a crew member to start the mission.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
