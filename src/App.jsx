import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { FileUp, Download, ShieldCheck, Trash2, Bell, Lock, RefreshCw, Link2, Plus, ChevronDown, ChevronUp, Info } from 'lucide-react';

// --- CONFIGURATION ---
// Deployed version (Netlify/Vercel) ke liye niche di gayi details ko replace karein:
const firebaseConfig = {
  apiKey: "AIzaSyA40O8Mu2FrUWPvQZ6IVR1pUvdMF5uluX4",
  authDomain: "file-share-cca26.firebaseapp.com",
  projectId: "file-share-cca26",
  storageBucket: "file-share-cca26.firebasestorage.app",
  messagingSenderId: "491732002658",
  appId: "1:491732002658:web:7e22fba802e2c5421aae3b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-secure-vault-prod';

export default function App() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [textLink, setTextLink] = useState('');
  const [shareType, setShareType] = useState('file');
  const [code, setCode] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [sharedItems, setSharedItems] = useState([]);
  const [enteredCode, setEnteredCode] = useState({});
  const [status, setStatus] = useState({ text: '', type: '' });
  const [isShareOpen, setIsShareOpen] = useState(false);

  const FILE_SIZE_LIMIT = 3 * 1024 * 1024; 

  // RULE 3: Auth Before Queries
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        if (error.message.includes('api-key-not-valid')) {
           notify("Firebase API Key missing ya galat hai. App.jsx check karein.", "error");
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // RULE 1 & 2: Firestore Operations
  useEffect(() => {
    if (!user) return;
    
    const collectionPath = collection(db, 'artifacts', appId, 'public', 'data', 'vault_data');
    
    const unsubscribe = onSnapshot(collectionPath, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSharedItems(items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => {
      console.error("Firestore Error:", err);
    });
    
    return () => unsubscribe();
  }, [user]);

  const notify = (text, type = 'info') => {
    setStatus({ text, type });
    if (type !== 'error') setTimeout(() => setStatus({ text: '', type: '' }), 4000);
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!user) return notify("Connecting...", "error");
    if (code.length !== 4) return notify("4-digit PIN zaroori hai!", "error");
    if (shareType === 'file' && !file) return notify("File chunein!", "error");
    if (shareType === 'file' && file.size > FILE_SIZE_LIMIT) return notify("File 3MB se badi hai!", "error");

    setIsUploading(true);
    notify("Processing...", "info");

    try {
      let dataToSave = { 
        type: shareType, 
        pin: code, 
        owner: user.uid, 
        createdAt: serverTimestamp() 
      };

      if (shareType === 'file') {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          dataToSave = { 
            ...dataToSave, 
            name: file.name, 
            content: reader.result, 
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB' 
          };
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'vault_data'), dataToSave);
          resetForm();
        };
      } else {
        if (!textLink.trim()) throw new Error("Link likhein");
        dataToSave = { ...dataToSave, name: "Shared Link", content: textLink, size: 'Text' };
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'vault_data'), dataToSave);
        resetForm();
      }
    } catch (error) { 
      notify(error.message, "error"); 
      setIsUploading(false); 
    }
  };

  const resetForm = () => {
    setFile(null); 
    setTextLink(''); 
    setCode(''); 
    setIsShareOpen(false); 
    setIsUploading(false);
    notify("Share ho gaya!", "success");
    if(document.getElementById('file-input')) document.getElementById('file-input').value = '';
  };

  const handleAccess = (item) => {
    if (enteredCode[item.id] === item.pin) {
      if (item.type === 'file') {
        const a = document.createElement('a'); 
        a.href = item.content; 
        a.download = item.name; 
        a.click();
        notify("Download shuru...", "success");
      } else {
        const temp = document.createElement('textarea');
        temp.value = item.content;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        notify("Copied!", "success");
        if (item.content.startsWith('http')) window.open(item.content, '_blank');
      }
    } else { 
      notify("Ghalat PIN!", "error"); 
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans pb-24 selection:bg-blue-500/30">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center p-5 bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-zinc-800">
           <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-xl">
               <ShieldCheck size={20} className="text-white" />
             </div>
             <h1 className="font-bold uppercase tracking-widest text-sm">Secure Vault</h1>
           </div>
           <button onClick={() => window.location.reload()} className="hover:rotate-180 transition-transform duration-500 p-1">
             <RefreshCw size={18} className="text-zinc-500" />
           </button>
        </header>

        {status.text && (
          <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-zinc-800 border-zinc-700 text-blue-400'
          }`}>
            <Bell size={16} /> {status.text}
          </div>
        )}

        {/* Inbox */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Received Items</h2>
            <span className="text-[9px] text-zinc-600">3MB Max</span>
          </div>
          
          {sharedItems.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-zinc-800 rounded-3xl">
              <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest italic">No files found</p>
            </div>
          ) : (
            sharedItems.map(item => (
              <div key={item.id} className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 hover:border-zinc-700 transition-colors">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                  {item.type === 'file' ? <Download size={18} /> : <Link2 size={18} />}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold truncate text-zinc-200">{item.name}</p>
                  <p className="text-[9px] text-zinc-600 font-mono">{item.size}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input 
                    type="password" 
                    placeholder="PIN" 
                    maxLength="4" 
                    className="w-12 bg-black border border-zinc-800 rounded-lg text-center text-[10px] font-bold p-2 focus:outline-none focus:border-blue-500" 
                    onChange={e => setEnteredCode({...enteredCode, [item.id]: e.target.value})} 
                  />
                  <button onClick={() => handleAccess(item)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 shadow-lg shadow-blue-600/10">
                    Get
                  </button>
                  {item.owner === user?.uid && (
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vault_data', item.id))} className="p-1.5 text-zinc-700 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Toggle Share Panel */}
        <div className={`fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out ${isShareOpen ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]'}`}>
          <button 
            onClick={() => setIsShareOpen(!isShareOpen)} 
            className="w-full flex justify-between items-center px-10 h-16 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group"
          >
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1 rounded-md text-white group-hover:scale-110 transition-transform">
                <Plus size={14} />
              </div>
              <span>Share New Content</span>
            </div>
            {isShareOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} className="animate-bounce" />}
          </button>
          
          <div className="px-8 pb-10 space-y-6">
            <div className="flex bg-black p-1 rounded-2xl border border-zinc-800 w-fit mx-auto">
              <button type="button" onClick={() => setShareType('file')} className={`px-6 py-2 rounded-xl text-[9px] font-black tracking-widest transition-all ${shareType === 'file' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>FILE</button>
              <button type="button" onClick={() => setShareType('link')} className={`px-6 py-2 rounded-xl text-[9px] font-black tracking-widest transition-all ${shareType === 'link' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>LINK</button>
            </div>

            <form onSubmit={handleShare} className="space-y-4">
              {shareType === 'file' ? (
                <div className="relative group">
                  <input type="file" id="file-input" onChange={e => setFile(e.target.files[0])} className="hidden" />
                  <label htmlFor="file-input" className="w-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 p-8 rounded-3xl bg-black/50 cursor-pointer group-hover:border-blue-500/50 transition-all">
                    <FileUp size={30} className="text-zinc-700 mb-2 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold text-zinc-500 text-center">
                      {file ? file.name : "Select File (Max 3MB)"}
                    </span>
                  </label>
                </div>
              ) : (
                <textarea 
                  value={textLink} 
                  onChange={e => setTextLink(e.target.value)} 
                  className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs text-zinc-300 focus:outline-none focus:border-blue-500 min-h-[100px]" 
                  placeholder="Paste your link or message here..." 
                />
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    type="text" 
                    placeholder="PIN" 
                    maxLength="4" 
                    className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-center text-xs font-bold text-blue-400 focus:outline-none focus:border-blue-500" 
                    value={code} 
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))} 
                  />
                </div>
                <button 
                  disabled={isUploading || (!file && !textLink) || code.length < 4}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                  {isUploading ? "Uploading..." : "Share Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>
    </div>
  );
}
