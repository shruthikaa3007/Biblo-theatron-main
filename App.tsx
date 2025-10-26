import React, { useState, useEffect } from 'react';
// FIX: Use relative paths instead of alias
import Header from './components/Header';
import Watchlist from './components/Watchlist';
import AddItemForm from './components/AddItemForm';
import GenreAnalytics from './components/GenreAnalytics';
import Suggestions from './components/Suggestions';
import type { MediaItem } from './types';
import { MediaStatus, MediaType } from './types'; // Import MediaType

// Firebase Imports (ensure these match your index.html importmap or npm install)
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
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
    Timestamp, // Use Timestamp for potential date fields
    // setLogLevel, // Optional: for debugging
    type Firestore
} from 'firebase/firestore';

// Define expected global variables structure (for type safety)
declare global {
  interface Window {
    __firebase_config?: string;
    __app_id?: string;
    __initial_auth_token?: string;
  }
}

// Helper function to validate MediaType
function isValidMediaType(type: any): type is MediaType {
  return type === MediaType.Movie || type === MediaType.Book;
}
// Helper function to validate MediaStatus
function isValidMediaStatus(status: any): status is MediaStatus {
    return Object.values(MediaStatus).includes(status);
}


function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start true until auth and initial data load
  const [error, setError] = useState<string | null>(null);

  // Firebase state
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // To store UID or random ID
  const [isAuthReady, setIsAuthReady] = useState(false); // Track if initial auth check is done

  // --- Initialize Firebase and Auth Listener ---
  useEffect(() => {
    console.log("Attempting Firebase initialization...");
    // Check if Firebase config is available
    if (typeof window.__firebase_config !== 'string' || !window.__firebase_config) {
      console.error("Firebase config (__firebase_config) is missing or invalid.");
      setError("Firebase configuration is missing. Cannot initialize application.");
      setIsLoading(false);
      setIsAuthReady(true); // Mark auth check as done (failed)
      return;
    }

    try {
      const firebaseConfig = JSON.parse(window.__firebase_config);
      // Check for essential config keys
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
          throw new Error("Invalid Firebase config structure.");
      }
      console.log("Firebase config loaded:", firebaseConfig.projectId);

      const app: FirebaseApp = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      // Optional: Set log level for debugging Firestore
      // setLogLevel('debug');

      setAuth(authInstance);
      setDb(dbInstance);
      console.log("Firebase app, auth, and db initialized.");

      // --- Auth state listener ---
      const unsubscribeAuth = onAuthStateChanged(authInstance, async (currentUser) => {
        if (currentUser) {
          console.log("Auth state changed: User is signed in:", currentUser.uid, "Anonymous:", currentUser.isAnonymous);
          setUser(currentUser);
          setUserId(currentUser.uid); // Use Firebase UID (works for anon too)
        } else {
          console.log("Auth state changed: User is signed out or token expired.");
          setUser(null); // Clear previous user state
          setUserId(null); // Clear userId
          // Attempt sign-in only if not already authenticated
          try {
              if (typeof window.__initial_auth_token === 'string' && window.__initial_auth_token) {
                  console.log("Attempting sign in with custom token...");
                  // Check if already trying to sign in to prevent loops
                  if (authInstance.currentUser) return; // Already signed in or in process
                  await signInWithCustomToken(authInstance, window.__initial_auth_token);
                  console.log("signInWithCustomToken successful (onAuthStateChanged will trigger again).");
              } else {
                  console.log("No custom token found, attempting anonymous sign in...");
                   // Check if already trying to sign in to prevent loops
                  if (authInstance.currentUser) return; // Already signed in or in process
                  const anonUserCredential = await signInAnonymously(authInstance);
                  console.log("signInAnonymously successful:", anonUserCredential.user.uid, "(onAuthStateChanged will trigger again).");
              }
          } catch (signInError) {
              console.error("Error during initial sign-in attempt:", signInError);
              setError("Authentication failed. Data cannot be loaded.");
              setUserId(null); // Explicitly ensure no userId on auth failure
              setIsAuthReady(true); // Mark auth check complete (even on failure)
              setIsLoading(false); // Stop loading indicator
          }
        }
        // Mark auth as ready *after* the first callback runs
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
      console.error("Error parsing Firebase config or initializing Firebase:", e);
      setError(`Failed to initialize Firebase: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setIsLoading(false);
      setIsAuthReady(true); // Mark auth check as done (failed)
    }
  }, []); // Run only once on mount

  // --- Firestore Data Listener ---
  useEffect(() => {
    // Conditions to set up the listener: db initialized, auth check complete, userId exists.
    if (!db || !isAuthReady || !userId) {
        if (isAuthReady && !userId) {
            // Auth check finished, but we failed to get a user ID. Stop loading.
            console.log("Auth ready, but no userId. Cannot attach Firestore listener.");
            setIsLoading(false);
            // Optionally clear items if auth fails after initial load
             setMediaItems([]); // Clear data if auth fails
        } else {
            console.log("Firestore/Auth not ready or userId pending, skipping Firestore listener setup.");
            // Ensure loading is true if auth isn't ready yet
             if (!isAuthReady) setIsLoading(true);
        }
        return; // Exit if conditions not met
    }

    // Determine the correct collection path using required globals
    const appId = typeof window.__app_id === 'string' && window.__app_id ? window.__app_id : 'default-app-id';
    // Use private collection path per user
    const collectionPath = `artifacts/${appId}/users/${userId}/mediaitems`;
    console.log(`Setting up Firestore listener for path: ${collectionPath}`);
    const itemsCollectionRef = collection(db, collectionPath);
    // Query without ordering initially, sort client-side
    const q = query(itemsCollectionRef);

    setIsLoading(true); // Set loading true when listener attaches
    setError(null);

    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      console.log("Firestore snapshot received:", querySnapshot.size, "documents");
      const items: MediaItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // **FIX: Validate type and status before creating the object**
        const dataType = data?.type;
        const dataStatus = data?.status;

        if (isValidMediaType(dataType) && isValidMediaStatus(dataStatus) && data.title) {
            items.push({
                id: doc.id, // Use Firestore document ID
                user_id: data.user_id || userId, // Ensure user_id matches
                type: dataType, // Use validated type
                title: data.title,
                genres: Array.isArray(data.genres) ? data.genres : [], // Default to empty array
                status: dataStatus, // Use validated status
                rating: typeof data.rating === 'number' ? data.rating : null, // Handle null/undefined
                api_id: data.api_id || doc.id, // Fallback api_id if missing
                posterUrl: data.posterUrl || `https://placehold.co/300x450/666/fff?text=${encodeURIComponent(data.title)}`, // Add placeholder fallback
                description: data.description || 'No description available.', // Add placeholder fallback
            });
        } else {
            console.warn("Skipping document due to invalid/missing type, status, or title:", doc.id, data);
        }
      });
      // Sort client-side (e.g., by ID descending to approximate newest)
      items.sort((a, b) => b.id.localeCompare(a.id));
      setMediaItems(items);
      setIsLoading(false); // Data loaded/updated
      console.log("Media items state updated:", items.length, "items");
    }, (err) => {
      console.error("Error fetching Firestore data:", err);
      setError("Failed to load watchlist data. Check Firestore rules or network connection.");
      setIsLoading(false);
    });

    // Cleanup Firestore listener on unmount or when dependencies change
    return () => {
        console.log("Cleaning up Firestore listener.");
        unsubscribeFirestore();
    }

  }, [db, isAuthReady, userId]); // Re-run if db, auth readiness, or userId changes

  // --- Dark Mode Effects ---
   useEffect(() => {
    // Check initial preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    console.log("Initial dark mode preference:", prefersDark);

    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
        console.log("Dark mode preference changed:", e.matches);
        setIsDarkMode(e.matches);
    }
    // Use addEventListener/removeEventListener for modern browsers
    try {
        mediaQuery.addEventListener('change', handleChange);
    } catch (e) { // Fallback for older browsers
        try {
            mediaQuery.addListener(handleChange);
        } catch (e2) {
             console.error("Error adding dark mode listener:", e2);
        }
    }

    return () => {
         try {
            mediaQuery.removeEventListener('change', handleChange);
        } catch (e) { // Fallback for older browsers
            try {
                 mediaQuery.removeListener(handleChange);
            } catch (e2) {
                 console.error("Error removing dark mode listener:", e2);
            }
        }
    }
  }, []);

  useEffect(() => {
    // Apply class to HTML element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      console.log("Applied dark mode class");
    } else {
      document.documentElement.classList.remove('dark');
      console.log("Removed dark mode class");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
      console.log("Toggling dark mode");
      setIsDarkMode(prev => !prev);
  }

  // --- Firestore Handlers ---

  // Helper to get collection reference, ensures db and userId exist
  const getCollectionRef = () => {
      if (!db || !userId) {
          console.error("Cannot get collection ref: Firestore DB or User ID is missing.");
          setError("Action failed: Database connection or user ID is missing.");
          return null;
      }
      const appId = typeof window.__app_id === 'string' && window.__app_id ? window.__app_id : 'default-app-id';
      // Ensure appId is valid, fallback shouldn't ideally be used in production
      if (appId === 'default-app-id') {
          console.warn("__app_id global variable not found, using 'default-app-id'.");
      }
      return collection(db, `artifacts/${appId}/users/${userId}/mediaitems`);
  }

  const handleAddItem = async (newItemData: Omit<MediaItem, 'id' | 'user_id'>) => {
      const collRef = getCollectionRef();
      if (!collRef || !userId) return; // Error already set by getCollectionRef

      // Basic validation before sending
      if (!newItemData.title || !newItemData.type || !newItemData.status) {
          console.error("Attempted to add item with missing essential data:", newItemData);
          setError("Cannot add item: Missing title, type, or status.");
          return;
      }

      console.log("Attempting to add item:", newItemData.title);
      try {
          setError(null); // Clear previous errors
          const docToAdd = {
              ...newItemData,
              user_id: userId, // Store the userId with the item
              createdAt: Timestamp.now() // Add a creation timestamp
          };
          const docRef = await addDoc(collRef, docToAdd);
          console.log("Document successfully written with ID: ", docRef.id);
          // State update happens via onSnapshot listener
      } catch (err) {
          console.error("Error adding document: ", err);
          setError(`Failed to add item: ${err instanceof Error ? err.message : 'Unknown Firestore error'}. Check Firestore rules and network connection.`);
      }
  };

  const handleDeleteItem = async (id: string) => {
      const collRef = getCollectionRef();
      if (!collRef) return;

      console.log("Attempting to delete item:", id);
      try {
          setError(null);
          const itemDoc = doc(collRef, id); // Use doc() to get a DocumentReference
          await deleteDoc(itemDoc);
          console.log("Document successfully deleted with ID: ", id);
          // State update happens via onSnapshot listener
      } catch (err) {
          console.error("Error deleting document: ", err);
          setError(`Failed to delete item: ${err instanceof Error ? err.message : 'Unknown Firestore error'}. Check Firestore rules and network connection.`);
      }
  };

  const handleUpdateStatus = async (id: string, status: MediaStatus) => {
      const collRef = getCollectionRef();
      if (!collRef) return;

      console.log("Attempting to update status for item:", id, "to", status);
      try {
          setError(null);
          const itemDoc = doc(collRef, id);
          await updateDoc(itemDoc, { status: status });
          console.log("Document status successfully updated for ID: ", id);
          // State update happens via onSnapshot listener
      } catch (err) {
          console.error("Error updating status: ", err);
          setError(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown Firestore error'}. Check Firestore rules and network connection.`);
      }
  };

  const handleUpdateRating = async (id: string, rating: number | null) => { // Allow null
      const collRef = getCollectionRef();
       if (!collRef) return;

       console.log("Attempting to update rating for item:", id, "to", rating);
      try {
          setError(null);
          const itemDoc = doc(collRef, id);
          // Firestore handles null correctly, ensure rating is number or null
          const ratingToUpdate = (typeof rating === 'number' && rating >= 1 && rating <= 5) ? rating : null;
          await updateDoc(itemDoc, { rating: ratingToUpdate });
          console.log("Document rating successfully updated for ID: ", id);
          // State update happens via onSnapshot listener
      } catch (err) {
          console.error("Error updating rating: ", err);
          setError(`Failed to update rating: ${err instanceof Error ? err.message : 'Unknown Firestore error'}. Check Firestore rules and network connection.`);
      }
  };

  // --- Render Logic ---
  const renderContent = () => {
    if (!isAuthReady) {
      return (
        <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
           {/* Simple loading indicator */}
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-indigo-500 motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
           <p className="mt-2 text-slate-500 dark:text-slate-400">Authenticating...</p>
        </div>
      );
    }
    if (!userId) { // Auth is ready, but sign-in failed or user is invalid
        return (
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <p className="text-red-500 dark:text-red-400 font-semibold">Authentication Failed</p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Cannot load or save watchlist data. {error || "Please try refreshing the page."}</p>
            </div>
        );
    }
     if (isLoading) { // Auth is ready, userId exists, but data is loading
        return (
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                 <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-indigo-500 motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                 </div>
                <p className="mt-2 text-slate-500 dark:text-slate-400">Loading your watchlist...</p>
            </div>
        );
    }
    // Auth ready, userId exists, not loading -> show main content
    return (
        <>
            <AddItemForm onAddItem={handleAddItem} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 order-last lg:order-first"> {/* Adjust order for mobile */}
                    <div className="space-y-8">
                        <Suggestions items={mediaItems} />
                        <GenreAnalytics items={mediaItems} />
                    </div>
                </div>
                <div className="lg:col-span-2 order-first lg:order-last"> {/* Adjust order for mobile */}
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
      <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8"> {/* Responsive padding */}

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
                {/* Simple X icon */}
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

