import React, { useEffect, useRef } from 'react';
import { useCall } from '../contexts/CallContext';
import { Phone, Video, Mic, MicOff, PhoneOff, VideoOff, Users } from 'lucide-react';
import { Button } from './ui/button';

// Modular Subcomponent to handle individual remote stream rendering
function GroupVideoCard({ socketId, stream, participantInfo }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-zinc-900/90 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center aspect-video group animate-in zoom-in-95 duration-300">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs text-white border border-white/5 font-medium flex items-center gap-1.5 z-10 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse"></span>
        {participantInfo?.username || participantInfo?.email || 'Participant'}
      </div>
    </div>
  );
}

// Modular Subcomponent to handle individual remote audio rendering in group call
function GroupAudioCard({ participantInfo }) {
  return (
    <div className="relative bg-zinc-900/90 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col items-center justify-center p-6 aspect-video group animate-in zoom-in-95 duration-300">
      <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(var(--primary),0.1)] relative">
        {participantInfo?.avatarUrl ? (
          <img src={participantInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
        ) : (
          <span className="text-xl font-bold text-primary">
            {participantInfo?.username?.[0]?.toUpperCase() || participantInfo?.email?.[0]?.toUpperCase()}
          </span>
        )}
        <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping opacity-30"></div>
      </div>
      <span className="text-sm font-semibold text-white">{participantInfo?.username || 'Participant'}</span>
      <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
        <Mic className="w-3 h-3 text-emerald-500" /> Connected
      </span>
    </div>
  );
}

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
    remoteStream,
    
    // Group Call States
    isGroupCall,
    groupRemoteStreams,
    groupParticipants
  } = useCall();

  // Attach local stream for video conferencing
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus, localVideoRef]);

  // Attach remote stream for 1-to-1 calls
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && !isGroupCall) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus, remoteVideoRef, isGroupCall]);

  if (callStatus === 'idle') return null;

  // Determine grid scaling for group call
  const activeStreamsCount = Object.keys(groupRemoteStreams).length + (localStream ? 1 : 0);
  let gridCols = "grid-cols-1";
  if (activeStreamsCount === 2) {
    gridCols = "grid-cols-1 md:grid-cols-2";
  } else if (activeStreamsCount >= 3) {
    gridCols = "grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-2xl">
      
      {/* 1. INCOMING CALL / DIALING SCREEN */}
      {(callStatus === 'ringing' || callStatus === 'calling') && (
        <div className="bg-card/45 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300 w-full max-w-sm">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden z-10 relative">
              {callerInfo?.avatarUrl ? (
                <img src={callerInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {callerInfo?.groupName?.[0]?.toUpperCase() || callerInfo?.username?.[0]?.toUpperCase() || callerInfo?.email?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            {/* Ripple Effect */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping"></div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center max-w-[280px] truncate">
            {callerInfo?.isGroup ? callerInfo.groupName : (callerInfo?.username || callerInfo?.email || 'Unknown User')}
          </h2>
          <p className="text-muted-foreground mb-8 text-center flex items-center gap-2 text-sm">
            {isGroupCall ? <Users className="w-4 h-4 text-primary" /> : (isVideoCall ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />)}
            {isGroupCall 
              ? `${callerInfo?.isGroup ? 'Incoming Group Video Call' : 'Group Call Invite...'}`
              : (callStatus === 'ringing' ? 'Incoming Call...' : 'Calling...')}
          </p>

          <div className="flex gap-6">
            {callStatus === 'ringing' && (
              <Button 
                onClick={acceptCall} 
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center"
                title="Accept"
              >
                {isVideoCall ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </Button>
            )}
            <Button 
              onClick={callStatus === 'ringing' ? rejectCall : endCall} 
              variant="destructive"
              className="w-14 h-14 rounded-full shadow-lg shadow-destructive/20 flex items-center justify-center"
              title={callStatus === 'ringing' ? "Reject" : "Cancel"}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE CALL VIEW */}
      {callStatus === 'active' && (
        <div className="w-full h-full flex flex-col bg-zinc-950/95 relative animate-in fade-in duration-500">
          
          {/* GROUP CALL STREAM GRID */}
          {isGroupCall ? (
            <div className="flex-1 p-6 md:p-12 overflow-y-auto flex items-center justify-center">
              <div className={`grid ${gridCols} gap-4 max-w-6xl w-full`}>
                
                {/* Local User stream card */}
                {localStream && (
                  <div className="relative bg-zinc-900/90 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center aspect-video animate-in zoom-in-95 duration-300">
                    {isVideoCall ? (
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                      />
                    ) : null}

                    {(!isVideoCall || !isVideoEnabled) && (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-xl font-bold text-primary">
                              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-white/80">You</span>
                      </div>
                    )}
                    
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs text-white border border-white/5 font-medium flex items-center gap-1.5 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                      You {isMuted && ' (Muted)'}
                    </div>
                  </div>
                )}

                {/* Render remote peer streams */}
                {Object.entries(groupRemoteStreams).map(([socketId, stream]) => {
                  const peerInfo = groupParticipants.find(p => p.socketId === socketId);
                  return isVideoCall ? (
                    <GroupVideoCard 
                      key={socketId} 
                      socketId={socketId} 
                      stream={stream} 
                      participantInfo={peerInfo} 
                    />
                  ) : (
                    <GroupAudioCard 
                      key={socketId} 
                      participantInfo={peerInfo} 
                    />
                  );
                })}

                {/* Audio streams element mapping to ensure sound works for audio group calls */}
                {!isVideoCall && Object.entries(groupRemoteStreams).map(([socketId, stream]) => (
                  <audio 
                    key={`audio_${socketId}`} 
                    autoPlay 
                    ref={(el) => {
                      if (el && el.srcObject !== stream) {
                        el.srcObject = stream;
                      }
                    }}
                  />
                ))}

              </div>
            </div>
          ) : (
            
            // STANDARD 1-to-1 CALL VIEW (Backward Compatible)
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
                  <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-4 border border-primary/30 relative">
                    <Phone className="w-12 h-12 text-primary animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-40"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{callerInfo?.username || callerInfo?.email}</h2>
                  <p className="text-white/60 mt-2 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                    Active Audio Call
                  </p>
                </div>
              )}

              {/* 1-to-1 Remote Audio fallbacks */}
              {!isVideoCall && remoteStream && (
                <audio ref={remoteVideoRef} autoPlay />
              )}

              {/* Local Video Picture-in-Picture (1-to-1 Call Only) */}
              {isVideoCall && (
                <div className="absolute top-6 right-6 w-32 h-48 md:w-48 md:h-72 bg-zinc-900 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-10">
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* ACTIVE CALL CONTROL FOOTER */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-950/60 border border-white/10 backdrop-blur-xl p-4 rounded-full z-20 shadow-2xl">
            <Button 
              onClick={toggleMute} 
              variant="ghost" 
              className={`w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {isVideoCall && (
              <Button 
                onClick={toggleVideo} 
                variant="ghost" 
                className={`w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${!isVideoEnabled ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            )}

            <Button 
              onClick={endCall} 
              variant="destructive" 
              className="w-16 h-12 rounded-full px-6 shadow-lg shadow-destructive/20 ml-2 flex items-center justify-center hover:scale-105 transition-all duration-200"
              title="Leave Call"
            >
              <PhoneOff className="w-5 h-5 animate-pulse" />
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
