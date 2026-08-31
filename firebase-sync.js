  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
  import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyB9Xyx3JioVqjvOfWvWvhJUAZV4lCWfjuQ",
    authDomain: "planner-88ab8.firebaseapp.com",
    projectId: "planner-88ab8",
    storageBucket: "planner-88ab8.firebasestorage.app",
    messagingSenderId: "387783207136",
    appId: "1:387783207136:web:c127dfc6250d40a6abc885"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  let currentUser = null;
  let unsubSnapshot = null;
  let applyingRemote = false;
  let lastPushedAt = null;

  window.plSync = {
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),
    getUser: () => currentUser,
    push: async (payload) => {
      if(!currentUser || applyingRemote) return;
      const updatedAt = Date.now();
      lastPushedAt = updatedAt;
      await setDoc(doc(db, 'users', currentUser.uid, 'planner', 'data'), { ...payload, updatedAt });
    }
  };

  function readLocalPayload(){
    let prefs = {};
    try{ prefs = JSON.parse(localStorage.getItem('pl-prefs') || '{}'); }catch(e){}
    const { theme, todayExpanded, ...syncPrefs } = prefs;
    return {
      items: JSON.parse(localStorage.getItem('pl-assignments') || '[]'),
      courseColors: JSON.parse(localStorage.getItem('pl-course-colors') || '{}'),
      dayCompleteLog: JSON.parse(localStorage.getItem('pl-day-complete-log') || '[]'),
      prefs: syncPrefs
    };
  }

  function writeLocalPayload(data){
    applyingRemote = true;
    if(data.items) localStorage.setItem('pl-assignments', JSON.stringify(data.items));
    if(data.courseColors) localStorage.setItem('pl-course-colors', JSON.stringify(data.courseColors));
    if(data.dayCompleteLog) localStorage.setItem('pl-day-complete-log', JSON.stringify(data.dayCompleteLog));
    if(data.prefs){
      let existing = {};
      try{ existing = JSON.parse(localStorage.getItem('pl-prefs') || '{}'); }catch(e){}
      localStorage.setItem('pl-prefs', JSON.stringify({ ...existing, ...data.prefs }));
    }
    applyingRemote = false;
  }

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if(unsubSnapshot){ unsubSnapshot(); unsubSnapshot = null; }
    document.dispatchEvent(new CustomEvent('pl-auth-changed', { detail: { user } }));
    if(!user) return;

    const ref = doc(db, 'users', user.uid, 'planner', 'data');
    const snap = await getDoc(ref);
    if(snap.exists()){
      writeLocalPayload(snap.data());
      document.dispatchEvent(new CustomEvent('pl-remote-data', {}));
    } else {
      await setDoc(ref, { ...readLocalPayload(), updatedAt: Date.now() });
    }

    unsubSnapshot = onSnapshot(ref, (docSnap) => {
      if(!docSnap.exists()) return;
      const data = docSnap.data();
      // This fires for our own writes too (Firestore echoes them back through
      // the same listener) - applying and re-rendering on that echo is at
      // best redundant and at worst clobbers whatever's mid-animation (e.g.
      // the today panel's open/close transition) with an instant DOM swap.
      // Skip snapshots that are just our own last push coming back.
      if(data.updatedAt!==undefined && data.updatedAt===lastPushedAt) return;
      writeLocalPayload(data);
      document.dispatchEvent(new CustomEvent('pl-remote-data', {}));
    });
  });
