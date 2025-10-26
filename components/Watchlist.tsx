
import React, { useState, useMemo } from 'react';
import type { MediaItem as MediaItemType } from '../types';
import { MediaStatus, MediaType } from '../types';
import MediaItem from './MediaItem';

interface WatchlistProps {
  items: MediaItemType[];
  onDeleteItem: (id: string) => void;
  onUpdateStatus: (id: string, status: MediaStatus) => void;
  onUpdateRating: (id: string, rating: number) => void;
}

type FilterType = 'all' | MediaType;
type FilterStatus = 'all' | 'completed' | 'pending';

const Watchlist: React.FC<WatchlistProps> = ({ items, onDeleteItem, onUpdateStatus, onUpdateRating }) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const typeMatch = filterType === 'all' || item.type === filterType;
      const statusMatch = filterStatus === 'all' || 
        (filterStatus === 'completed' && (item.status === MediaStatus.Watched || item.status === MediaStatus.Read)) ||
        (filterStatus === 'pending' && (item.status === MediaStatus.ToWatch || item.status === MediaStatus.ToRead));
      return typeMatch && statusMatch;
    });
  }, [items, filterType, filterStatus]);

  const FilterButton = <T,>({ value, current, setter, children }: { value: T, current: T, setter: React.Dispatch<React.SetStateAction<T>>, children: React.ReactNode }) => (
    <button
        onClick={() => setter(value)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            current === value 
            ? 'bg-indigo-600 text-white shadow' 
            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
        }`}
    >
        {children}
    </button>
  );

  return (
    <section className="py-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">My Watchlist</h2>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <FilterButton value="all" current={filterType} setter={setFilterType}>All</FilterButton>
            <FilterButton value={MediaType.Movie} current={filterType} setter={setFilterType}>Movies</FilterButton>
            <FilterButton value={MediaType.Book} current={filterType} setter={setFilterType}>Books</FilterButton>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <FilterButton value="all" current={filterStatus} setter={setFilterStatus}>All Status</FilterButton>
            <FilterButton value="completed" current={filterStatus} setter={setFilterStatus}>Completed</FilterButton>
            <FilterButton value="pending" current={filterStatus} setter={setFilterStatus}>Pending</FilterButton>
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <MediaItem 
              key={item.id} 
              item={item} 
              onDelete={onDeleteItem} 
              onUpdateStatus={onUpdateStatus}
              onUpdateRating={onUpdateRating}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Your Watchlist is Empty</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Use the form above to add a movie or book!</p>
        </div>
      )}
    </section>
  );
};

export default Watchlist;
