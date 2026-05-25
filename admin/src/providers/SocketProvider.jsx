import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthProvider';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Connect to Backend Socket.IO Server
    const socketUrl = 'http://localhost:5000';
    console.log(`Connecting to Socket.IO server at: ${socketUrl}`);
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('Socket.IO connection established successfully.');
      setConnected(true);

      // Join the administrative dashboard broadcast channel
      socketInstance.emit('join_admin_room');
      
      // If user specific updates exist, join private user room
      if (user?._id) {
        socketInstance.emit('join_user_room', user._id);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket.IO disconnected.');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setConnected(false);
    };
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be executed within a SocketProvider.');
  }
  return context;
};
