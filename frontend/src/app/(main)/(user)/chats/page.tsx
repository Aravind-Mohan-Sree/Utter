'use client';

import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaChevronDown, FaCircle, FaDownload, FaFile, FaFileAlt, FaFileArchive, FaFileImage, FaFilePdf, FaFileWord, FaPaperclip, FaPaperPlane, FaRegSmile, FaSearch, FaTimes, FaVideo } from 'react-icons/fa';
import { FaFileCircleXmark } from 'react-icons/fa6';
import { MdContentCopy, MdDelete, MdEdit, MdReportProblem } from 'react-icons/md';
import { useDispatch, useSelector } from 'react-redux';

import CreateAbuseReportModal from '~components/modals/CreateAbuseReportModal';
import Avatar from '~components/ui/Avatar';
import Loader from '~components/ui/Loader';
import { useSocketContext } from '~contexts/SocketContext';
import { setUnreadCount } from '~features/chatSlice';
import { createAbuseReport, deleteMessage, editMessage, getConversations, getMessages, searchChat, sendMessage, uploadAttachment } from '~services/user/chatService';
import { RootState } from '~store/rootReducer';
import { errorHandler } from '~utils/errorHandler';
import { utterAlert } from '~utils/utterAlert';
import { utterToast } from '~utils/utterToast';

interface User {
  id: string;
  name: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  conversationId: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  hiddenBy?: string[];
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount?: Record<string, number>;
  otherUser?: User;
}

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  isHighlighted: boolean;
  editingMessageId: string | null;
  editValue: string;
  setEditValue: (val: string | ((prev: string) => string)) => void;
  setEditingMessageId: (id: string | null) => void;
  handleContextMenu: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  handleSaveEdit: () => void;
  fileError: Record<string, boolean>;
  setMediaError: (id: string) => void;
  setActivePreview: (preview: { url: string; type: string } | null) => void;
  getFullFileUrl: (url?: string) => string;
  getFileIcon: (type?: string, isMe?: boolean) => React.ReactNode;
  showEditEmojiPicker: boolean;
  setShowEditEmojiPicker: (show: boolean) => void;
  onEditEmojiClick: (emojiData: EmojiClickData) => void;
  scrollToBottom: () => void;
  showScrollBottom: boolean;
}

