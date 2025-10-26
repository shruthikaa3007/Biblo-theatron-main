import React, { useState, useEffect, useCallback } from 'react';
import type { MediaItem, Suggestion } from '../types';
import { MediaStatus, MediaType } from '../types';
import { fetchSuggestions, fetchSurpriseSuggestion } from '../services/geminiService';
import { SparklesIcon } from './icons';

// --- Helper X Icon for closing ---
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);
// --- ---

interface SuggestionsProps {
  items: MediaItem[];
  onAddItem: (item: Omit<MediaItem, 'id' | 'user_id'>) => void;
}

interface SuggestionCardProps {
    suggestion: Suggestion;
    onAdd: (suggestion: Suggestion) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onAdd }) => (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden flex flex-col sm:flex-row items-center gap-4 p-4">
        <img src={suggestion.posterUrl} alt={suggestion.title} className="w-24 h-36 object-cover rounded-md shadow-md flex-shrink-0" />
        <div className="text-center sm:text-left w-full">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{suggestion.title}</h4>
            <div className="flex flex-wrap gap-1 my-1 justify-center sm:justify-start">
                {suggestion.genres.slice(0,2).map(g => <span key={g} className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">{g}</span>)}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{suggestion.description}</p>
            <button
                onClick={() => onAdd(suggestion)}
                className="mt-2 w-full sm:w-auto px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-xs font-semibold rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
            >
                + Add to List
            </button>
        </div>
    </div>
);

const Suggestions: React.FC<SuggestionsProps> = ({ items, onAddItem }) => {
  const [movieSuggestions, setMovieSuggestions] = useState<Suggestion[]>([]);
  const [bookSuggestions, setBookSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [surprise, setSurprise] = useState<Suggestion[] | null>(null);
  const [isSurpriseLoading, setIsSurpriseLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false); // State to control visibility

  const getTopGenres = useCallback((type: MediaType): string[] => {
    const genreCount: { [key: string]: number } = {};
    items
      .filter(item => item.type === type && (item.status === MediaStatus.Watched || item.status === MediaStatus.Read))
      .forEach(item => {
        item.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });
    return Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);
  }, [items]);

  const generateSuggestions = useCallback(async () => {
    setIsLoading(true);
    setShowSuggestions(true); // Open the panel
    setMovieSuggestions([]);
    setBookSuggestions([]);
    setSurprise(null); // Clear surprise picks

    const topMovieGenres = getTopGenres(MediaType.Movie);
    const topBookGenres = getTopGenres(MediaType.Book);

    const moviePromise = topMovieGenres.length > 0
        ? fetchSuggestions(topMovieGenres, MediaType.Movie)
        : Promise.resolve([]);

    const bookPromise = topBookGenres.length > 0
        ? fetchSuggestions(topBookGenres, MediaType.Book)
        : Promise.resolve([]);

    try {
        const [movieRes, bookRes] = await Promise.all([
            moviePromise,
            bookPromise
        ]);

        setMovieSuggestions(movieRes.map(s => ({...s, type: MediaType.Movie})));
        setBookSuggestions(bookRes.map(s => ({...s, type: MediaType.Book})));
    } catch (error) {
        console.error("Error fetching suggestions:", error);
    } finally {
        setIsLoading(false);
    }
  }, [getTopGenres, items]);

  const handleSurpriseMe = async () => {
    setIsSurpriseLoading(true);
    setShowSuggestions(true); // Open the panel
    setMovieSuggestions([]); // Clear personal suggestions
    setBookSuggestions([]); // Clear personal suggestions
    setSurprise(null);

    const suggestions = await fetchSurpriseSuggestion();
    if (suggestions) {
        setSurprise(suggestions);
    }
    setIsSurpriseLoading(false);
  };

  const handleAddSuggestion = (suggestion: Suggestion) => {
    onAddItem({
        type: suggestion.type,
        title: suggestion.title,
        genres: suggestion.genres,
        status: suggestion.type === MediaType.Movie ? MediaStatus.ToWatch : MediaStatus.ToRead,
        rating: null,
        api_id: crypto.randomUUID(),
        posterUrl: suggestion.posterUrl,
        description: suggestion.description,
    });
  };

  const handleClearAndClose = () => {
    setMovieSuggestions([]);
    setBookSuggestions([]);
    setSurprise(null);
    setIsLoading(false);
    setIsSurpriseLoading(false);
    setShowSuggestions(false); // This will hide the content area
  };

  const anyResults = (surprise && surprise.length > 0) || movieSuggestions.length > 0 || bookSuggestions.length > 0;
  const anyLoading = isLoading || isSurpriseLoading;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      {/* --- Header: Always Visible --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">🎯 Suggested for You</h3>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <button
                onClick={handleSurpriseMe}
                disabled={isSurpriseLoading}
                className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-semibold rounded-md hover:bg-purple-200 dark:hover:bg-purple-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
                {isSurpriseLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                <SparklesIcon className="w-5 h-5 mr-2" />
                )}
                {isSurpriseLoading ? 'Thinking...' : 'Surprise Me!'}
            </button>
            <button
                onClick={generateSuggestions}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center w-[190px]"
            >
                {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    'Get New Suggestions'
                )}
            </button>
        </div>
      </div>
      
      {/* --- Collapsible Content Area --- */}
      {showSuggestions && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 relative">
            {/* Close Button */}
            <button 
                onClick={handleClearAndClose}
                className="absolute -top-3 right-0 p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                title="Clear and close suggestions"
            >
                <XIcon className="w-4 h-4" />
            </button>

            {/* Loading State */}
            { anyLoading && (
                <div className="text-center py-8">
                    <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Thinking of some great recommendations...</p>
                </div>
            )}

            {/* Empty State */}
            { !anyLoading && !anyResults && (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                    No suggestions found. (Note: Personalized suggestions require at least one 'Watched' or 'Read' item.)
                </p>
            )}

            {/* Results */}
            { !anyLoading && anyResults && (
                <div className="space-y-6">
                    {surprise && surprise.length > 0 && (
                        <div>
                            <h4 className="text-xl font-semibold mb-3 dark:text-slate-200">✨ Your Surprise Picks!</h4>
                            <div className="space-y-4">
                                {surprise.map(s => <SuggestionCard key={s.title} suggestion={s} onAdd={handleAddSuggestion} />)}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                        {movieSuggestions.length > 0 && <h4 className="text-xl font-semibold mb-3 dark:text-slate-200">Movies</h4>}
                        <div className="space-y-4">
                            {movieSuggestions.map(s => <SuggestionCard key={s.title} suggestion={s} onAdd={handleAddSuggestion} />)}
                        </div>
                        </div>
                        <div>
                        {bookSuggestions.length > 0 && <h4 className="text-xl font-semibold mb-3 dark:text-slate-200">Books</h4>}
                        <div className="space-y-4">
                            {bookSuggestions.map(s => <SuggestionCard key={s.title} suggestion={s} onAdd={handleAddSuggestion} />)}
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Initial Prompt - Show only if panel is closed */}
      {!showSuggestions && (
         <p className="text-slate-500 dark:text-slate-400 mt-2 text-center sm:text-left">
            Click a button to get personalized or random suggestions!
         </p>
      )}
      
    </div>
  );
};

export default Suggestions;

