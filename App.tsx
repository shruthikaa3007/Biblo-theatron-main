import React, { useState, useEffect } from 'react';
// Use relative paths with extensions
import Header from './components/Header.tsx';
import Watchlist from './components/Watchlist.tsx';
import AddItemForm from './components/AddItemForm.tsx';
import GenreAnalytics from './components/GenreAnalytics.tsx';
import Suggestions from './components/Suggestions.tsx';
import type { MediaItem } from './types.ts';
import { MediaStatus, MediaType } from './types.ts';

// Firebase Imports
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    // signInWithCustomToken, // Not used for local .env setup
    onAuthStateChanged,
    type Auth,
    type User
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    Timestamp,
    // setLogLevel, // Optional: for debugging Firestore
    type Firestore
} from 'firebase/firestore';

// --- Vite Environment Variables ---
// Access variables defined in .env (prefixed with VITE_)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
// App ID specifically for Firestore path construction
const appId = import.meta.env.VITE_APP_ID || 'biblio-theatron-local-fallback'; // Fallback App ID for local dev

// Basic check if config seems loaded from .env
const isFirebaseConfigLoaded = firebaseConfig.apiKey && firebaseConfig.projectId;

// Helper function to validate MediaType
function isValidMediaType(type: any): type is MediaType {
  return type === MediaType.Movie || type === MediaType.Book;
}
// Helper function to validate MediaStatus
function isValidMediaStatus(status: any): status is MediaStatus {
    return Object.values(MediaStatus).includes(status);
}
// --- End Helper Functions ---

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start true until auth and initial data load
  const [error, setError] = useState<string | null>(null);

  // Firebase state
  // Note: We don't store auth/db in state if initialized directly in useEffect
  // const [auth, setAuth] = useState<Auth | null>(null);
  // const [db, setDb] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // To store UID
  const [isAuthReady, setIsAuthReady] = useState(false); // Track if initial auth check is done

  // --- Initialize Firebase and Auth Listener ---
  useEffect(() => {
    console.log("Attempting Firebase initialization using Vite env vars...");
    if (!isFirebaseConfigLoaded) {
      console.error("Firebase config (VITE_FIREBASE_...) not found in .env file or environment.");
      setError("Firebase configuration is missing. Check your .env file and ensure variables start with VITE_");
      setIsLoading(false);
      setIsAuthReady(true); // Mark auth check as done (failed)
      return;
    }

    let app: FirebaseApp;
    let authInstance: Auth;
    let dbInstance: Firestore;

    try {
      console.log("Firebase config loaded via import.meta.env for project:", firebaseConfig.projectId);
      app = initializeApp(firebaseConfig);
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      // Optional: Set log level for debugging Firestore
      // setLogLevel('debug');
      console.log("Firebase app, auth, and db initialized.");

      // --- Auth state listener ---
      const unsubscribeAuth = onAuthStateChanged(authInstance, async (currentUser) => {
        if (currentUser) {
          console.log("Auth state changed: User is signed in:", currentUser.uid, "Anonymous:", currentUser.isAnonymous);
          setUser(currentUser);
          setUserId(currentUser.uid);
        } else {
          console.log("Auth state changed: User is signed out.");
          setUser(null);
          setUserId(null);
          // Attempt anonymous sign-in for local dev if not signed in
          try {
            console.log("Attempting anonymous sign in...");
            if (authInstance.currentUser) {
                console.log("Already signed in or in process, skipping anon sign in.");
                return; // Prevent loop if already processing
            }
            const anonUserCredential = await signInAnonymously(authInstance);
            console.log("signInAnonymously successful:", anonUserCredential.user.uid, "(onAuthStateChanged will trigger again).");
          } catch (signInError) {
            console.error("Error during anonymous sign-in attempt:", signInError);
            setError("Anonymous authentication failed. Check Firebase Auth settings.");
            setUserId(null);
            // Only set auth ready here on error if it wasn't already set
            if (!isAuthReady) setIsAuthReady(true);
            setIsLoading(false);
          }
        }
        // Mark auth as ready *after* the first callback runs and we have a user state
         if (!isAuthReady) {
            console.log("Authentication check complete. isAuthReady set to true.");
            setIsAuthReady(true);
        }
      });

      // Cleanup auth listener on component unmount
      return () => {
          console.log("Cleaning up auth listener.");
          unsubscribeAuth();
      }

    } catch (e) {
      console.error("Error initializing Firebase:", e);
      setError(`Failed to initialize Firebase: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setIsLoading(false);
      setIsAuthReady(true); // Mark auth check as done (failed)
    }
  }, []); // Run only once on mount

  // --- Firestore Data Listener ---
  useEffect(() => {
    // Get db instance directly inside effect or ensure it's stable
     const db = getFirestore(); // Get instance (assuming app is initialized)

    // Conditions to set up the listener: db exists, auth check complete, userId exists.
    if (!db || !isAuthReady || !userId) {
        if (isAuthReady && !userId) {
            console.log("Auth ready, but no userId. Cannot attach Firestore listener.");
            setIsLoading(false);
            setMediaItems([]); // Clear data if auth fails/no user
        } else {
            console.log("Firestore/Auth not ready or userId pending, skipping Firestore listener setup.");
             if (!isAuthReady) setIsLoading(true); // Keep loading if auth isn't ready
        }
        return; // Exit if conditions not met
    }

    // Use appId loaded from import.meta.env
    const collectionPath = `artifacts/${appId}/users/${userId}/mediaitems`;
    console.log(`Setting up Firestore listener for path: ${collectionPath}`);
    const itemsCollectionRef = collection(db, collectionPath);
    const q = query(itemsCollectionRef);

    // Don't reset loading if already false from auth failure
    if (isLoading === null || isLoading === undefined) setIsLoading(true);
    setError(null);

    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      console.log("Firestore snapshot received:", querySnapshot.size, "documents");
      const items: MediaItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dataType = data?.type;
        const dataStatus = data?.status;

        if (isValidMediaType(dataType) && isValidMediaStatus(dataStatus) && data.title) {
            items.push({
                id: doc.id,
                user_id: data.user_id || userId,
                type: dataType,
                title: data.title,
                genres: Array.isArray(data.genres) ? data.genres : [],
                status: dataStatus,
                rating: typeof data.rating === 'number' ? data.rating : null,
                api_id: data.api_id || doc.id,
                posterUrl: data.posterUrl || `https://placehold.co/300x450/666/fff?text=${encodeURIComponent(data.title)}`,
                description: data.description || 'No description available.',
            });
        } else {
            console.warn("Skipping document due to invalid/missing type, status, or title:", doc.id, data);
        }
      });
      items.sort((a, b) => b.id.localeCompare(a.id)); // Sort client-side
      setMediaItems(items);
      setIsLoading(false); // Data loaded/updated
      console.log("Media items state updated:", items.length, "items");
    }, (err) => {
      console.error("Error fetching Firestore data:", err);
      setError("Failed to load watchlist data. Check Firestore rules or network connection.");
      setIsLoading(false);
    });

    // Cleanup Firestore listener
    return () => {
        console.log("Cleaning up Firestore listener.");
        unsubscribeFirestore();
    }

  }, [isAuthReady, userId]); // Depend only on auth readiness and userId

  // --- Dark Mode Effects ---
   useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    try { mediaQuery.addEventListener('change', handleChange); } catch (e) { try { mediaQuery.addListener(handleChange); } catch (e2) {} } // Add listener + fallback
    return () => { try { mediaQuery.removeEventListener('change', handleChange); } catch (e) { try { mediaQuery.removeListener(handleChange); } catch (e2) {} } }; // Cleanup + fallback
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode); // Toggle class based on state
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // --- Firestore Handlers ---
  const getCollectionRef = () => {
      const db = getFirestore(); // Get current Firestore instance
      if (!db || !userId) {
          console.error("Cannot perform action: Firestore DB not ready or User ID is missing.");
          setError("Action failed: Database connection or user ID is missing.");
          return null;
      }
      // Use appId from import.meta.env
      return collection(db, `artifacts/${appId}/users/${userId}/mediaitems`);
  }

  const handleAddItem = async (newItemData: Omit<MediaItem, 'id' | 'user_id'>) => {
      const collRef = getCollectionRef();
      if (!collRef || !userId) return;
      if (!newItemData.title || !newItemData.type || !newItemData.status) {
          setError("Cannot add item: Missing title, type, or status."); return;
      }
      console.log("Attempting to add item:", newItemData.title);
      try {
          setError(null);
          const docToAdd = { ...newItemData, user_id: userId, createdAt: Timestamp.now() };
          const docRef = await addDoc(collRef, docToAdd);
          console.log("Document successfully written with ID: ", docRef.id);
      } catch (err) {
          console.error("Error adding document: ", err);
          setError(`Failed to add item: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  const handleDeleteItem = async (id: string) => {
      const collRef = getCollectionRef();
      if (!collRef) return;
      console.log("Attempting to delete item:", id);
      try {
          setError(null);
          await deleteDoc(doc(collRef, id)); // Use doc(collRef, id)
          console.log("Document successfully deleted with ID: ", id);
      } catch (err) {
          console.error("Error deleting document: ", err);
          setError(`Failed to delete item: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  const handleUpdateStatus = async (id: string, status: MediaStatus) => {
      const collRef = getCollectionRef();
      if (!collRef) return;
      console.log("Attempting to update status for item:", id, "to", status);
      try {
          setError(null);
          await updateDoc(doc(collRef, id), { status }); // Use doc(collRef, id)
          console.log("Document status successfully updated for ID: ", id);
      } catch (err) {
          console.error("Error updating status: ", err);
          setError(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  const handleUpdateRating = async (id: string, rating: number | null) => {
      const collRef = getCollectionRef();
       if (!collRef) return;
       console.log("Attempting to update rating for item:", id, "to", rating);
      try {
          setError(null);
          const ratingToUpdate = (typeof rating === 'number' && rating >= 1 && rating <= 5) ? rating : null;
          await updateDoc(doc(collRef, id), { rating: ratingToUpdate }); // Use doc(collRef, id)
          console.log("Document rating successfully updated for ID: ", id);
      } catch (err) {
          console.error("Error updating rating: ", err);
          setError(`Failed to update rating: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  // --- Render Logic ---
  const renderLoadingIndicator = (message: string) => (
       <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
           <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-indigo-500 motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
               <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
           </div>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{message}</p>
       </div>
  );

  const renderContent = () => {
    if (!isAuthReady) return renderLoadingIndicator("Authenticating...");
    if (!userId) {
        return (
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <p className="text-red-500 dark:text-red-400 font-semibold">Authentication Failed</p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{error || "Cannot load or save watchlist data. Please try refreshing the page."}</p>
            </div>
        );
    }
     if (isLoading) return renderLoadingIndicator("Loading your watchlist...");

    // Main content when authenticated and data loaded (or empty)
    return (
        <>
            <AddItemForm onAddItem={handleAddItem} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 order-last lg:order-first">
                    <div className="space-y-8">
                        <Suggestions items={mediaItems} />
                        <GenreAnalytics items={mediaItems} />
                    </div>
                </div>
                <div className="lg:col-span-2 order-first lg:order-last">
                    <Watchlist
                        items={mediaItems}
                        onDeleteItem={handleDeleteItem}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateRating={handleUpdateRating}
                    />
                </div>
            </div>
        </>
    );
  };

  // --- Main Return ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">

        {/* Display User ID for context */}
        {userId && (
            <div className="text-xs text-center text-slate-500 dark:text-slate-400 mb-2">
                User ID: {userId} {user?.isAnonymous ? '(Anonymous)' : ''}
            </div>
        )}

        {/* Global Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 flex justify-between items-center" role="alert">
            <div>
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="ml-4 px-2 py-1 text-red-700 hover:bg-red-200 rounded" aria-label="Close error message">
                 <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 2.651a1.2 1.2 0 1 1-1.697-1.697L8.18 10 5.53 7.349a1.2 1.2 0 1 1 1.697-1.697L10 8.18l2.651-2.651a1.2 1.2 0 1 1 1.697 1.697L11.819 10l2.651 2.651a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </button>
          </div>
        )}

        {/* Render main content based on state */}
        {renderContent()}

      </main>
    </div>
  );
}

export default App;

