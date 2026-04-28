import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
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
        console.log('[SOCKET] Online users updated:', users);
        setOnlineUsers(users);
      });

      setSocket(newSocket);

      return () => {
        newSocket.off('getOnlineUsers');
        newSocket.close();
      };
    } else {
      setSocket(null);
      setOnlineUsers([]);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
