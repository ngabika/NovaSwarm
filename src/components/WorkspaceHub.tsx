import React, { useState, useEffect } from "react";
import { 
  Loader2, 
  HardDrive, 
  Mail, 
  Calendar, 
  LogOut, 
  MessageSquare, 
  StickyNote, 
  Plus, 
  Send, 
  Trash2, 
  Pin, 
  Palette, 
  CheckSquare, 
  Search, 
  RefreshCw,
  Folder,
  MessageCircle,
  FileText
} from "lucide-react";
import { initAuth, googleSignIn, logout, getAccessToken } from "../lib/firebase";
import type { User } from "firebase/auth";

export function WorkspaceHub() {
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'drive' | 'chat' | 'keep'>('drive');

  // Drive state
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Google Chat state
  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Keep notes state
  const [keepNotes, setKeepNotes] = useState<any[]>([]);
  const [loadingKeep, setLoadingKeep] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("bg-slate-800");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNoteInputFocused, setIsNoteInputFocused] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token) {
      fetchKeepNotes();
      fetchChatSpaces();
      fetchDriveFiles();
    }
  }, [token]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setFiles([]);
    setChatSpaces([]);
    setSelectedSpace(null);
    setChatMessages([]);
    setKeepNotes([]);
  };

  // Google Drive
  const fetchDriveFiles = async () => {
    const t = await getAccessToken();
    if (!t) return;
    setLoadingFiles(true);
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=10', {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Google Keep Notes API Integration
  const fetchKeepNotes = async () => {
    setLoadingKeep(true);
    try {
      const res = await fetch('/api/keep');
      const data = await res.json();
      if (data.success) {
        setKeepNotes(data.notes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKeep(false);
    }
  };

  const addKeepNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    try {
      const res = await fetch('/api/keep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          color: noteColor,
          isPinned: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setKeepNotes(data.notes);
        setNoteTitle("");
        setNoteContent("");
        setNoteColor("bg-slate-800");
        setIsNoteInputFocused(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePinNote = async (id: string, currentPin: boolean) => {
    try {
      const res = await fetch(`/api/keep/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPin })
      });
      const data = await res.json();
      if (data.success) {
        setKeepNotes(data.notes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const changeNoteColor = async (id: string, color: string) => {
    try {
      const res = await fetch(`/api/keep/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color })
      });
      const data = await res.json();
      if (data.success) {
        setKeepNotes(data.notes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteKeepNote = async (id: string) => {
    try {
      const res = await fetch(`/api/keep/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setKeepNotes(data.notes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Google Chat API Integration
  const fetchChatSpaces = async () => {
    const t = await getAccessToken();
    if (!t) return;
    setLoadingSpaces(true);
    setChatError(null);
    try {
      const res = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (!res.ok) {
        throw new Error(`Google Chat API state code: ${res.status}`);
      }
      const data = await res.json();
      setChatSpaces(data.spaces || []);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Cannot access Google Chat API spaces.");
    } finally {
      setLoadingSpaces(false);
    }
  };

  const fetchSpaceMessages = async (spaceId: string) => {
    const t = await getAccessToken();
    if (!t) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceId}/messages`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (!res.ok) throw new Error("Failed to load Google Chat space messages");
      const data = await res.json();
      setChatMessages(data.messages || []);
      setSelectedSpace(spaceId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendSpaceMessage = async () => {
    if (!newMessageText.trim() || !selectedSpace) return;
    const t = await getAccessToken();
    if (!t) return;
    setIsSendingMessage(true);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpace}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newMessageText })
      });
      if (res.ok) {
        setNewMessageText("");
        fetchSpaceMessages(selectedSpace);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const createChatSpace = async () => {
    if (!newSpaceName.trim()) return;
    const t = await getAccessToken();
    if (!t) return;
    setIsCreatingSpace(true);
    try {
      const res = await fetch('https://chat.googleapis.com/v1/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spaceType: 'SPACE',
          displayName: newSpaceName
        })
      });
      if (res.ok) {
        setNewSpaceName("");
        fetchChatSpaces();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingSpace(false);
    }
  };

  const noteColors = [
    { class: "bg-slate-800 border-slate-700", name: "Dark" },
    { class: "bg-rose-950 border-rose-900/50 text-rose-200", name: "Red" },
    { class: "bg-emerald-950 border-emerald-900/50 text-emerald-200", name: "Green" },
    { class: "bg-amber-950 border-amber-900/50 text-amber-200", name: "Yellow" },
    { class: "bg-indigo-950 border-indigo-900/50 text-indigo-200", name: "Blue" },
    { class: "bg-fuchsia-950 border-fuchsia-900/50 text-fuchsia-200", name: "Purple" }
  ];

  if (needsAuth) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700/50 mb-2">
          <HardDrive className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2 font-sans tracking-tight">Connect Google Workspace</h2>
          <p className="text-slate-400 max-w-sm mb-6 text-sm">
            Sign in with Google to enable Keep, Chat, Drive, Docs, Gmail and full agent collaboration.
          </p>
        </div>
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-900 px-6 py-3 rounded-lg font-medium transition cursor-pointer shadow-sm disabled:opacity-50"
        >
          {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          )}
          Sign in with Google
        </button>
      </div>
    );
  }

  const pinnedNotes = keepNotes.filter(n => n.isPinned);
  const unpinnedNotes = keepNotes.filter(n => !n.isPinned && (
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          {user?.photoURL && (
            <img src={user.photoURL} referrerPolicy="no-referrer" alt="Avatar" className="w-12 h-12 rounded-full border border-slate-700" />
          )}
          <div>
            <h2 className="text-lg font-bold text-white font-sans">{user?.displayName}</h2>
            <p className="text-sm text-slate-400 font-mono">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-800 hover:border-red-900/50 hover:bg-red-950/20 cursor-pointer">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Workspace Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button 
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'drive' 
              ? 'border-blue-500 text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Folder className="w-4 h-4" /> Drive & Gmail
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'chat' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" /> Google Chat
        </button>
        <button 
          onClick={() => setActiveTab('keep')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'keep' 
              ? 'border-amber-500 text-amber-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <StickyNote className="w-4 h-4" /> Google Keep
        </button>
      </div>

      {/* Drive, Gmail, Calendar summary tab */}
      {activeTab === 'drive' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" /> Drive Access
              </h3>
              <button onClick={fetchDriveFiles} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1">
                {loadingFiles ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
              </button>
            </div>
            {loadingFiles ? (
              <p className="text-xs text-slate-500 animate-pulse py-2">Loading drive files...</p>
            ) : files.length > 0 ? (
              <ul className="text-xs space-y-2 text-slate-400">
                {files.map(f => (
                  <li key={f.id} className="truncate bg-slate-900/60 p-2 rounded border border-slate-800/40 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 py-2">No files fetched or drive empty.</p>
            )}
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-rose-400" /> Gmail Integration
            </h3>
            <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded border border-slate-800/40 leading-relaxed mb-3">
              Agents can compose, query, read, and delete emails directly through standard IMAP/SMTP pipelines.
            </p>
            <div className="text-2xs font-mono text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Active & Synced with Swarm Agent Core
            </div>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-400" /> Calendar Sync
            </h3>
            <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded border border-slate-800/40 leading-relaxed mb-3">
              Enables agents to query schedules and create meeting invitations automatically.
            </p>
            <div className="text-2xs font-mono text-blue-400 bg-blue-950/30 p-2 rounded border border-blue-900/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Google Calendar API Ready
            </div>
          </div>
        </div>
      )}

      {/* Google Chat Tab */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[500px]">
          {/* Space List */}
          <div className="md:col-span-4 bg-slate-950/50 rounded-xl border border-slate-800 p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" /> Chat Spaces
              </h3>
              <button onClick={fetchChatSpaces} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition cursor-pointer">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSpaces ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Create Space Form */}
            <div className="flex gap-2 mb-4 shrink-0">
              <input 
                type="text" 
                placeholder="New space name..."
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 grow"
              />
              <button 
                onClick={createChatSpace} 
                disabled={isCreatingSpace || !newSpaceName.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-1.5 rounded transition cursor-pointer"
              >
                {isCreatingSpace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </button>
            </div>

            {chatError && (
              <p className="text-2xs text-amber-500 bg-amber-950/20 p-2 rounded border border-amber-900/30 mb-2">{chatError}</p>
            )}

            {/* Spaces scroll box */}
            <div className="overflow-y-auto grow space-y-2 pr-1">
              {loadingSpaces ? (
                <p className="text-xs text-slate-500 py-4 animate-pulse text-center">Loading spaces...</p>
              ) : chatSpaces.length > 0 ? (
                chatSpaces.map(s => (
                  <button 
                    key={s.name}
                    onClick={() => fetchSpaceMessages(s.name)}
                    className={`w-full text-left p-2.5 rounded-lg border transition text-xs flex items-center gap-2 cursor-pointer ${
                      selectedSpace === s.name 
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-white font-medium' 
                        : 'bg-slate-900 border-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="truncate">{s.displayName || s.name}</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No spaces found. Make sure Google Chat is active on your account.
                </div>
              )}
            </div>
          </div>

          {/* Space Chat History */}
          <div className="md:col-span-8 bg-slate-950/50 rounded-xl border border-slate-800 p-4 flex flex-col h-full overflow-hidden">
            {selectedSpace ? (
              <>
                {/* Chat Title */}
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between shrink-0">
                  <h4 className="font-bold text-white text-sm">
                    {chatSpaces.find(s => s.name === selectedSpace)?.displayName || "Chat Space"}
                  </h4>
                  <span className="text-2xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                    Real-time
                  </span>
                </div>

                {/* Messages Container */}
                <div className="grow overflow-y-auto space-y-3 mb-4 pr-1 flex flex-col-reverse">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading messages...
                    </div>
                  ) : chatMessages.length > 0 ? (
                    [...chatMessages].reverse().map((m, idx) => (
                      <div key={m.name || idx} className="flex flex-col space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-xs text-emerald-400">{m.sender?.displayName || "System"}</span>
                          <span className="text-4xs text-slate-500 font-mono">
                            {m.createTime ? new Date(m.createTime).toLocaleTimeString() : ""}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/60 max-w-[90%] self-start leading-relaxed whitespace-pre-wrap">
                          {m.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs my-auto">
                      This space is empty. Start by typing a message below!
                    </div>
                  )}
                </div>

                {/* Send message form */}
                <div className="flex gap-2 shrink-0">
                  <textarea 
                    placeholder="Type a message to the space..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendSpaceMessage();
                      }
                    }}
                    rows={1}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 grow resize-none"
                  />
                  <button 
                    onClick={sendSpaceMessage}
                    disabled={isSendingMessage || !newMessageText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isSendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm space-y-2">
                <MessageCircle className="w-8 h-8 text-slate-700 animate-pulse" />
                <p>Select a Google Chat Space from the left menu to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Keep Notes Tab */}
      {activeTab === 'keep' && (
        <div className="space-y-6">
          {/* Top Row: Creator and Search */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Note Creator Box */}
            <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-md relative transition-all focus-within:ring-1 focus-within:ring-amber-500/50">
              {isNoteInputFocused && (
                <input 
                  type="text" 
                  placeholder="Title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-semibold text-white focus:outline-none mb-2"
                />
              )}
              <textarea 
                placeholder="Take a note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onFocus={() => setIsNoteInputFocused(true)}
                className="w-full bg-transparent border-none text-xs text-slate-300 focus:outline-none resize-none min-h-[40px]"
                rows={isNoteInputFocused ? 3 : 1}
              />
              
              {isNoteInputFocused && (
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-900">
                  {/* Colors selector */}
                  <div className="flex gap-1">
                    {noteColors.map(col => (
                      <button 
                        key={col.class}
                        onClick={() => setNoteColor(col.class)}
                        title={col.name}
                        className={`w-4 h-4 rounded-full border transition cursor-pointer ${col.class} ${
                          noteColor === col.class ? 'ring-2 ring-amber-400 scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsNoteInputFocused(false)} 
                      className="text-2xs text-slate-500 hover:text-slate-300 px-2 py-1 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addKeepNote}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-2xs px-3 py-1 rounded transition cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Save Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes display */}
          {loadingKeep ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* PINNED NOTES SECTION */}
              {pinnedNotes.length > 0 && (
                <div>
                  <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pinned</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {pinnedNotes.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 rounded-xl border flex flex-col justify-between shadow-sm relative group transition-all duration-250 ${n.color || "bg-slate-800 border-slate-700"}`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <h5 className="font-bold text-sm text-white truncate">{n.title || "Untitled"}</h5>
                            <button 
                              onClick={() => togglePinNote(n.id, n.isPinned)}
                              className="text-amber-400 hover:text-amber-300 p-0.5 rounded transition cursor-pointer shrink-0"
                            >
                              <Pin className="w-3.5 h-3.5 fill-amber-400" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-2 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {/* Color bar on hover */}
                          <div className="flex gap-1">
                            {noteColors.map(col => (
                              <button 
                                key={col.class}
                                onClick={() => changeNoteColor(n.id, col.class)}
                                className={`w-3 h-3 rounded-full border border-white/10 ${col.class} cursor-pointer`}
                              />
                            ))}
                          </div>
                          <button 
                            onClick={() => deleteKeepNote(n.id)}
                            className="text-slate-400 hover:text-red-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UNPINNED NOTES SECTION */}
              <div>
                {pinnedNotes.length > 0 && <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-3">Others</h4>}
                {unpinnedNotes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {unpinnedNotes.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 rounded-xl border flex flex-col justify-between shadow-sm relative group transition-all duration-250 ${n.color || "bg-slate-800 border-slate-700"}`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <h5 className="font-bold text-sm text-white truncate">{n.title || "Untitled"}</h5>
                            <button 
                              onClick={() => togglePinNote(n.id, n.isPinned)}
                              className="text-slate-400 hover:text-amber-400 p-0.5 rounded transition cursor-pointer shrink-0"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-2 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {/* Color bar on hover */}
                          <div className="flex gap-1">
                            {noteColors.map(col => (
                              <button 
                                key={col.class}
                                onClick={() => changeNoteColor(n.id, col.class)}
                                className={`w-3 h-3 rounded-full border border-white/10 ${col.class} cursor-pointer`}
                              />
                            ))}
                          </div>
                          <button 
                            onClick={() => deleteKeepNote(n.id)}
                            className="text-slate-400 hover:text-red-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-950/20 border border-slate-800/50 rounded-xl">
                    <StickyNote className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs text-slate-500">No notes found. Create your first Google Keep note!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
