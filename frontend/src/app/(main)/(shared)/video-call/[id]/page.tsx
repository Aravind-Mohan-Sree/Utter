'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { DataConnection, MediaConnection, Peer as PeerType } from 'peerjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaCheck, FaChevronUp, FaComments, FaMicrophone, FaMicrophoneSlash,FaPaperPlane, FaPhoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';
import { MdReportProblem } from 'react-icons/md';
import { useSelector } from 'react-redux';

import CreateAbuseReportModal from '~components/modals/CreateAbuseReportModal';
import Loader from '~components/ui/Loader';
import { API_ROUTES } from '~constants/routes';
import { useSocketContext } from '~contexts/SocketContext';
import { IAbuseReportMessage, uploadAttachment } from '~services/user/chatService';
import { RootState } from '~store/rootReducer';
import axiosInstance from '~utils/axiosConfig';
import { errorHandler } from '~utils/errorHandler';
import { utterToast } from '~utils/utterToast';

interface Message {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Date;
}

export default function VideoCallPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = params?.id as string;
    const { user } = useSelector((state: RootState) => state.auth);
    const { socket } = useSocketContext();

    const userId = user?.id;
    const userName = user?.name;
    const userRole = user?.role;

    const forcedRole = searchParams.get('role') as 'user' | 'tutor' | null;
    const myRole = forcedRole || userRole;
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setIsChatOpen(true);
        }
    }, []);
    const [isConnected, setIsConnected] = useState(false);
    const [isCallConnected, setIsCallConnected] = useState(false);
    const [otherPartyName, setOtherPartyName] = useState('');

    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicId, setSelectedMicId] = useState<string>('');
    const [selectedCamId, setSelectedCamId] = useState<string>('');
    const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
    const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
    const [isCamMenuOpen, setIsCamMenuOpen] = useState(false);

    const peerRef = useRef<PeerType | null>(null);
    const isDataConnectedRef = useRef(false);
    const isMediaConnectedRef = useRef(false);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const callRef = useRef<MediaConnection | null>(null);
    const connRef = useRef<DataConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const videoChunksRef = useRef<Blob[]>([]);
    const activeRecorderRef = useRef<MediaRecorder | null>(null);


    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        const video = remoteVideoRef.current;
        if (video && remoteStream) {
            video.srcObject = remoteStream;
            video.onloadedmetadata = () => {
                video.play().catch(() => { });
            };
            video.play().catch(() => { });
        }
    }, [remoteStream, isCallConnected]);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const stopMediaTracks = useCallback((clearState: boolean = true) => {

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            localStreamRef.current = null;
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            remoteStreamRef.current = null;
        }

        if (localVideoRef.current) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            if (stream && typeof stream.getTracks === 'function') {
                stream.getTracks().forEach(t => t.stop());
            }
            localVideoRef.current.srcObject = null;
            localVideoRef.current.load();
        }
        if (remoteVideoRef.current) {
            const stream = remoteVideoRef.current.srcObject as MediaStream;
            if (stream && typeof stream.getTracks === 'function') {
                stream.getTracks().forEach(t => t.stop());
            }
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.load();
        }

        if (clearState) {
            setLocalStream(null);
            setRemoteStream(null);
        }
    }, []);

    const isDisconnectingRef = useRef(false);
    const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleDisconnect = useCallback((emitSocketEvent?: boolean, isAutoCompleted?: boolean) => {
        const shouldEmit = typeof emitSocketEvent === 'boolean' ? emitSocketEvent : true;

        if (isDisconnectingRef.current) return;
        isDisconnectingRef.current = true;

        const otherId = searchParams.get('otherId');
        if (shouldEmit && socket && otherId) {
            socket.emit('end_call', { otherPartyId: otherId, bookingId });
        }

        if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
        }

        if (callRef.current) {
            callRef.current.close();
            callRef.current = null;
        }
        if (connRef.current) {
            connRef.current.close();
            connRef.current = null;
        }
        if (peerRef.current) {
            peerRef.current.disconnect();
            peerRef.current.destroy();
            peerRef.current = null;
        }
        stopMediaTracks(false);
        
        setTimeout(() => {
            const redirectUrl = (searchParams.get('type') === 'chat')
                ? '/chats'
                : (isAutoCompleted && myRole === 'tutor')
                    ? `/sessions?feedbackBookingId=${bookingId}`
                    : '/sessions';
            router.push(redirectUrl);
        }, 100);
    }, [router, stopMediaTracks, socket, searchParams, bookingId, myRole]);

    useEffect(() => {
        const handleUnload = () => {
             if (socket && !isDisconnectingRef.current) {
                const otherId = searchParams.get('otherId');
                if (otherId) {
                    socket.emit('end_call', { otherPartyId: otherId, bookingId });
                }
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [socket, bookingId, searchParams]);

    useEffect(() => {
        if (!socket) return;

        const onCallEnded = () => {
            utterToast.info('The call has ended');
            handleDisconnect(false);
        };

        const onSessionCompleted = () => {
            utterToast.success('Session completed successfully');
            handleDisconnect(false, true);
        };

        socket.on('call_ended', onCallEnded);
        socket.on('session_completed', onSessionCompleted);

        return () => {
            socket.off('call_ended', onCallEnded);
            socket.off('session_completed', onSessionCompleted);
        };
    }, [socket, handleDisconnect, searchParams]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const isChatCall = searchParams.get('type') === 'chat';

        if (isCallConnected && bookingId && !isChatCall) {
            interval = setInterval(async () => {
                try {
                    const rolePrefix = myRole === 'user' ? 'user' : 'tutor';
                    const res = await axiosInstance.post(`/${rolePrefix}/bookings/${bookingId}/ping`);
                    if (res.data?.completed) {
                        utterToast.success('Session completed successfully');
                        const otherId = searchParams.get('otherId');
                        if (socket && otherId) {
                            socket.emit('session_completed', { otherPartyId: otherId });
                        }
                        handleDisconnect(false, true);
                    }
                } catch (err) {
                    console.error('Error pinging session time', err);
                }
            }, 5000); // 5 seconds interval
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isCallConnected, bookingId, myRole, handleDisconnect, searchParams, socket]);

    const getDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const mics = devices.filter(d => d.kind === 'audioinput');
            const cams = devices.filter(d => d.kind === 'videoinput');
            const speakers = devices.filter(d => d.kind === 'audiooutput');
            setAudioDevices(mics);
            setVideoDevices(cams);
            setAudioOutputDevices(speakers);


            if (localStreamRef.current) {
                const audioTrack = localStreamRef.current.getAudioTracks()[0];
                const videoTrack = localStreamRef.current.getVideoTracks()[0];
                if (audioTrack) setSelectedMicId(audioTrack.getSettings().deviceId || '');
                if (videoTrack) setSelectedCamId(videoTrack.getSettings().deviceId || '');
            }

            if (speakers.length > 0) {
                setSelectedSpeakerId('default');
            }
        } catch (err) {
            console.error("Error enumerating devices:", err);
        }
    };

    const switchDevice = async (kind: 'audio' | 'video', deviceId: string) => {
        try {
            const constraints: MediaStreamConstraints = {
                audio: kind === 'audio' ? { deviceId: { exact: deviceId } } : { deviceId: selectedMicId ? { exact: selectedMicId } : undefined },
                video: kind === 'video' ? { deviceId: { exact: deviceId } } : { deviceId: selectedCamId ? { exact: selectedCamId } : undefined }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);

            if (kind === 'audio') {
                const newTrack = newStream.getAudioTracks()[0];
                if (localStream && localStreamRef.current) {
                    const oldTrack = localStream.getAudioTracks()[0];
                    if (oldTrack) {
                        localStream.removeTrack(oldTrack);
                        oldTrack.stop();
                    }
                    localStream.addTrack(newTrack);


                    if (callRef.current && callRef.current.peerConnection) {
                        const senders = callRef.current.peerConnection.getSenders();
                        const sender = senders.find(s => s.track?.kind === kind);
                        if (sender) sender.replaceTrack(newTrack);
                    }
                }
                setSelectedMicId(deviceId);
                setIsMicMenuOpen(false);
            } else {
                const newTrack = newStream.getVideoTracks()[0];
                if (localStream && localStreamRef.current) {
                    const oldTrack = localStream.getVideoTracks()[0];
                    if (oldTrack) {
                        localStream.removeTrack(oldTrack);
                        oldTrack.stop();
                    }
                    localStream.addTrack(newTrack);


                    if (callRef.current && callRef.current.peerConnection) {
                        const senders = callRef.current.peerConnection.getSenders();
                        const sender = senders.find(s => s.track?.kind === kind);
                        if (sender) sender.replaceTrack(newTrack);
                    }
                }
                setSelectedCamId(deviceId);
                setIsCamMenuOpen(false);
            }
        } catch (err) {
            console.error("Error switching device:", err);
        }
    };

    const switchSpeaker = async (deviceId: string) => {
        try {
            const video = remoteVideoRef.current;
            if (video && ('setSinkId' in video)) {
                await (video as HTMLVideoElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
                setSelectedSpeakerId(deviceId);
                utterToast.success("Speaker changed successfully");
            } else {
                utterToast.error("Your browser does not support changing audio output devices.");
            }
        } catch (err) {
            console.error("Error switching speaker:", err);
            utterToast.error("Failed to switch speaker.");
        }
    };

    useEffect(() => {
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }, []);

    const isCallingRef = useRef(false);
    const isConnectingDataRef = useRef(false);

    const reinitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user || !bookingId) return;
        let isActive = true;
        let peerInstance: PeerType | null = null;

        const cleanupPeer = () => {
            if (peerInstance) {
                peerInstance.disconnect();
                peerInstance.destroy();
                peerInstance = null;
            }
            if (reinitTimeoutRef.current) {
                clearTimeout(reinitTimeoutRef.current);
                reinitTimeoutRef.current = null;
            }
        };

        const initPeer = async () => {
            try {
                if (!isActive) return;

                cleanupPeer();

                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(t => t.stop());
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                if (!isActive) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                setLocalStream(stream);
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                await getDevices();

                const PeerJS = (await import('peerjs')).default;
                if (!isActive) return;

                const otherId = searchParams.get('otherId');
                const callId = searchParams.get('callId');

                let myPeerId = `${bookingId}_${myRole}`;
                let targetPeerId = `${bookingId}_${myRole === 'user' ? 'tutor' : 'user'}`;

                if (userId && otherId) {
                    myPeerId = `${bookingId}_${userId}`;
                    targetPeerId = `${bookingId}_${otherId}`;
                }

                if (callId) {
                    myPeerId = `${myPeerId}_${callId}`;
                    targetPeerId = `${targetPeerId}_${callId}`;
                }

                peerInstance = new PeerJS(myPeerId, {
                    debug: 0,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun2.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });
                peerRef.current = peerInstance;

                const attemptConnection = () => {
                    if (!peerInstance || peerInstance.destroyed) return;

                    if (!isMediaConnectedRef.current && !isCallingRef.current) {
                        isCallingRef.current = true;
                        if (callRef.current) callRef.current.close();
                        const call = peerInstance.call(targetPeerId, stream);
                        if (call) handleCall(call);
                        
                        setTimeout(() => {
                            if (!isMediaConnectedRef.current) {
                                isCallingRef.current = false;
                                call?.close();
                            }
                        }, 15000);
                    }

                    if (!isDataConnectedRef.current && !isConnectingDataRef.current) {
                        isConnectingDataRef.current = true;
                        if (connRef.current) connRef.current.close();
                        const conn = peerInstance.connect(targetPeerId);
                        if (conn) handleConnection(conn);
                        
                        setTimeout(() => {
                           if (!isDataConnectedRef.current) {
                               isConnectingDataRef.current = false;
                               conn?.close();
                           }
                        }, 10000);
                    }
                };

                peerInstance.on('open', () => {
                    attemptConnection();

                    if (!reinitTimeoutRef.current) {
                        reinitTimeoutRef.current = setTimeout(() => {
                            if (!isMediaConnectedRef.current && isActive) {
                                initPeer();
                            }
                        }, 30000);
                    }

                    retryIntervalRef.current = setInterval(() => {
                        if (!isMediaConnectedRef.current || !isDataConnectedRef.current) {
                            attemptConnection();
                        }
                    }, 5000);
                });

                peerInstance.on('disconnected', () => {
                    if (peerInstance && !peerInstance.destroyed) {
                        peerInstance.reconnect();
                    }
                });

                peerInstance.on('call', (call) => {
                    call.answer(stream);
                    handleCall(call);
                });

                peerInstance.on('connection', (conn) => {
                    handleConnection(conn);
                });

                peerInstance.on('error', (err) => {
                    if (err.type === 'peer-unavailable' || err.type === 'unavailable-id') {
                        isCallingRef.current = false;
                        isConnectingDataRef.current = false;
                    }
                });

            } catch {
                utterToast.error('Could not access camera/microphone.');
            }
        };

        const handleCall = (call: MediaConnection) => {
            callRef.current = call;
            call.on('stream', (stream) => {
                setRemoteStream(stream);
                remoteStreamRef.current = stream;
                setIsCallConnected(true);
                setIsConnected(true);
                isMediaConnectedRef.current = true;
                isCallingRef.current = false;
            });
            call.on('close', () => {
                setIsCallConnected(false);
                setRemoteStream(null);
                isMediaConnectedRef.current = false;
                isCallingRef.current = false;
            });
            call.on('error', () => {
                setIsCallConnected(false);
                setRemoteStream(null);
                isMediaConnectedRef.current = false;
                isCallingRef.current = false;
            });
        };

        const handleConnection = (conn: DataConnection) => {
            connRef.current = conn;
            conn.on('open', () => {
                setIsConnected(true);
                isDataConnectedRef.current = true;
                isConnectingDataRef.current = false;

                conn.send({ type: 'identity', name: userName });
            });
            conn.on('close', () => {
                setIsConnected(false);
                setIsCallConnected(false);
                isDataConnectedRef.current = false;
                isConnectingDataRef.current = false;
            });
            conn.on('error', () => {
                setIsConnected(false);
                setIsCallConnected(false);
                isDataConnectedRef.current = false;
                isConnectingDataRef.current = false;
            });
            conn.on('data', (data: unknown) => {
                const payload = data as { type: string; name?: string; senderId?: string; senderName?: string; text?: string };
                if (payload.type === 'identity' && payload.name) {
                    setOtherPartyName(payload.name);
                } else if (payload.type === 'chat' && payload.senderId && payload.senderName && payload.text) {
                    setMessages(prev => [...prev, {
                        senderId: payload.senderId!,
                        senderName: payload.senderName!,
                        text: payload.text!,
                        timestamp: new Date()
                    }]);
                }
            });
        };

        initPeer();

        return () => {
            isActive = false;
            isDataConnectedRef.current = false;
            isMediaConnectedRef.current = false;
            if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);            

            if (peerInstance) {
                peerInstance.disconnect();
                peerInstance.destroy();
            }
            stopMediaTracks(false);
            videoChunksRef.current = [];
            activeRecorderRef.current = null;

            setTimeout(() => stopMediaTracks(false), 100);
        };
    }, [bookingId, userId, userName, userRole, myRole, stopMediaTracks, socket, searchParams, user]);

    useEffect(() => {
        const paramName = searchParams.get('otherName');
        if (paramName && !otherPartyName) {
            setOtherPartyName(paramName);
        }
    }, [searchParams, otherPartyName]);

    useEffect(() => {
        if (!isCallConnected) return;

        let isRecordingActive = true;        
        const startRecordingSegment = () => {
            if (!remoteStreamRef.current || !isMediaConnectedRef.current || !isRecordingActive) return;
            
            try {
                const recorder = new MediaRecorder(remoteStreamRef.current, { mimeType: 'video/webm;codecs=vp8,opus' });
                const currentChunks: Blob[] = [];
                
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0 && isRecordingActive) currentChunks.push(e.data);
                };

                recorder.onstop = () => {
                    if (currentChunks.length > 0 && isRecordingActive) {
                        const segmentBlob = new Blob(currentChunks, { type: 'video/webm' });
                        videoChunksRef.current.push(segmentBlob);
                        if (videoChunksRef.current.length > 3) {
                            videoChunksRef.current.shift();
                        }
                    }
                    activeRecorderRef.current = null;
                };

                activeRecorderRef.current = recorder;
                recorder.start(1000); // 1s chunks
                
                const segmentTimeout = setTimeout(() => {
                    if (recorder.state === 'recording' && isRecordingActive) recorder.stop();
                }, 20000); // 20s segments

                return segmentTimeout;
            } catch (err) {
                console.error('Evidence capture failed to start:', err);
            }
        };

        const interval = setInterval(startRecordingSegment, 20000);
        startRecordingSegment();

        return () => {
            isRecordingActive = false;
            if (interval) clearInterval(interval);
            if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
                activeRecorderRef.current.stop();
            }
        };
    }, [isCallConnected]);

    const handleReportSubmit = async (type: string, description: string) => {
        try {
            setIsReporting(true);

            if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
                const stopPromise = new Promise(resolve => {
                    if (activeRecorderRef.current) {
                        const originalOnStop = activeRecorderRef.current.onstop;
                        activeRecorderRef.current.onstop = (e) => {
                            if (originalOnStop) originalOnStop.call(activeRecorderRef.current!, e);
                            resolve(true);
                        };
                    } else {
                        resolve(false);
                    }
                });
                
                activeRecorderRef.current.stop();
                await stopPromise; 
                await new Promise(resolve => setTimeout(resolve, 100)); 
            }

            const otherId = searchParams.get('otherId');
            if (!otherId) return;

            const contextMessages: IAbuseReportMessage[] = messages.slice(-5).map(msg => ({
                senderId: msg.senderId,
                text: msg.text || '',
                timestamp: msg.timestamp
            }));

            if (videoChunksRef.current.length > 0) {
                const finalChunks = [...videoChunksRef.current];
                utterToast.info('Processing video evidence');
                
                const uploadPromises = finalChunks.map(async (segmentBlob, index) => {
                    const fileName = `video-evidence-part${index + 1}-${Date.now()}.webm`;
                    const file = new File([segmentBlob], fileName, { type: 'video/webm' });
                    const uploadRes = await uploadAttachment(file);
                    
                    return {
                        senderId: otherId,
                        text: `VIDEO_EVIDENCE_AUTO_PART_${index + 1}`,
                        timestamp: new Date(Date.now() - (finalChunks.length - index) * 20000),
                        fileUrl: uploadRes.url,
                        fileType: uploadRes.fileType,
                        fileName: uploadRes.fileName
                    };
                });

                const uploadedSegments = await Promise.all(uploadPromises);
                contextMessages.push(...uploadedSegments);
            }

            const reportPath = myRole === 'user' ? API_ROUTES.USER.REPORTS : API_ROUTES.TUTOR.REPORTS;
            await axiosInstance.post(reportPath, {
                reportedId: otherId,
                type,
                description,
                messages: contextMessages,
                channel: 'video'
            });

            utterToast.success('Abuse report submitted successfully');
            videoChunksRef.current = [];
            setIsReportModalOpen(false);
        } catch (error) {
            utterToast.error(errorHandler(error));
        } finally {
            setIsReporting(false);
        }
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !connRef.current || !user) return;

        const messageData = {
            type: 'chat',
            senderId: userId,
            senderName: userName,
            text: newMessage,
        };

        connRef.current.send(messageData);
        setMessages(prev => [...prev, {
            senderId: userId || 'unknown',
            senderName: userName || 'Me',
            text: newMessage,
            timestamp: new Date()
        }]);
        setNewMessage('');
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    if (!localStream) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
                <Loader />
                <p className="mt-4 text-gray-400 font-medium">Setting up your secure video call...</p>
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] w-full bg-gray-900 text-white overflow-hidden">
            <div className="flex-1 flex flex-col relative h-full">
                {/* Main Video Area */}
                <div className="flex-1 relative bg-black flex items-center justify-center">
                    {/* 
                        Remote Video Container 
                        This is the parent for all video-related overlays.
                    */}
                    <div className="relative w-full h-full flex items-center justify-center bg-gray-800">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className={`w-full h-full object-contain ${isCallConnected ? 'block' : 'hidden'}`}
                        />

                        {isCallConnected && (
                            <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-20">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-semibold tracking-wide uppercase">{otherPartyName || (myRole === 'user' ? 'Tutor' : 'Student')}</span>
                            </div>
                        )}

                        {!isCallConnected && (
                            <div className="flex flex-col items-center animate-in fade-in duration-700 z-10">
                                <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 relative">
                                    <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-20" />
                                    <FaVideo className="text-rose-500 relative z-10" size={40} />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight text-center">
                                    {isConnected ? 'Connecting Video...' : `Waiting...`}
                                </h2>
                            </div>
                        )}

                        {/* Local Stream (PiP) */}
                        <div className="absolute top-6 right-6 w-48 md:w-72 aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 group transition-all z-30">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            {isVideoOff && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <FaVideoSlash className="text-gray-500" size={30} />
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                YOU
                            </div>
                        </div>
                    </div>
                </div>

                {/* Call Controls Overlay (Capsule) */}
                <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 px-4 md:px-6 py-2 md:py-3 bg-gray-900/95 backdrop-blur-3xl rounded-full border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[100] pointer-events-auto transition-all duration-300 ${isChatOpen ? 'hidden lg:flex' : 'flex'}`}>
                    {/* Microphone Control */}
                    <div className="relative group/menu">
                        <div className="flex items-center bg-gray-800 rounded-full">
                            <button
                                onClick={toggleMute}
                                className={`cursor-pointer p-2.5 md:p-3 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${isMuted ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'hover:bg-gray-700'
                                    }`}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <FaMicrophoneSlash size={18} className="md:w-5 md:h-5" /> : <FaMicrophone size={18} className="md:w-5 md:h-5" />}
                            </button>
                            <button
                                onClick={() => { setIsMicMenuOpen(!isMicMenuOpen); setIsCamMenuOpen(false); }}
                                className="cursor-pointer pr-3 pl-1 text-gray-400 hover:text-white transition-colors"
                            >
                                <FaChevronUp size={10} className={`mt-0.5 transition-transform duration-300 ${isMicMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {isMicMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-4 w-60 bg-gray-900/95 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl p-2 animate-in slide-in-from-bottom-2 duration-200">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1">Select Microphone</div>
                                <div className="max-h-32 overflow-y-auto no-scrollbar">
                                    {audioDevices.length > 0 ? audioDevices.map((device) => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => switchDevice('audio', device.deviceId)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                                        >
                                            <span className="text-xs font-medium truncate pr-2 text-white/90">{device.label || `Microphone ${device.deviceId.slice(0, 5)}`}</span>
                                            {selectedMicId === device.deviceId && <FaCheck className="text-rose-500 shrink-0" size={10} />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-2 text-xs text-gray-500 font-medium">No microphones found</div>
                                    )}
                                </div>

                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 py-2 border-t border-white/5 mt-1">Select Speaker</div>
                                <div className="max-h-32 overflow-y-auto no-scrollbar mt-1">
                                    {audioOutputDevices.length > 0 ? audioOutputDevices.map((device) => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => switchSpeaker(device.deviceId)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                                        >
                                            <span className="text-xs font-medium truncate pr-2 text-white/90">{device.label || `Speaker ${device.deviceId.slice(0, 5)}`}</span>
                                            {selectedSpeakerId === device.deviceId && <FaCheck className="text-rose-500 shrink-0" size={10} />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-2 text-xs text-gray-500 font-medium">No speakers found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Camera Control */}
                    <div className="relative group/menu">
                        <div className="flex items-center bg-gray-800 rounded-full">
                            <button
                                onClick={toggleVideo}
                                className={`cursor-pointer p-2.5 md:p-3 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${isVideoOff ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'hover:bg-gray-700'
                                    }`}
                                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                            >
                                {isVideoOff ? <FaVideoSlash size={18} className="md:w-5 md:h-5" /> : <FaVideo size={18} className="md:w-5 md:h-5" />}
                            </button>
                            <button
                                onClick={() => { setIsCamMenuOpen(!isCamMenuOpen); setIsMicMenuOpen(false); }}
                                className="cursor-pointer pr-3 pl-1 text-gray-400 hover:text-white transition-colors"
                            >
                                <FaChevronUp size={10} className={`mt-0.5 transition-transform duration-300 ${isCamMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {isCamMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-4 w-60 bg-gray-900/95 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl p-2 animate-in slide-in-from-bottom-2 duration-200">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 py-2">Select Camera</div>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    {videoDevices.length > 0 ? videoDevices.map((device) => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => switchDevice('video', device.deviceId)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                                        >
                                            <span className="text-xs font-medium truncate pr-2">{device.label || `Camera ${device.deviceId.slice(0, 5)}`}</span>
                                            {selectedCamId === device.deviceId && <FaCheck className="text-rose-500 shrink-0" size={10} />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-2 text-xs text-gray-500">No cameras found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => handleDisconnect()}
                        className="cursor-pointer p-2.5 md:p-3 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all duration-300 transform hover:scale-110 active:scale-95 hover:rotate-12"
                        title="End Meeting"
                    >
                        {myRole === 'user' ? <FaPhoneSlash size={18} className="md:w-5 md:h-5" /> : <FaPhoneSlash size={18} className="md:w-5 md:h-5" />}
                    </button>

                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`cursor-pointer p-2.5 md:p-3 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center ${isChatOpen ? 'bg-rose-500 shadow-lg shadow-rose-500/30' : 'bg-gray-800 hover:bg-gray-700'
                            }`}
                        title="Toggle Chat"
                    >
                        <FaComments size={18} className="md:w-5 md:h-5" />
                    </button>

                    {isCallConnected && (
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="cursor-pointer p-2.5 md:p-3 rounded-full bg-gray-800 hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 transition-all duration-300 transform hover:scale-110 active:scale-95"
                            title="Report Abuse"
                        >
                            <MdReportProblem size={22} className="md:w-6 md:h-6" />
                        </button>
                    )}

                </div>
            </div>

            <div
                className={`fixed inset-y-0 right-0 lg:relative flex flex-col bg-gray-800 border-l border-white/5 shadow-2xl transition-all duration-500 ease-in-out z-50 ${isChatOpen ? 'translate-x-0 w-full lg:w-96' : 'translate-x-full w-0 invisible'
                    }`}
            >
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gray-800/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center">
                            <FaComments className="text-rose-500" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">Chat</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsChatOpen(false)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <FaVideo size={20} className="lg:hidden" />
                    </button>
                </div>

                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-5 no-scrollbar bg-gray-900/10 flex flex-col"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500/40 select-none">
                            <FaComments size={56} className="mb-4" />
                            <p className="font-semibold text-center uppercase tracking-widest text-sm">Start of Conversation</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.senderId === userId;
                            return (
                                <div key={idx} className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">{msg.senderName}</span>
                                        <span className="text-[10px] text-gray-500 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div
                                        className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-lg ${isMe
                                            ? 'bg-rose-500 text-white rounded-tr-none'
                                            : 'bg-gray-700 text-gray-100 rounded-tl-none border border-white/5'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} className="shrink-0" />
                </div>

                <div className="p-4 bg-gray-800/80 backdrop-blur-xl border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type your message here..."
                            className="flex-1 bg-gray-950 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all placeholder:text-gray-600 shadow-inner"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!newMessage.trim()}
                            className="cursor-pointer p-4 bg-rose-500 hover:bg-rose-600 rounded-2xl transition-all duration-300 shadow-lg shadow-rose-500/20 disabled:opacity-40 disabled:grayscale transform hover:scale-105 active:scale-95"
                        >
                            <FaPaperPlane size={14} className="translate-x-px -translate-y-px" />
                        </button>
                    </div>
                </div>
            </div>
            {isReportModalOpen && (
                <CreateAbuseReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    onSubmit={handleReportSubmit}
                    reportedName={otherPartyName || (myRole === 'user' ? 'Tutor' : 'Student')}
                    isVideoCall={true}
                    isLoading={isReporting}
                />
            )}
        </div>
    );
}
