import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
          ? `http://${window.location.hostname}:5000` 
          : window.location.origin);

      const newSocket = io(socketUrl, {
        withCredentials: true,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('identify', user.id);
      });

      setSocket(newSocket);

      return () => newSocket.close();
    } else {
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
