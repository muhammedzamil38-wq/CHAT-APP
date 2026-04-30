import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();
  const [notificationSound] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    if (user) {
      // Request Notification Permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }

      const apiBase = import.meta.env.VITE_API_URL;
      const socketUrl = apiBase || 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
          ? `http://${window.location.hostname}:5000` 
          : window.location.origin);

      const newSocket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('[SOCKET] Connection established');
        newSocket.emit('identify', String(user.id));
      });

      newSocket.on('getOnlineUsers', (users) => {
        setOnlineUsers(users);
      });

      newSocket.on('admin_notification', (data) => {
        if (user.role === 'admin') {
          triggerNotification(data.title, data.message);
        }
      });

      newSocket.on('force_logout', (data) => {
        alert(data.message);
        // We need to import or use logout from AuthContext. 
        // We already have 'user' from useAuth, let's grab 'logout' too.
        // Wait, 'logout' is not in the dependency array. It's safer to just reload the page 
        // which will trigger the checkAuth -> fail -> set user to null.
        // Or we can just call api.post('/api/auth/logout') directly here.
        api.post('/api/auth/logout').then(() => {
          window.location.reload();
        }).catch(() => {
          window.location.reload();
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.off('getOnlineUsers');
        newSocket.off('admin_notification');
        newSocket.off('force_logout');
        newSocket.close();
      };
    } else {
      setSocket(null);
      setOnlineUsers([]);
    }
  }, [user]);

  const triggerNotification = (senderName, messageText) => {
    // Play sound
    notificationSound.play().catch(e => console.log('Audio playback blocked by browser policy'));

    // Show Notification
    if (Notification.permission === 'granted') {
      // Try to use Service Worker for more "Native PC" feel if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(senderName, {
            body: messageText,
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: 'gossip-msg', // Prevents flooding
            renotify: true
          });
        });
      } else {
        // Fallback to standard notification
        new Notification(senderName, {
          body: messageText,
          icon: '/logo192.png',
        });
      }
    }
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, triggerNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
