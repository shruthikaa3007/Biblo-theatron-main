import React, { useState, useEffect } from 'react';
// Use relative paths without extensions
import Header from './components/Header';
import Watchlist from './components/Watchlist';
import AddItemForm from './components/AddItemForm';
import GenreAnalytics from './components/GenreAnalytics';
import Suggestions from './components/Suggestions';
import type { MediaItem } from './types';
import { MediaStatus, MediaType } from './types';
import { GoogleIcon } from './components/icons'; // Import Google Icon

// Firebase Imports
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    type Auth,
    type User,
    GoogleAuthProvider, // Import Google Auth Provider
    signInWithPopup,    // Import popup sign-in method
    signOut             // Import sign-out method
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
    // Check against all possible values in the enum from types.ts
    // This now includes Watching and Reading
    return Object.values(MediaStatus).includes(status as MediaStatus);
}
// --- End Helper Functions ---

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start true until auth and initial data load
  const [error, setError] = useState<string | null>(null);

  // Firebase state
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
          // We no longer sign in anonymously. The user must click the button.
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
     // Ensure Firebase app is initialized before getting Firestore
     // This relies on initializeApp having run successfully in the first useEffect
     let db: Firestore | null = null;
     try {
         db = getFirestore(); // Get instance
     } catch (e) {
         console.error("Could not get Firestore instance, Firebase App likely not initialized.", e);
         // Error state might already be set by the first useEffect, but we can ensure loading stops.
         if (isAuthReady) setIsLoading(false); // Stop loading if auth is ready but DB failed
         return; // Cannot proceed without DB
     }

    // Conditions to set up the listener: db exists, auth check complete, userId exists.
    if (!isAuthReady || !userId) {
        if (isAuthReady && !userId) {
            console.log("Auth ready, but no userId. Cannot attach Firestore listener yet.");
            setIsLoading(false); // Stop loading if auth ready but no user yet
            setMediaItems([]); // Clear data if auth fails/no user
        } else {
            console.log("Auth not ready or userId pending, skipping Firestore listener setup.");
             // Keep loading only if auth isn't ready. If auth is ready but no user, loading stopped above.
             if (!isAuthReady) setIsLoading(true);
        }
        return; // Exit if conditions not met
    }

    // Use appId loaded from import.meta.env
    const collectionPath = `artifacts/${appId}/users/${userId}/mediaitems`;
    console.log(`Setting up Firestore listener for path: ${collectionPath}`);
    const itemsCollectionRef = collection(db, collectionPath);
    const q = query(itemsCollectionRef); // No ordering applied here, sorting done client-side later

    // If we've reached here, auth is ready and we have a userId. Start loading data.
    setIsLoading(true);
    setError(null); // Clear previous errors when attempting to load data

    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      console.log("Firestore snapshot received:", querySnapshot.size, "documents");
      const items: MediaItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dataType = data?.type;
        const dataStatus = data?.status;

        // Validate required fields and types
        if (isValidMediaType(dataType) && isValidMediaStatus(dataStatus) && data.title) {
            items.push({
                id: doc.id,
                user_id: data.user_id || userId, // Ensure user_id is set
                type: dataType,
                title: data.title,
                genres: Array.isArray(data.genres) ? data.genres : [],
                status: dataStatus,
                rating: typeof data.rating === 'number' ? data.rating : null,
                // Use a consistent fallback for api_id if missing, maybe Firestore ID?
                api_id: data.api_id || doc.id,
                posterUrl: data.posterUrl || `https://placehold.co/300x450/666/fff?text=${encodeURIComponent(data.title)}`,
                description: data.description || 'No description available.',
            });
        } else {
             // If status is invalid (e.g., old 'watched'/'read' from before "in-progress" was added),
             // log it but still add it, maybe coercing status?
             // For now, we'll just skip if status is not one of the *new* valid enums
            console.warn("Skipping document due to invalid/missing type, status, or title:", doc.id, data);
        }
      });
      // Sort client-side by title after fetching (consider performance for very large lists)
      items.sort((a, b) => a.title.localeCompare(b.title));
      setMediaItems(items);
      setIsLoading(false); // Data loaded/updated successfully
      console.log("Media items state updated:", items.length, "items");
    }, (err) => {
      console.error("Error fetching Firestore data:", err);
      setError("Failed to load watchlist data. Check Firestore rules or network connection.");
      setIsLoading(false); // Stop loading on error
    });

    // Cleanup Firestore listener
    return () => {
        console.log("Cleaning up Firestore listener.");
        unsubscribeFirestore();
    }

  }, [isAuthReady, userId]); // Depend only on auth readiness and userId

  // --- Dark Mode Effects ---
   useEffect(() => {
    // Check initial preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    // Add listener with fallbacks for older browsers
    try { mediaQuery.addEventListener('change', handleChange); } catch (e) { try { mediaQuery.addListener(handleChange); } catch (e2) {} }
    // Cleanup listener with fallbacks
    return () => { try { mediaQuery.removeEventListener('change', handleChange); } catch (e) { try { mediaQuery.removeListener(handleChange); } catch (e2) {} } };
  }, []);

  useEffect(() => {
    // Apply/remove 'dark' class to html element
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // --- Auth Handlers ---
  const handleGoogleSignIn = async () => {
    let auth: Auth | null = null;
    try {
        auth = getAuth();
    } catch(e) {
        console.error("Firebase Auth not initialized for handleGoogleSignIn");
        setError("Authentication service is not ready. Please refresh.");
        return;
    }
    
    if (!auth) return;

    const provider = new GoogleAuthProvider();
    try {
        setError(null);
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle setting the user state
        console.log("signInWithPopup successful, onAuthStateChanged will trigger.");
    } catch (err) {
        console.error("Error during Google sign-in:", err);
        setError(`Failed to sign in: ${err instanceof Error ? err.message : 'Unknown auth error'}.`);
    }
  };

  const handleSignOut = async () => {
    let auth: Auth | null = null;
    try {
        auth = getAuth();
    } catch(e) {
        console.error("Firebase Auth not initialized for handleSignOut");
        return;
    }

    if (!auth) return;

    try {
        await signOut(auth);
        // onAuthStateChanged will handle clearing the user state
        console.log("Sign-out successful, onAuthStateChanged will trigger.");
        setMediaItems([]); // Clear data on sign-out
    } catch (err) {
        console.error("Error during sign-out:", err);
        setError(`Failed to sign out: ${err instanceof Error ? err.message : 'Unknown auth error'}.`);
    }
  };


  // --- Firestore Handlers ---
  // Memoize getCollectionRef to potentially avoid recalculating if db/userId haven't changed, though minor impact here
  const getCollectionRef = React.useCallback(() => {
      // Ensure DB instance is available
      let db: Firestore | null = null;
      try { db = getFirestore(); } catch(e){ console.error("Firestore not initialized for getCollectionRef"); return null;}

      if (!db || !userId) {
          console.error("Cannot perform action: Firestore DB not ready or User ID is missing.");
          // Avoid setting error directly here, let calling function handle UI feedback if needed
          // setError("Action failed: Database connection or user ID is missing.");
          return null;
      }
      // Use appId from import.meta.env
      return collection(db, `artifacts/${appId}/users/${userId}/mediaitems`);
  }, [userId]); // Recreate only if userId changes

  const handleAddItem = async (newItemData: Omit<MediaItem, 'id' | 'user_id'>) => {
      const collRef = getCollectionRef();
      if (!collRef || !userId) {
          setError("Cannot add item: Database connection or user ID is missing.");
          return;
      }
      // Basic validation for core fields
      if (!newItemData.title || !newItemData.type || !newItemData.status) {
          setError("Cannot add item: Missing title, type, or status.");
          return;
      }

      // Check if item with this title already exists
      // Note: This is a client-side check. For true uniqueness, you'd need Firestore rules
      // or a more complex check, but this prevents simple duplicates.
      const exists = mediaItems.some(item => item.title.toLowerCase() === newItemData.title.toLowerCase() && item.type === newItemData.type);
      if (exists) {
          setError(`"${newItemData.title}" is already in your list.`);
          return; // Stop execution
      }

      console.log("Attempting to add item:", newItemData.title);
      try {
          setError(null); // Clear previous errors
          // Ensure all required fields are present, add user_id and timestamp
          const docToAdd = {
              ...newItemData,
              user_id: userId,
              createdAt: Timestamp.now(),
              // Ensure optional fields have defaults if needed by Firestore rules or logic
              rating: newItemData.rating ?? null,
              genres: newItemData.genres ?? [],
              api_id: newItemData.api_id || crypto.randomUUID(), // Use UUID for default api_id
              posterUrl: newItemData.posterUrl || `https://placehold.co/300x450/eee/aaa?text=No+Image`,
              description: newItemData.description || ''
          };
          const docRef = await addDoc(collRef, docToAdd);
          console.log("Document successfully written with ID: ", docRef.id);
      } catch (err) {
          console.error("Error adding document: ", err);
          setError(`Failed to add item: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  const handleDeleteItem = async (id: string) => {
      const collRef = getCollectionRef();
      if (!collRef) {
          setError("Cannot delete item: Database connection or user ID is missing.");
          return;
      }
      console.log("Attempting to delete item:", id);
      try {
          setError(null);
          await deleteDoc(doc(collRef, id)); // Correct usage: doc(collectionRef, documentId)
          console.log("Document successfully deleted with ID: ", id);
      } catch (err) {
          console.error("Error deleting document: ", err);
          setError(`Failed to delete item: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  const handleUpdateStatus = async (id: string, status: MediaStatus) => {
      const collRef = getCollectionRef();
      if (!collRef) {
          setError("Cannot update status: Database connection or user ID is missing.");
          return;
      }
      // Validate the status just in case
      if (!isValidMediaStatus(status)) {
          console.error("Invalid status update attempt:", status);
          setError("Failed to update status: Invalid status value.");
          return;
      }
      console.log("Attempting to update status for item:", id, "to", status);
      try {
          setError(null);
          await updateDoc(doc(collRef, id), { status }); // Update only the status field
          console.log("Document status successfully updated for ID: ", id);
      } catch (err) {
          console.error("Error updating status: ", err);
          setError(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  const handleUpdateRating = async (id: string, rating: number | null) => {
      const collRef = getCollectionRef();
       if (!collRef) {
           setError("Cannot update rating: Database connection or user ID is missing.");
           return;
       }
       console.log("Attempting to update rating for item:", id, "to", rating);
      try {
          setError(null);
          // Validate rating is within 1-5 or explicitly null
          const ratingToUpdate = (typeof rating === 'number' && rating >= 1 && rating <= 5) ? rating : null;
          await updateDoc(doc(collRef, id), { rating: ratingToUpdate }); // Update only the rating field
          console.log("Document rating successfully updated for ID: ", id);
      } catch (err) {
          console.error("Error updating rating: ", err);
          setError(`Failed to update rating: ${err instanceof Error ? err.message : 'Unknown Firestore error'}.`);
      }
  };

  // --- Render Logic ---

  // A simple loading component
  const renderLoadingIndicator = (message: string) => (
       <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
           <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-indigo-500 motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
               <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
           </div>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{message}</p>
       </div>
  );

  // A simple login screen component
  const renderLoginScreen = () => (
      <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Welcome to Biblio-theatron</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Please sign in with Google to save and manage your watchlist.</p>
          <button
            onClick={handleGoogleSignIn}
            className="flex w-full justify-center items-center gap-3 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
              <GoogleIcon className="w-6 h-6" />
              Sign in with Google
          </button>
      </div>
  );

  // *** THIS IS THE CORRECT, SINGLE renderContent FUNCTION ***
  const renderContent = () => {
    // Show loading indicator until authentication check is complete
    if (!isAuthReady) return renderLoadingIndicator("Authenticating...");

    // Show Login screen if auth is ready but user is not logged in
    if (isAuthReady && !userId) {
        return renderLoginScreen();
    }

    // Show loading indicator while fetching Firestore data (after auth is ready and user exists)
     if (isLoading && isAuthReady && userId) return renderLoadingIndicator("Loading your watchlist...");

    // Main content when authenticated and data loaded (or empty)
    return (
        <>
            <AddItemForm onAddItem={handleAddItem} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Analytics & Suggestions Column */}
                <div className="lg:col-span-1 order-last lg:order-first">
                    <div className="space-y-8">
                        {/* Pass items only if not loading and user exists */}
                        <Suggestions items={mediaItems} onAddItem={handleAddItem} />
                        <GenreAnalytics items={mediaItems} />
                    </div>
                </div>
                {/* Watchlist Column */}
                <div className="lg:col-span-2 order-first lg:order-last">
                    <Watchlist
                        items={mediaItems}
                        onDeleteItem={handleDeleteItem}
                        onUpdateStatus={handleUpdateStatus}
                        // Pass handleUpdateRating directly
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
      <Header 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        user={user}
        handleSignOut={handleSignOut} 
      />
      <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">

        {/* Display User ID for context (only if user exists) */}
        {user && ( // Use 'user' object for richer data
            <div className="text-xs text-center text-slate-500 dark:text-slate-400 mb-2">
                Signed in as: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{user.displayName || user.email}</code>
            </div>
        )}

        {/* Global Error Display (Dismissible) */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 flex justify-between items-center dark:bg-red-900/30 dark:border-red-600 dark:text-red-300" role="alert">
            <div>
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
            <button
                onClick={() => setError(null)}
                className="ml-4 px-2 py-1 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 rounded"
                aria-label="Close error message"
            >
                 {/* Simple 'X' icon */}
                 <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 2.651a1.2 1.2 0 1 1-1.697-1.697L8.18 10 5.53 7.349a1.2 1.2 0 1 1 1.697-1.697L10 8.18l2.651-2.651a1.2 1.2 0 1 1 1.697 1.697L11.819 10l2.651 2.651a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </button>
          </div>
        )}

        {/* Render main content based on state */}
        {renderContent()}

      </main>
      {/* Optional Footer */}
      {/* <footer className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-700 mt-8">
        Biblio-theatron App
      </footer> */}
    </div>
  );
}

export default App;
