import React, { useEffect } from 'react';
import { useCall } from '../contexts/CallContext';
import { Phone, Video, Mic, MicOff, PhoneOff, VideoOff } from 'lucide-react';
import { Button } from './ui/button';

export function CallOverlay() {
  const { 
    callStatus, 
    callerInfo, 
    isVideoCall, 
    isMuted, 
    isVideoEnabled, 
    localVideoRef, 
    remoteVideoRef, 
    acceptCall, 
    rejectCall, 
    endCall, 
    toggleMute, 
    toggleVideo,
    localStream,
    remoteStream
  } = useCall();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus, localVideoRef]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus, remoteVideoRef]);

  if (callStatus === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl">
      {/* INCOMING CALL / CALLING */}
      {(callStatus === 'ringing' || callStatus === 'calling') && (
        <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300 w-full max-w-sm">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden z-10 relative">
              {callerInfo?.avatarUrl ? (
                <img src={callerInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {callerInfo?.username?.[0]?.toUpperCase() || callerInfo?.email?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            {/* Ripple Effect */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping"></div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {callerInfo?.username || callerInfo?.email || 'Unknown User'}
          </h2>
          <p className="text-muted-foreground mb-8 text-center flex items-center gap-2">
            {isVideoCall ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            {callStatus === 'ringing' ? 'Incoming Call...' : 'Calling...'}
          </p>

          <div className="flex gap-6">
            {callStatus === 'ringing' && (
              <Button 
                onClick={acceptCall} 
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                title="Accept"
              >
                {isVideoCall ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </Button>
            )}
            <Button 
              onClick={callStatus === 'ringing' ? rejectCall : endCall} 
              variant="destructive"
              className="w-14 h-14 rounded-full shadow-lg shadow-destructive/20"
              title={callStatus === 'ringing' ? "Reject" : "Cancel"}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* ACTIVE CALL */}
      {callStatus === 'active' && (
        <div className="w-full h-full flex flex-col bg-black relative">
          
          {/* Remote Video / Audio Placeholder */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {isVideoCall ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                   <Phone className="w-12 h-12 text-primary animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white">{callerInfo?.username || callerInfo?.email}</h2>
                <p className="text-white/60 mt-2">Active Audio Call</p>
              </div>
            )}

            {/* Audio Element for Remote Audio in Video Call if not attached to video */}
            {!isVideoCall && remoteStream && (
                <audio ref={remoteVideoRef} autoPlay />
            )}
          </div>

          {/* Local Video (PiP) */}
          {isVideoCall && (
            <div className="absolute top-6 right-6 w-32 h-48 md:w-48 md:h-72 bg-gray-900 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-10">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md p-4 rounded-full border border-white/10 z-20">
            <Button 
              onClick={toggleMute} 
              variant="ghost" 
              className={`w-12 h-12 rounded-full ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {isVideoCall && (
              <Button 
                onClick={toggleVideo} 
                variant="ghost" 
                className={`w-12 h-12 rounded-full ${!isVideoEnabled ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            )}

            <Button 
              onClick={endCall} 
              variant="destructive" 
              className="w-16 h-12 rounded-full px-6 shadow-lg shadow-destructive/20 ml-2"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
