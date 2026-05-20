import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callStatus, setCallStatus] = useState('idle'); // idle, ringing, calling, active
  const [callerInfo, setCallerInfo] = useState(null); // { id, username, email, avatarUrl, isVideo, isGroup, groupName }
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);

  // Group Call States
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [groupCallId, setGroupCallId] = useState(null);
  const [groupRemoteStreams, setGroupRemoteStreams] = useState({}); // { [socketId]: MediaStream }
  const [groupParticipants, setGroupParticipants] = useState([]); // Array of other participant info
  
  const groupPeerConnections = useRef({}); // { [socketId]: RTCPeerConnection }
  const activeGroupIdRef = useRef(null);
  const localStreamRef = useRef(null);

  // Sync ref with state so local stream is always readable inside async WebRTC callback functions
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Audio elements for ringing sounds
  const [incomingRing] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'));
  const [outgoingRing] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'));

  useEffect(() => {
    incomingRing.loop = true;
    incomingRing.volume = 0.3;
    outgoingRing.loop = true;
    outgoingRing.volume = 0.3;

    if (callStatus === 'ringing') {
      incomingRing.play().catch(e => console.log('Audio playback blocked'));
    } else {
      incomingRing.pause();
      incomingRing.currentTime = 0;
    }

    if (callStatus === 'calling') {
      outgoingRing.play().catch(e => console.log('Audio playback blocked'));
    } else {
      outgoingRing.pause();
      outgoingRing.currentTime = 0;
    }

    return () => {
      incomingRing.pause();
      outgoingRing.pause();
    };
  }, [callStatus, incomingRing, outgoingRing]);

  // STUN Servers for WebRTC
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const createGroupPeerConnection = (targetSocketId, targetUserId, isInitiator) => {
    const pc = new RTCPeerConnection(rtcConfig);
    groupPeerConnections.current[targetSocketId] = pc;

    // Add local tracks to this new connection
    const currentLocalStream = localStreamRef.current;
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocalStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('group_call_signal', {
          groupId: activeGroupIdRef.current,
          toSocketId: targetSocketId,
          fromUserId: user.id,
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      setGroupRemoteStreams(prev => ({
        ...prev,
        [targetSocketId]: event.streams[0]
      }));
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('group_call_signal', {
            groupId: activeGroupIdRef.current,
            toSocketId: targetSocketId,
            fromUserId: user.id,
            signal: { sdp: pc.localDescription }
          });
        } catch (err) {
          console.error("Error creating negotiation offer:", err);
        }
      };
    }

    return pc;
  };

  useEffect(() => {
    if (!socket || !user) return;

    // --- 1-to-1 Call Socket Handlers ---
    const handleCallUser = async (data) => {
      setIsGroupCall(false);
      setCallerInfo(data.callerInfo);
      setIsVideoCall(data.isVideo);
      setCallStatus('ringing');
      
      peerConnection.current = createPeerConnection(data.callerId);
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
    };

    const handleAnswerCall = async (data) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallStatus('active');
      }
    };

    const handleIceCandidate = async (data) => {
      if (peerConnection.current && data.candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    };

    const handleRejectCall = () => {
      resetCallState();
    };

    const handleEndCall = () => {
      resetCallState();
    };

    const handleHandledElsewhere = () => {
      resetCallState();
    };

    // --- Group Call Socket Handlers ---
    const handleGroupCallIncoming = ({ groupId, hostId, hostInfo, isVideo }) => {
      setIsGroupCall(true);
      setGroupCallId(groupId);
      activeGroupIdRef.current = groupId;
      setCallerInfo({
        id: hostId,
        username: hostInfo.username || hostInfo.email,
        email: hostInfo.email,
        avatarUrl: hostInfo.avatarUrl,
        isGroup: true,
        groupName: `Group Call`
      });
      setIsVideoCall(isVideo);
      setCallStatus('ringing');
    };

    const handleGroupCallJoined = async ({ groupId, participants, isVideo }) => {
      setIsVideoCall(isVideo);
      setGroupParticipants(participants);
      setCallStatus('active');

      // Create peer connections for all other participants currently in the call
      for (const peer of participants) {
        createGroupPeerConnection(peer.socketId, peer.userId, true);
      }
    };

    const handleGroupCallUserJoined = ({ groupId, user: peer }) => {
      setGroupParticipants(prev => {
        if (prev.some(p => p.socketId === peer.socketId)) return prev;
        return [...prev, peer];
      });

      // Existing participant creates offer to the newly joined participant
      createGroupPeerConnection(peer.socketId, peer.userId, true);
    };

    const handleGroupWebrtcSignal = async ({ groupId, fromUserId, fromSocketId, signal }) => {
      let pc = groupPeerConnections.current[fromSocketId];
      if (!pc) {
        pc = createGroupPeerConnection(fromSocketId, fromUserId, false);
      }

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('group_call_signal', {
              groupId,
              toSocketId: fromSocketId,
              fromUserId: user.id,
              signal: { sdp: pc.localDescription }
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("Error processing group WebRTC signal:", err);
      }
    };

    const handleGroupCallUserLeft = ({ groupId, userId }) => {
      let leftSocketId = null;
      
      setGroupParticipants(prev => {
        const found = prev.find(p => String(p.userId) === String(userId));
        if (found) {
          leftSocketId = found.socketId;
          if (groupPeerConnections.current[leftSocketId]) {
            groupPeerConnections.current[leftSocketId].close();
            delete groupPeerConnections.current[leftSocketId];
          }
        }
        return prev.filter(p => String(p.userId) !== String(userId));
      });

      if (leftSocketId) {
        setGroupRemoteStreams(prev => {
          const next = { ...prev };
          delete next[leftSocketId];
          return next;
        });
      }
    };

    const handleGroupCallEnded = () => {
      resetCallState();
    };

    socket.on('call_user', handleCallUser);
    socket.on('answer_call', handleAnswerCall);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('reject_call', handleRejectCall);
    socket.on('end_call', handleEndCall);
    socket.on('call_handled_elsewhere', handleHandledElsewhere);

    socket.on('group_call_incoming', handleGroupCallIncoming);
    socket.on('group_call_joined', handleGroupCallJoined);
    socket.on('group_call_user_joined', handleGroupCallUserJoined);
    socket.on('group_webrtc_signal', handleGroupWebrtcSignal);
    socket.on('group_call_user_left', handleGroupCallUserLeft);
    socket.on('group_call_ended', handleGroupCallEnded);

    return () => {
      socket.off('call_user');
      socket.off('answer_call');
      socket.off('ice_candidate');
      socket.off('reject_call');
      socket.off('end_call');
      socket.off('call_handled_elsewhere');

      socket.off('group_call_incoming');
      socket.off('group_call_joined');
      socket.off('group_call_user_joined');
      socket.off('group_webrtc_signal');
      socket.off('group_call_user_left');
      socket.off('group_call_ended');
    };
  }, [socket, user]);

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', {
          to: targetUserId,
          candidate: event.candidate,
          callerId: user.id
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  };

  const getMedia = async (video) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      setLocalStream(stream);
      setIsVideoEnabled(video);
      setIsMuted(false);
      return stream;
    } catch (err) {
      console.error("Failed to get local stream", err);
      toast.error("Hardware Access Denied: Failed to access camera or microphone. Check permissions.");
      return null;
    }
  };

  const initiateCall = async (targetId, targetInfo, isVideo) => {
    if (targetInfo?.isGroup) {
      // Group call flow
      const stream = await getMedia(isVideo);
      if (!stream) return;

      setIsGroupCall(true);
      setIsVideoCall(isVideo);
      setGroupCallId(targetId);
      activeGroupIdRef.current = targetId;
      setCallerInfo({
        id: targetId,
        username: targetInfo.name || 'Group Call',
        email: '',
        avatarUrl: targetInfo.avatar_url || targetInfo.avatarUrl,
        isGroup: true,
        groupName: targetInfo.name || 'Group Call'
      });
      setCallStatus('calling');

      socket.emit('group_call_initiate', {
        groupId: targetId,
        callerInfo: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl
        },
        isVideo
      });
      return;
    }

    // 1-to-1 call flow
    const stream = await getMedia(isVideo);
    if (!stream) return;

    setIsGroupCall(false);
    setIsVideoCall(isVideo);
    setCallerInfo(targetInfo);
    setCallStatus('calling');

    peerConnection.current = createPeerConnection(targetId);

    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit('call_user', {
      userToCall: targetId,
      callerId: user.id,
      callerInfo: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      offer: offer,
      isVideo: isVideo
    });
  };

  const acceptCall = async () => {
    if (isGroupCall) {
      const stream = await getMedia(isVideoCall);
      if (!stream) {
        rejectCall();
        return;
      }

      socket.emit('group_call_join', {
        groupId: groupCallId,
        userInfo: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl
        }
      });
      setCallStatus('active');
      return;
    }

    const stream = await getMedia(isVideoCall);
    if (!stream) {
      rejectCall();
      return;
    }

    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit('answer_call', {
      to: callerInfo.id,
      callerId: user.id,
      answer: answer
    });

    setCallStatus('active');
  };

  const rejectCall = () => {
    if (isGroupCall) {
      resetCallState();
      return;
    }

    if (callerInfo && socket) {
      socket.emit('reject_call', {
        to: callerInfo.id,
        callerId: user.id
      });
    }
    resetCallState();
  };

  const endCall = () => {
    if (isGroupCall) {
      if (socket) {
        socket.emit('group_call_leave', {
          groupId: groupCallId,
          userId: user.id
        });
      }
      resetCallState();
      return;
    }

    if (callerInfo && socket) {
      socket.emit('end_call', {
        to: callerInfo.id,
        callerId: user.id
      });
    }
    resetCallState();
  };

  const joinGroupCall = async (groupId, targetInfo, isVideo) => {
    setIsGroupCall(true);
    setIsVideoCall(isVideo);
    setGroupCallId(groupId);
    activeGroupIdRef.current = groupId;
    setCallerInfo({
      id: groupId,
      username: targetInfo.name || targetInfo.username || targetInfo.email || 'Group Call',
      email: '',
      avatarUrl: targetInfo.avatar_url || targetInfo.avatarUrl,
      isGroup: true,
      groupName: targetInfo.name || 'Group Call'
    });
    
    const stream = await getMedia(isVideo);
    if (!stream) {
      resetCallState();
      return;
    }

    socket.emit('group_call_join', {
      groupId: groupId,
      userInfo: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });
    setCallStatus('active');
  };

  const toggleMute = () => {
    const currentLocalStream = localStreamRef.current;
    if (currentLocalStream) {
      const audioTrack = currentLocalStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    const currentLocalStream = localStreamRef.current;
    if (currentLocalStream) {
      const videoTrack = currentLocalStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const resetCallState = () => {
    const currentLocalStream = localStreamRef.current;
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    for (const pc of Object.values(groupPeerConnections.current)) {
      pc.close();
    }
    groupPeerConnections.current = {};

    setLocalStream(null);
    setRemoteStream(null);
    setGroupRemoteStreams({});
    setGroupParticipants([]);
    setCallStatus('idle');
    setCallerInfo(null);
    setIsVideoCall(false);
    setIsGroupCall(false);
    setGroupCallId(null);
    activeGroupIdRef.current = null;
  };

  return (
    <CallContext.Provider value={{
      callStatus,
      callerInfo,
      isVideoCall,
      isMuted,
      isVideoEnabled,
      localVideoRef,
      remoteVideoRef,
      localStream,
      remoteStream,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      
      // Group Call Exports
      isGroupCall,
      groupCallId,
      groupRemoteStreams,
      groupParticipants,
      joinGroupCall
    }}>
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
