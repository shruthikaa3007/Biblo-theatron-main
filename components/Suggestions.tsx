import React, { useState, useEffect, useCallback } from 'react';
import type { MediaItem, Suggestion } from '../types';
import { MediaStatus, MediaType } from '../types';
import { fetchSuggestions, fetchSurpriseSuggestion } from '../services/geminiService';
import { SparklesIcon } from './icons';

interface SuggestionsProps {
  items: MediaItem[];
}

const SuggestionCard: React.FC<{suggestion: Suggestion}> = ({ suggestion }) => (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden flex flex-col sm:flex-row items-center gap-4 p-4">
        <img src={suggestion.posterUrl} alt={suggestion.title} className="w-24 h-36 object-cover rounded-md shadow-md flex-shrink-0" />
        <div className="text-center sm:text-left">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{suggestion.title}</h4>
            <div className="flex flex-wrap gap-1 my-1 justify-center sm:justify-start">
                {suggestion.genres.slice(0,2).map(g => <span key={g} className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">{g}</span>)}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{suggestion.description}</p>
        </div>
    </div>
);

const Suggestions: React.FC<SuggestionsProps> = ({ items }) => {
  const [movieSuggestions, setMovieSuggestions] = useState<Suggestion[]>([]);
  const [bookSuggestions, setBookSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [surprise, setSurprise] = useState<Suggestion | null>(null);
  const [isSurpriseLoading, setIsSurpriseLoading] = useState(false);

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
    const topMovieGenres = getTopGenres(MediaType.Movie);
    const topBookGenres = getTopGenres(MediaType.Book);

    const [movieRes, bookRes] = await Promise.all([
        fetchSuggestions(topMovieGenres, MediaType.Movie),
        fetchSuggestions(topBookGenres, MediaType.Book)
    ]);

    setMovieSuggestions(movieRes.map(s => ({...s, type: MediaType.Movie})));
    setBookSuggestions(bookRes.map(s => ({...s, type: MediaType.Book})));
    setIsLoading(false);
  }, [getTopGenres]);

  const handleSurpriseMe = async () => {
    setIsSurpriseLoading(true);
    setSurprise(null);
    const suggestion = await fetchSurpriseSuggestion();
    if (suggestion) {
        setSurprise(suggestion);
    }
    setIsSurpriseLoading(false);
  };


  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
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
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? 'Generating...' : 'Get New Suggestions'}
            </button>
        </div>
      </div>
      
      {surprise && (
        <div className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
            <h4 className="text-xl font-semibold mb-3 dark:text-slate-200">✨ Your Surprise Pick!</h4>
            <SuggestionCard suggestion={surprise} />
        </div>
      )}

      { !isLoading && movieSuggestions.length === 0 && bookSuggestions.length === 0 && !surprise && (
        <p className="text-slate-500 dark:text-slate-400">Click a button to get personalized or random suggestions!</p>
      )}

      { isLoading && (
         <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Thinking of some great recommendations...</p>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {movieSuggestions.length > 0 && <h4 className="text-xl font-semibold mb-3 dark:text-slate-200">Movies</h4>}
          <div className="space-y-4">
            {movieSuggestions.map(s => <SuggestionCard key={s.title} suggestion={s}/>)}
          </div>
        </div>
        <div>
          {bookSuggestions.length > 0 && <h4 className="text-xl font-semibold mb-3 dark:text-slate-200">Books</h4>}
          <div className="space-y-4">
            {bookSuggestions.map(s => <SuggestionCard key={s.title} suggestion={s}/>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suggestions;
