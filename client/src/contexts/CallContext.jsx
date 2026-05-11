import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callStatus, setCallStatus] = useState('idle'); // idle, ringing, calling, active
  const [callerInfo, setCallerInfo] = useState(null); // { id, username, email, avatarUrl, isVideo }
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);

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

  useEffect(() => {
    if (!socket || !user) return;

    const handleCallUser = async (data) => {
      // data: { callerId, callerInfo, offer, isVideo }
      setCallerInfo(data.callerInfo);
      setIsVideoCall(data.isVideo);
      setCallStatus('ringing');
      
      // Store offer to answer later
      peerConnection.current = createPeerConnection(data.callerId);
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
    };

    const handleAnswerCall = async (data) => {
      // data: { answer, callerId }
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallStatus('active');
      }
    };

    const handleIceCandidate = async (data) => {
      // data: { candidate, callerId }
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

    socket.on('call_user', handleCallUser);
    socket.on('answer_call', handleAnswerCall);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('reject_call', handleRejectCall);
    socket.on('end_call', handleEndCall);
    socket.on('call_handled_elsewhere', handleHandledElsewhere);

    return () => {
      socket.off('call_user');
      socket.off('answer_call');
      socket.off('ice_candidate');
      socket.off('reject_call');
      socket.off('end_call');
      socket.off('call_handled_elsewhere');
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

  const initiateCall = async (targetUserId, targetUserInfo, isVideo) => {
    const stream = await getMedia(isVideo);
    if (!stream) return;

    setIsVideoCall(isVideo);
    setCallerInfo(targetUserInfo);
    setCallStatus('calling');

    peerConnection.current = createPeerConnection(targetUserId);

    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit('call_user', {
      userToCall: targetUserId,
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
    if (callerInfo && socket) {
      socket.emit('reject_call', {
        to: callerInfo.id,
        callerId: user.id
      });
    }
    resetCallState();
  };

  const endCall = () => {
    if (callerInfo && socket) {
      socket.emit('end_call', {
        to: callerInfo.id,
        callerId: user.id
      });
    }
    resetCallState();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const resetCallState = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setCallerInfo(null);
    setIsVideoCall(false);
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
      toggleVideo
    }}>
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