function MessageBubble({
  msg,
  isMe,
  isHighlighted,
  editingMessageId,
  editValue,
  setEditValue,
  setEditingMessageId,
  handleContextMenu,
  handleSaveEdit,
  fileError,
  setMediaError,
  setActivePreview,
  getFullFileUrl,
  getFileIcon,
  showEditEmojiPicker,
  setShowEditEmojiPicker,
  onEditEmojiClick,
  scrollToBottom,
  showScrollBottom
}: MessageBubbleProps) {
  const editAreaRef = useRef<HTMLTextAreaElement>(null);
  const [pickerDirection, setPickerDirection] = useState<'top' | 'bottom'>('top');
  useEffect(() => {
    if (msg.fileUrl && !msg.fileType?.startsWith('image/') && !msg.fileType?.startsWith('video/') && !msg.isDeleted && !fileError[msg.id]) {
      fetch(getFullFileUrl(msg.fileUrl), { method: 'HEAD' })
        .then(res => { if (!res.ok) setMediaError(msg.id); })
        .catch(() => setMediaError(msg.id));
    }
  }, [msg.fileUrl, msg.fileType, msg.isDeleted, msg.id, fileError, getFullFileUrl, setMediaError]);

  const isOnlyEmojis = (text: string) => {
    if (!text) return false;
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/g;
    return emojiRegex.test(text.trim());
  };

  return (
    <div
      id={`msg-${msg.id}`}
      className={`flex w-full px-6 py-1 transition-colors duration-1000 ${isMe ? 'justify-end' : 'justify-start'
        } ${isHighlighted ? 'bg-rose-500/10' : ''}`}
    >
      <div
        className={`relative group max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm text-sm select-none transition-all ${editingMessageId === msg.id ? 'cursor-default' : 'cursor-pointer'
          } ${isMe ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
          }`}
        onContextMenu={(e) => handleContextMenu(e, msg.id)}
        onTouchStart={(e) => {
          if (editingMessageId === msg.id) return;
          const timer = setTimeout(() => handleContextMenu(e, msg.id), 500);
          e.currentTarget.addEventListener('touchend', () => clearTimeout(timer), { once: true });
          e.currentTarget.addEventListener('touchmove', () => clearTimeout(timer), { once: true });
        }}
      >
        {editingMessageId === msg.id ? (
          <div className="flex flex-col gap-2 min-w-[140px] w-64 max-w-full">
            <div className="relative">
              <textarea
                ref={editAreaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-white/10 text-white p-2 pr-10 rounded-xl border border-white/20 focus:outline-none resize-none no-scrollbar overflow-y-auto text-sm max-h-32 mb-1"
                rows={2}
                autoFocus
                onFocus={(e) => {
                  const val = e.currentTarget.value;
                  e.currentTarget.setSelectionRange(val.length, val.length);
                }}
                onInput={(e) => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
              />
              <button
                id="edit-emoji-btn"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  setPickerDirection(spaceBelow > 400 ? 'bottom' : 'top');
                  e.stopPropagation();
                  setShowEditEmojiPicker(!showEditEmojiPicker);
                }}
                className="absolute top-2 right-2 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <FaRegSmile size={18} />
              </button>
              {showEditEmojiPicker && (
                <div 
                  id="edit-emoji-picker-container" 
                  className={`absolute z-[100] shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 
                    ${pickerDirection === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} 
                    ${isMe ? `right-0 ${pickerDirection === 'top' ? 'origin-bottom-right' : 'origin-top-right'}` : `left-0 ${pickerDirection === 'top' ? 'origin-bottom-left' : 'origin-top-left'}`}`}
                >
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      onEditEmojiClick(emojiData);
                      setTimeout(() => editAreaRef.current?.focus(), 0);
                    }}
                    theme={Theme.LIGHT}
                    width={280}
                    height={350}
                    skinTonesDisabled
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingMessageId(null)} className="text-[10px] hover:underline cursor-pointer">Cancel</button>
              <button onClick={handleSaveEdit} className="text-[10px] bg-white text-rose-500 px-3 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition-all cursor-pointer">Save</button>
            </div>
          </div>
        ) : (
          <>
            {msg.fileUrl && !msg.isDeleted && (
              <div className="mb-2">
                {fileError[msg.id] ? (
                  <div className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${isMe ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'}`}>
                    <FaFileCircleXmark size={24} className={isMe ? 'text-white' : 'text-gray-800'} />
                    <p className={`text-[10px] font-medium ${isMe ? 'text-white/90' : 'text-gray-800/90'}`}>Attachment Unavailable</p>
                  </div>
                ) : msg.fileType?.startsWith('image/') ? (
                  <Image
                    src={getFullFileUrl(msg.fileUrl)}
                    alt={msg.fileName || 'Attachment'}
                    width={250}
                    height={200}
                    className="max-w-[250px] w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity outline-none"
                    onClick={() => !fileError[msg.id] && setActivePreview({ url: getFullFileUrl(msg.fileUrl), type: msg.fileType! })}
                    onError={() => setMediaError(msg.id)}
                    onLoad={() => {
                      setTimeout(() => {
                        if (!showScrollBottom) scrollToBottom();
                      }, 100);
                    }}
                  />
                ) : msg.fileType?.startsWith('video/') ? (
                  <div className="relative group max-w-[250px]">
                    <video
                      src={getFullFileUrl(msg.fileUrl)}
                      className="w-full h-auto rounded-lg"
                      muted
                      onError={() => setMediaError(msg.id)}
                      onLoadedData={() => {
                        setTimeout(() => {
                          if (!showScrollBottom) scrollToBottom();
                        }, 100);
                      }}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all rounded-lg cursor-pointer"
                      onClick={() => !fileError[msg.id] && setActivePreview({ url: getFullFileUrl(msg.fileUrl), type: msg.fileType! })}
                    >
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'
                      } cursor-pointer hover:bg-opacity-80 transition-all`}
                    onClick={() => !fileError[msg.id] && window.open(getFullFileUrl(msg.fileUrl), '_blank')}
                  >
                    <div className="shrink-0">
                      {getFileIcon(msg.fileType, !!isMe)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-gray-800'}`}>{msg.fileName}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {msg.text && (
              <p className={`break-words whitespace-pre-wrap ${isOnlyEmojis(msg.text) ? 'text-2xl' : 'text-sm'} ${msg.isDeleted ? `italic ${isMe ? 'text-white/70' : 'text-gray-400'}` : ''}`}>{msg.text}</p>
            )}
            <div className={`flex justify-end items-center gap-1.5 mt-1 text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
              {msg.isEdited && !msg.isDeleted && <span>(edited)</span>}
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ChatsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const { socket, onlineUsers } = useSocketContext();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ conversations: Conversation[]; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [activePreview, setActivePreview] = useState<{ url: string; type: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<Record<string, boolean>>({});
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef(false);
  const lastProcessedQueryIdRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      const userId = user?.id;
      const mapped: Conversation[] = res.conversations.map((c: { _id?: string; id?: string; participants: string[]; participantsData?: { _id: string; name: string }[]; lastMessageText?: string; lastMessageTime?: string; unreadCount?: Record<string, number> }) => {
        const otherParticipant = c.participantsData?.find((p) => String(p._id) !== String(userId));
        const isSelected = selectedConversation && (String(selectedConversation.id) === String(c._id) || String(selectedConversation.id) === String(c.id));

        return {
          id: String(c._id || c.id),
          participants: c.participants,
          lastMessageText: c.lastMessageText,
          lastMessageTime: c.lastMessageTime,
          unreadCount: isSelected && userId
            ? { ...c.unreadCount, [userId]: 0 }
            : c.unreadCount,
          otherUser: otherParticipant ? {
            id: String(otherParticipant._id),
            name: otherParticipant.name,
          } : undefined
        };
      });
      setConversations(mapped);
      if (userId) {
        const totalUnread = mapped.reduce((acc: number, conv: Conversation) => acc + (conv.unreadCount?.[userId] || 0), 0);
        dispatch(setUnreadCount(totalUnread));
      }
    } catch (err) {
      utterToast.error(errorHandler(err));
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedConversation, dispatch]);

  const handleSelectConversation = useCallback((conv: Conversation | null, targetMsgId?: string) => {
    setSelectedConversation(conv);

    if (conv) {
      setSearchResults(null);
      setSearchQuery('');
      if (targetMsgId) {
        setHighlightedMessageId(targetMsgId);
        isJumpingRef.current = true;
      } else {
        isJumpingRef.current = false;
      }
    }
    if (conv && conv.id !== 'new') {
      const userId = user?.id;
      if (!userId) return;
      const currentUnread = conv.unreadCount?.[userId] || 0;
      if (currentUnread > 0) {
        const updatedConversations = conversations.map(c =>
          c.id === conv.id
            ? { ...c, unreadCount: { ...c.unreadCount, [userId]: 0 } }
            : c
        );
        setConversations(updatedConversations);
        const totalUnread = updatedConversations.reduce((acc, c) => acc + (c.unreadCount?.[userId] || 0), 0);
        dispatch(setUnreadCount(totalUnread));
      }
    }
  }, [conversations, user?.id, dispatch]);

  const fetchMessages = useCallback(async (convId: string, pageNum: number = 1, targetId?: string) => {
    if (convId === 'new') return;
    setMessagesLoading(true);
    try {
      const res = await getMessages(convId, {
        page: targetId ? undefined : pageNum,
        limit: 30,
        targetId
      });
      setMessages(res.messages);
      setPage(res.page);
      setHasMore(res.messages.length >= 30);
      fetchConversations();
    } catch (err) {
      utterToast.error(errorHandler(err));
    } finally {
      setMessagesLoading(false);
    }
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.id !== 'new') {
      fetchMessages(selectedConversation.id, 1, highlightedMessageId || undefined);
    } else if (selectedConversation?.id === 'new') {
      setMessages([]);
      setPage(1);
      setHasMore(false);
    }
  }, [selectedConversation, fetchMessages, highlightedMessageId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  useEffect(() => {
    if (socket) {
      const onReceiveMessage = () => {
        fetchConversations();
        if (selectedConversation?.id) {
          fetchMessages(selectedConversation.id, 1);
        }
      };

      const onMessageEdited = () => {
        fetchConversations();
        if (selectedConversation?.id) {
          fetchMessages(selectedConversation.id, 1);
        }
      };

      const onMessageDeleted = () => {
        fetchConversations();
        if (selectedConversation?.id) {
          fetchMessages(selectedConversation.id, 1);
        }
      };

      socket.on('receive_message', onReceiveMessage);
      socket.on('message_edited', onMessageEdited);
      socket.on('message_deleted', onMessageDeleted);

      return () => {
        socket.off('receive_message', onReceiveMessage);
        socket.off('message_edited', onMessageEdited);
        socket.off('message_deleted', onMessageDeleted);
      };
    }
  }, [socket, selectedConversation, fetchConversations, fetchMessages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (attachmentRef.current && !attachmentRef.current.contains(event.target as Node)) {
        setShowAttachmentOptions(false);
      }
      const editEmojiBtn = document.getElementById('edit-emoji-btn');
      const editEmojiPicker = document.getElementById('edit-emoji-picker-container');
      if (editEmojiBtn && !editEmojiBtn.contains(event.target as Node) && (!editEmojiPicker || !editEmojiPicker.contains(event.target as Node))) {
        setShowEditEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (page === 1 && !isJumpingRef.current && !messagesLoading) {
      scrollToBottom();
    }
  }, [messages, page, messagesLoading]);

  useEffect(() => {
    if (highlightedMessageId && messages.length > 0) {
      const element = document.getElementById(`msg-${highlightedMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const timer = setTimeout(() => {
          setHighlightedMessageId(null);
          isJumpingRef.current = false;
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [messages, highlightedMessageId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop === 0 && hasMore && !isFetchingMore && !messagesLoading && selectedConversation?.id !== 'new') {
      loadMoreMessages();
    }
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
  };

  const loadMoreMessages = async () => {
    if (!selectedConversation || selectedConversation.id === 'new' || !hasMore || isFetchingMore) return;

    setIsFetchingMore(true);
    const container = messagesContainerRef.current;
    const oldScrollHeight = container?.scrollHeight || 0;

    try {
      const nextPage = page + 1;
      const res = await getMessages(selectedConversation.id, { page: nextPage });

      if (res.messages.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...res.messages, ...prev]);
        setPage(nextPage);
        if (res.messages.length < 30) setHasMore(false);

        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
          }
        }, 0);
      }
    } catch (err) {
      utterToast.error(errorHandler(err));
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !selectedConversation.otherUser) return;

    try {
      let fileUrl, fileType, fileName;
      if (selectedFile) {
        setUploadProgress(true);
        const uploadRes = await uploadAttachment(selectedFile);
        fileUrl = uploadRes.url;
        fileType = uploadRes.fileType;
        fileName = uploadRes.fileName;
      }

      const res = await sendMessage(
        selectedConversation.otherUser.id,
        newMessage.trim() || undefined,
        fileUrl,
        fileType,
        fileName
      );

      setMessages((prev) => [...prev, res.message]);
      setNewMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      setUploadProgress(false);

      socket?.emit('send_message', {
        receiverId: selectedConversation.otherUser.id,
        message: res.message
      });

      fetchConversations();
    } catch (err) {
      utterToast.error(errorHandler(err));
    }
  };

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || editingMessageId === messageId) return;

    e.preventDefault();
    e.stopPropagation();

    let x, y;
    if ('clientX' in e) {
      x = e.clientX;
      y = e.clientY;
    } else {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }

    const menuWidth = 260;
    const menuHeight = 220;
    const padding = 16;

    x = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - menuHeight - padding));

    setContextMenu({ x, y, messageId });
  };

  const handleEditMessage = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      setEditingMessageId(messageId);
      setEditValue(msg.text);
    }
    setContextMenu(null);
  };

  const handleCopyMessage = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      navigator.clipboard.writeText(msg.text);
      utterToast.success('Message copied to clipboard');
    }
    setContextMenu(null);
  };

  const handleSaveFile = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg?.fileUrl) {
      try {
        const url = getFullFileUrl(msg.fileUrl);
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = msg.fileName || 'file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(getFullFileUrl(msg.fileUrl), '_blank');
      }
    }
    setContextMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editValue.trim()) return;
    try {
      const res = await editMessage(editingMessageId, editValue);
      setMessages((prev) => prev.map((m) => m.id === editingMessageId ? res.message : m));
      socket?.emit('edit_message', {
        receiverId: selectedConversation?.otherUser?.id,
        message: res.message
      });
      setEditingMessageId(null);
      fetchConversations();
    } catch (err) {
      utterToast.error(errorHandler(err));
    }
  };

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const confirmTitle = forEveryone ? 'Delete for Everyone?' : 'Delete for Me?';
    const confirmText = forEveryone
      ? 'This will delete the message for both you and the recipient.'
      : 'This will only remove the message from your view.';

    utterAlert({
      title: confirmTitle,
      text: confirmText,
      icon: 'warning',
      showCancel: true,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const res = await deleteMessage(messageId, forEveryone);
          setMessages((prev) => prev.map((m) => m.id === messageId ? res.message : m));
          socket?.emit('delete_message', {
            receiverId: selectedConversation?.otherUser?.id,
            message: res.message
          });
          setContextMenu(null);
          fetchConversations();
          utterToast.success(forEveryone ? 'Message deleted for everyone' : 'Message hidden');
        } catch (err) {
          utterToast.error(errorHandler(err));
        }
      }
    });
  };

  const selectOrStartChat = useCallback((otherUser: User) => {
    const existing = conversations.find((c) => String(c.otherUser?.id) === String(otherUser.id));
    if (existing) {
      handleSelectConversation(existing);
    } else {
      if (!user?.id) return;
      handleSelectConversation({
        id: 'new',
        participants: [user.id, otherUser.id],
        otherUser,
      });
    }
    setSearchResults(null);
    setSearchQuery('');
  }, [conversations, user?.id, handleSelectConversation]);

  const isMessageEditable = (createdAt: string) => {
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    return Date.now() - new Date(createdAt).getTime() < FIFTEEN_MINUTES;
  };

  const isWithinTwoDays = (createdAt: string) => {
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(createdAt).getTime() < TWO_DAYS;
  };
  
  const formatDividerDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = dNow.getTime() - dDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const searchParams = useSearchParams();
  const userIdFromQuery = searchParams.get('userId');

  useEffect(() => {
    if (userIdFromQuery && !loading && conversations.length >= 0 && userIdFromQuery !== lastProcessedQueryIdRef.current) {
      if (selectedConversation && String(selectedConversation.otherUser?.id) === userIdFromQuery) {
        lastProcessedQueryIdRef.current = userIdFromQuery;
        return;
      }

      const existing = conversations.find(c => String(c.otherUser?.id) === userIdFromQuery);
      if (existing) {
        setSelectedConversation(existing);
        lastProcessedQueryIdRef.current = userIdFromQuery;
      } else {
        (async () => {
          try {
            const exactRes = await searchChat({ q: userIdFromQuery });
            const found = exactRes.users.find((u: { id: string; name: string }) => String(u.id) === userIdFromQuery);
            if (found) {
              selectOrStartChat({
                id: found.id,
                name: found.name,
              });
              lastProcessedQueryIdRef.current = userIdFromQuery;
            }
          } catch { }
        })();
      }
    } else if (!userIdFromQuery && lastProcessedQueryIdRef.current !== null) {
      setSelectedConversation(null);
      lastProcessedQueryIdRef.current = null;
    }
  }, [userIdFromQuery, conversations, loading, selectedConversation, selectOrStartChat]);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      return;
    }

    const query = val.toLowerCase();

    const matchingConvs = conversations.filter(c =>
      c.otherUser?.name.toLowerCase().includes(query)
    );

    try {
      const res = await searchChat({ q: val });
      setSearchResults({
        conversations: matchingConvs,
        messages: res.messages.filter((msg: Message) =>
          conversations.some(c => c.id === msg.conversationId)
        )
      });
    } catch {
      setSearchResults({ conversations: matchingConvs, messages: [] });
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const onEditEmojiClick = (emojiData: EmojiClickData) => {
    setEditValue(prev => prev + emojiData.emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const limitMB = isVideo ? 50 : 10;
      const limitBytes = limitMB * 1024 * 1024;

      if (file.size > limitBytes) {
        utterToast.error(`File too large (max ${limitMB}MB for ${isVideo ? 'videos' : 'images/documents'})`);
        return;
      }

      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
    e.target.value = '';
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = (type?: string, isMe?: boolean) => {
    if (!type) return <FaFile size={28} />;
    if (type.startsWith('image/')) return <FaFileImage size={28} className={isMe ? 'text-white' : 'text-blue-500'} />;
    if (type === 'application/pdf') return <FaFilePdf size={28} className={isMe ? 'text-white' : 'text-rose-500'} />;
    if (type.includes('word')) return <FaFileWord size={28} className={isMe ? 'text-white' : 'text-blue-600'} />;
    if (type.includes('zip') || type.includes('rar')) return <FaFileArchive size={28} className={isMe ? 'text-white' : 'text-purple-500'} />;
    return <FaFileAlt size={28} className={isMe ? 'text-white' : 'text-gray-500'} />;
  };

  const getFullFileUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_S3_OBJECT_URL;
    return `${baseUrl}/${url}`;
  };

  const setMediaError = (id: string) => {
    setFileError(prev => ({ ...prev, [id]: true }));
  };

  const startVideoCall = () => {
    if (!selectedConversation || !selectedConversation.otherUser || !socket) return;

    const callId = Date.now().toString();
    socket.emit('initiate_call', {
      receiverId: selectedConversation.otherUser.id,
      callerId: user?.id,
      callerName: user?.name,
      signalData: {
        bookingId: selectedConversation.id,
        callId: callId,
        type: 'chat',
        otherId: user?.id,
      }
    });

    router.push(`/video-call/${selectedConversation.id}?role=user&type=chat&otherId=${selectedConversation.otherUser.id}&callId=${callId}&otherName=${encodeURIComponent(selectedConversation.otherUser.name)}`);
  };

  const handleReportSubmit = async (type: string, description: string) => {
    if (!selectedConversation?.otherUser) return;
    setIsReporting(true);
    try {
      const lastMessages = messages.slice(-5).map(m => ({
        senderId: m.senderId,
        text: m.text || '',
        timestamp: new Date(m.createdAt),
        fileUrl: m.fileUrl,
        fileType: m.fileType,
        fileName: m.fileName
      }));

      await createAbuseReport({
        reportedId: selectedConversation.otherUser.id,
        type,
        description,
        messages: lastMessages,
        channel: 'chat'
      });

      utterToast.success('Abuse report submitted successfully');
      setIsReportModalOpen(false);
    } catch (err) {
      utterToast.error(errorHandler(err));
    } finally {
      setIsReporting(false);
    }
  };

  const isOnline = (userId: string) => onlineUsers.has(userId);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <>
      <div className="w-full max-w-7xl mx-auto sm:px-4 md:px-6 lg:px-8">
        <div className="flex h-[calc(100vh-64px)] md:mt-16 mt-[64px] bg-white sm:border-l sm:border-r border-gray-100 overflow-hidden">
          {/* Sidebar */}
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-100 flex-col bg-gray-50/30 shrink-0`}>
            <div className="p-4 border-b border-gray-100 bg-white">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Chats</h2>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search chats or messages..."
                  className="w-full pl-10 pr-10 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none transition-all placeholder:text-gray-400 text-black"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <FaTimes size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {searchResults ? (
                <div className="p-2">
                  {searchResults.conversations.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">Conversations</p>
                      {searchResults.conversations.map(conv => (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className="cursor-pointer w-full flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all text-left"
                        >
                          <div className="relative">
                            <Avatar
                              user={{
                                id: conv.otherUser?.id,
                                name: conv.otherUser?.name || '',
                                role: 'user'
                              }}
                              size="md"
                              interactive={false}
                            />
                            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${isOnline(String(conv.otherUser?.id)) ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-800 truncate">{conv.otherUser?.name}</h4>
                            <p className="text-[11px] text-gray-500 truncate">{conv.lastMessageText}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {searchResults.conversations.length === 0 && searchResults.messages.length === 0 && (
                    <p className="text-[10px] text-gray-400 px-3 py-1 text-center mt-4">No results found</p>
                  )}

                  {searchResults.messages.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 mt-4">Messages</p>
                      {searchResults.messages.map(msg => {
                        const conv = conversations.find(c => c.id === msg.conversationId);
                        if (!conv) return null;
                        return (
                          <button
                            key={msg.id}
                            onClick={() => handleSelectConversation(conv, msg.id)}
                            className="cursor-pointer w-full flex flex-col gap-1 p-3 hover:bg-white rounded-xl transition-all text-left"
                          >
                            <div className="flex justify-between items-baseline">
                              <h4 className="text-xs font-bold text-gray-800">{conv.otherUser?.name}</h4>
                              <span className="text-[10px] text-gray-400">
                                {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1 italic">&quot;{msg.text}&quot;</p>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`cursor-pointer w-full flex items-center gap-3 p-4 border-b border-gray-50 transition-all text-left ${selectedConversation?.id === conv.id ? 'bg-white shadow-sm z-10' : 'hover:bg-white/50'
                      }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        user={{
                          id: conv.otherUser?.id,
                          name: conv.otherUser?.name || '',
                          role: 'user'
                        }}
                        size="sm"
                        interactive={false}
                      />
                      {conv.otherUser && (
                        <div className={`absolute -bottom-0.5 right-0 w-3 h-3 border-2 border-white rounded-full ${isOnline(String(conv.otherUser.id)) ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-sm font-bold text-gray-800 truncate">{conv.otherUser?.name}</h4>
                        {conv.lastMessageTime && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessageText || 'No messages yet'}</p>
                    </div>
                    {user?.id && (conv.unreadCount?.[user.id] ?? 0) > 0 && (
                      <div className="bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount?.[user.id]}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white min-w-0 relative`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center shadow-sm z-20">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSelectConversation(null)}
                      className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <FaArrowLeft size={18} />
                    </button>
                    <Avatar
                      user={{
                        id: selectedConversation.otherUser?.id,
                        name: selectedConversation.otherUser?.name || '',
                        role: 'user'
                      }}
                      size="sm"
                      editable={false}
                      interactive={true}
                    />
                    <div>
                      <h3 className="text-base font-bold text-gray-800 leading-tight">{selectedConversation.otherUser?.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                        {selectedConversation.otherUser && onlineUsers.has(String(selectedConversation.otherUser.id)) ? (
                          <div className="flex items-center gap-1.5">
                            <FaCircle className="text-green-500" size={8} />
                            <span>Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <FaCircle className="text-red-500" size={8} />
                            <span>Offline</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startVideoCall}
                      className="cursor-pointer p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl transition-all shadow-sm active:scale-95"
                      title="Start Video Call"
                    >
                      <FaVideo size={18} />
                    </button>
                    {user?.role === 'user' && messages.length > 0 && (
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="cursor-pointer p-3 bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm active:scale-95"
                        title="Report Abuse"
                      >
                        <MdReportProblem size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto space-y-2 py-6 bg-gray-50/20 no-scrollbar scroll-smooth"
                  onScroll={handleScroll}
                >
                  {isFetchingMore && (
                    <div className="flex justify-center py-2">
                      <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                  {messagesLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-400">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <p className="text-sm font-medium">Say hello to {selectedConversation.otherUser?.name}!</p>
                    </div>
                  ) : (
                    (() => {
                      let lastDateString = '';
                      return messages.filter(msg => !msg.hiddenBy?.includes(user?.id || '')).map((msg, idx) => {
                        const currentDateString = new Date(msg.createdAt).toDateString();
                        const showDivider = currentDateString !== lastDateString;
                        lastDateString = currentDateString;

                        return (
                          <React.Fragment key={msg.id || idx}>
                            {showDivider && (
                              <div className="flex justify-center my-6">
                                <span className="px-4 py-1.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full uppercase tracking-widest leading-none select-none">
                                  {formatDividerDate(msg.createdAt)}
                                </span>
                              </div>
                            )}
                            <MessageBubble
                              msg={msg}
                              isMe={user?.id === msg.senderId}
                              isHighlighted={highlightedMessageId === msg.id}
                              editingMessageId={editingMessageId}
                              editValue={editValue}
                              setEditValue={setEditValue}
                              setEditingMessageId={setEditingMessageId}
                              handleContextMenu={handleContextMenu}
                              handleSaveEdit={handleSaveEdit}
                              fileError={fileError}
                              setMediaError={setMediaError}
                              setActivePreview={setActivePreview}
                              getFullFileUrl={getFullFileUrl}
                              getFileIcon={getFileIcon}
                              showEditEmojiPicker={showEditEmojiPicker}
                              setShowEditEmojiPicker={setShowEditEmojiPicker}
                              onEditEmojiClick={onEditEmojiClick}
                              scrollToBottom={scrollToBottom}
                              showScrollBottom={showScrollBottom}
                            />
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollBottom && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 p-3 bg-white text-rose-500 border border-gray-100 rounded-full shadow-lg hover:bg-rose-50 transition-all active:scale-95 animate-bounce flex items-center justify-center cursor-pointer group"
                    title="Scroll to bottom"
                  >
                    <FaChevronDown size={14} />
                  </button>
                )}

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  {selectedFile && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                          {filePreview ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 relative group">
                              <Image src={filePreview} alt="preview" fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-100">
                              {getFileIcon(selectedFile.type, false)}
                            </div>
                          )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button onClick={removeFile} className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-400 hover:text-rose-500 active:scale-95 cursor-pointer">
                        <FaTimes size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <div className="flex gap-1 mb-2">
                      <div className="relative" ref={emojiPickerRef}>
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${showEmojiPicker ? 'text-rose-500 bg-rose-50' : 'text-gray-400 hover:text-rose-500 hover:bg-gray-50'}`}
                        >
                          <FaRegSmile size={20} />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 origin-bottom-left">
                            <EmojiPicker
                              onEmojiClick={onEmojiClick}
                              theme={Theme.LIGHT}
                              width={320}
                              height={400}
                              skinTonesDisabled
                            />
                          </div>
                        )}
                      </div>
                      <div className="relative" ref={attachmentRef}>
                        <button
                          onClick={() => setShowAttachmentOptions(!showAttachmentOptions)}
                          className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${showAttachmentOptions ? 'text-rose-500 bg-rose-50' : 'text-gray-400 hover:text-rose-500 hover:bg-gray-50'}`}
                        >
                          <FaPaperclip size={18} />
                        </button>
                        {showAttachmentOptions && (
                          <div className="absolute bottom-12 left-0 z-50 bg-white shadow-2xl rounded-2xl border border-gray-100 p-2 min-w-[140px] flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-200">
                            {[
                              { label: 'Image', icon: FaFileImage, color: 'text-blue-500', accept: 'image/*' },
                              { label: 'Video', icon: FaVideo, color: 'text-rose-500', accept: 'video/*' },
                              { label: 'Document', icon: FaFileAlt, color: 'text-purple-500', accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt' },
                            ].map((opt) => (
                              <button
                                key={opt.label}
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.accept = opt.accept;
                                    fileInputRef.current.click();
                                  }
                                  setShowAttachmentOptions(false);
                                }}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all text-xs font-medium text-gray-700 cursor-pointer"
                              >
                                <opt.icon size={16} className={opt.color} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    <textarea
                      ref={textareaRef}
                      placeholder="Type a message..."
                      className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500/50 outline-none transition-all placeholder:text-gray-400 shadow-inner text-black resize-none max-h-32 min-h-[46px] overflow-y-auto no-scrollbar"
                      rows={1}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={(!newMessage.trim() && !selectedFile) || uploadProgress}
                      className="cursor-pointer h-[46px] w-[46px] shrink-0 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 disabled:opacity-40 active:scale-95 flex items-center justify-center relative overflow-hidden"
                    >
                      {uploadProgress ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <FaPaperPlane size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/10">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                  <FaPaperPlane className="text-rose-500/30" size={32} />
                </div>
                <p className="text-xs max-w-xs text-center mt-2 leading-relaxed">Select a conversation or search for members to start chatting.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const msg = messages.find((m) => m.id === contextMenu.messageId);
            if (!msg) return null;
            return (
              <>
                {!msg.isDeleted && (
                  <>
                    {/* Copy Option */}
                    {msg.text && (
                      <button
                        onClick={() => handleCopyMessage(msg.id)}
                        className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap"
                      >
                        <MdContentCopy className="text-gray-400" /> Copy
                      </button>
                    )}

                    {/* Save Option */}
                    {msg.fileUrl && !fileError[msg.id] && (
                      <button
                        onClick={() => handleSaveFile(msg.id)}
                        className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap"
                      >
                        <FaDownload className="text-gray-400" size={16} /> Save
                      </button>
                    )}

                    {/* Edit Option (Only for sender and text-only) */}
                    {msg.senderId === user?.id && !msg.fileUrl && isMessageEditable(msg.createdAt) && (
                      <button
                        onClick={() => handleEditMessage(msg.id)}
                        className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap"
                      >
                        <MdEdit className="text-gray-400" /> Edit
                      </button>
                    )}
                  </>
                )}

                {/* Delete Options */}
                <button
                  onClick={() => handleDeleteMessage(msg.id, false)}
                  className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-gray-50 text-left whitespace-nowrap"
                >
                  <MdDelete className="text-rose-400" /> Delete for Me
                </button>

                {!msg.isDeleted && !fileError[msg.id] && msg.senderId === user?.id && isWithinTwoDays(msg.createdAt) && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id, true)}
                    className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-gray-50 text-left whitespace-nowrap"
                  >
                    <MdDelete className="text-rose-400" /> Delete for Everyone
                  </button>
                )}


              </>
            );
          })()}
        </div>
      )}

      {/* Global click to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        />
      )}

      {/* Media Preview Modal */}
      {activePreview && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300 backdrop-blur-md bg-black/80"
          onClick={() => setActivePreview(null)}
        >
          <button
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90 z-[120]"
            onClick={() => setActivePreview(null)}
          >
            <FaTimes size={20} />
          </button>
          <div
            className="relative max-w-5xl w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {activePreview.type.startsWith('image/') ? (
              <Image
                src={activePreview.url}
                alt="Large preview"
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
                unoptimized
              />
            ) : (
              <video
                src={activePreview.url}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
                controls
                autoPlay
              />
            )}
          </div>
        </div>
      )}

      {selectedConversation && selectedConversation.otherUser && (
        <CreateAbuseReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          reportedName={selectedConversation.otherUser.name}
          isLoading={isReporting}
        />
      )}
    </>
  );
}
