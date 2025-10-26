import React from 'react';
import { SunIcon, MoonIcon } from './icons';
import type { User } from 'firebase/auth'; // Import the User type

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user: User | null; // Add user prop
  handleSignOut: () => void; // Add sign-out handler
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode, user, handleSignOut }) => {
  return (
    <header className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-md p-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          🎬 Biblio-theatron
        </h1>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {user ? (
            // Show user info and Sign Out if logged in
            <div className="flex items-center space-x-2 sm:space-x-3">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200">
                {user.displayName || 'Welcome'}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            // You could place a "Sign In" button here, but we'll put it on the main page
            <div className="w-8"></div> // Placeholder to balance layout
          )}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
