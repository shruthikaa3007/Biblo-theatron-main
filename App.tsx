import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Watchlist from './components/Watchlist';
import AddItemForm from './components/AddItemForm';
import GenreAnalytics from './components/GenreAnalytics';
import Suggestions from './components/Suggestions';
// We no longer import INITIAL_MEDIA_ITEMS
import type { MediaItem } from './types';
import { MediaStatus } from './types';

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // --- Dark Mode Effects ---
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // This will be proxied to http://localhost:3001/api/media by Vite
        const response = await fetch('/api/media');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data: MediaItem[] = await response.json();
        setMediaItems(data.reverse()); // Show newest first
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error("Error fetching media items:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  // --- API Handlers ---

  const handleAddItem = async (newItem: Omit<MediaItem, 'id' | 'user_id'>) => {
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        throw new Error('Failed to add item');
      }
      const addedItem: MediaItem = await response.json();
      // Add new item to the top of the list
      setMediaItems(prevItems => [addedItem, ...prevItems]);
    } catch (err) {
      console.error("Error adding item:", err);
      setError("Failed to add item. Please try again.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      setMediaItems(prevItems => prevItems.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("Failed to delete item. Please try again.");
    }
  };

  const handleUpdateStatus = async (id:string, status: MediaStatus) => {
    try {
      const response = await fetch(`/api/media/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      const updatedItem: MediaItem = await response.json();
      setMediaItems(prevItems => prevItems.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status. Please try again.");
    }
  };

  const handleUpdateRating = async (id: string, rating: number) => {
    try {
      const response = await fetch(`/api/media/${id}/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!response.ok) {
        throw new Error('Failed to update rating');
      }
      const updatedItem: MediaItem = await response.json();
      setMediaItems(prevItems => prevItems.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      console.error("Error updating rating:", err);
      setError("Failed to update rating. Please try again.");
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      <main className="container mx-auto p-4 space-y-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 2.651a1.2 1.2 0 1 1-1.697-1.697L8.18 10 5.53 7.349a1.2 1.2 0 1 1 1.697-1.697L10 8.18l2.651-2.651a1.2 1.2 0 1 1 1.697 1.697L11.819 10l2.651 2.651a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}

        <AddItemForm onAddItem={handleAddItem} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="space-y-8">
                  <Suggestions items={mediaItems} />
                  <GenreAnalytics items={mediaItems} />
                </div>
            </div>
            <div className="lg:col-span-2">
              {isLoading ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                  <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">Loading your watchlist...</p>
                </div>
              ) : (
                <Watchlist 
                    items={mediaItems} 
                    onDeleteItem={handleDeleteItem}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateRating={handleUpdateRating}
                />
              )}
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;

