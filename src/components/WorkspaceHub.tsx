import React, { useState, useEffect } from "react";
import { Loader2, HardDrive, Mail, Calendar, LogOut } from "lucide-react";
import { initAuth, googleSignIn, logout, getAccessToken } from "../lib/firebase";
import type { User } from "firebase/auth";

export function WorkspaceHub() {
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

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
  };

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

  if (needsAuth) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700/50 mb-2">
          <HardDrive className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Google Workspace</h2>
          <p className="text-slate-400 max-w-sm mb-6 text-sm">
            Sign in to enable Drive, Calendar, Gmail, Docs, Sheets, and more for NovaSwarm.
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

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          {user?.photoURL && (
            <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border border-slate-700" />
          )}
          <div>
            <h2 className="text-lg font-bold text-white">{user?.displayName}</h2>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-800 hover:border-red-900/50 hover:bg-red-950/20">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" /> Drive Access
            </h3>
            <button onClick={fetchDriveFiles} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded">
              Fetch Latest
            </button>
          </div>
          {loadingFiles ? (
            <p className="text-xs text-slate-500 animate-pulse">Loading drive files...</p>
          ) : files.length > 0 ? (
            <ul className="text-sm space-y-2 text-slate-400">
              {files.map(f => (
                <li key={f.id} className="truncate bg-slate-900 px-2 py-1.5 rounded">{f.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No files fetched or drive empty.</p>
          )}
        </div>

        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-rose-400" /> Gmail Integration
          </h3>
          <p className="text-xs text-slate-500 text-center py-4 bg-slate-900 rounded border border-slate-800/50">
            Agents can now compose and read emails via MCP.
          </p>
        </div>

        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-blue-400" /> Calendar Sync
          </h3>
          <p className="text-xs text-slate-500 text-center py-4 bg-slate-900 rounded border border-slate-800/50">
            Agents have full access to schedule tasks.
          </p>
        </div>
      </div>
    </div>
  );
}
