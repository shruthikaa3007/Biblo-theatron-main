
import React, { useState, useEffect, useRef } from 'react';
import type { MediaItem, AutocompleteSuggestion } from '../types';
import { MediaStatus, MediaType } from '../types';
import { fetchMediaDetails, fetchAutocompleteSuggestions } from '../services/geminiService';
import { PlusIcon } from './icons';

interface AddItemFormProps {
  onAddItem: (item: Omit<MediaItem, 'id' | 'user_id'>) => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onAddItem }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(async () => {
      const results = await fetchAutocompleteSuggestions(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setShowSuggestions(false);
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchMediaDetails(query);
      if (result) {
        onAddItem({
          type: result.type === 'movie' ? MediaType.Movie : MediaType.Book,
          title: result.title,
          genres: result.genres,
          status: result.type === 'movie' ? MediaStatus.ToWatch : MediaStatus.ToRead,
          rating: null,
          api_id: Math.random().toString(36).substring(7),
          posterUrl: result.posterUrl,
          description: result.description,
        });
        setQuery('');
      } else {
        setError('Could not find that title. Please try another.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <div className="px-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Add a Movie or Book</h2>
        <form onSubmit={handleSubmit} ref={formRef}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., 'The Matrix' or 'Pride and Prejudice'"
                className="w-full p-3 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                disabled={isLoading}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute w-full top-full mt-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-20 overflow-hidden">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-200 flex justify-between items-center transition-colors"
                      >
                        <div>
                          <span className="font-medium">{suggestion.title}</span>
                          {suggestion.year && <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({suggestion.year})</span>}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${suggestion.type === 'movie' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}`}>
                          {suggestion.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              className="flex justify-center items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                  <>
                      <PlusIcon className="w-5 h-5 mr-2"/>
                      Add Item
                  </>
              )}
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>
    </section>
  );
};

export default AddItemForm;
