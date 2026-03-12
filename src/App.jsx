import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { ShieldCheck, RefreshCw } from 'lucide-react';

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

export default function App() {
  const [user, setUser] = useState(null);
  const appId = (typeof window !== 'undefined' && window.__app_id) ? window.__app_id : 'my-secure-vault-prod';

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
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
        <p className="text-center text-zinc-500 text-sm">System ready for secure data operations.</p>
      </div>
    </div>
  );
}
