
import React from 'react';
import type { MediaItem as MediaItemType } from '../types';
import { MediaStatus, MediaType } from '../types';
import { StarIcon, TrashIcon } from './icons';

interface MediaItemProps {
  item: MediaItemType;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: MediaStatus) => void;
  onUpdateRating: (id: string, rating: number) => void;
}

const Rating: React.FC<{ rating: number | null; onRate: (rating: number) => void }> = ({ rating, onRate }) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} onClick={() => onRate(star)}>
          <StarIcon className={`w-6 h-6 transition-colors ${rating && star <= rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'}`} />
        </button>
      ))}
    </div>
  );
};


const MediaItem: React.FC<MediaItemProps> = ({ item, onDelete, onUpdateStatus, onUpdateRating }) => {
  const isCompleted = item.status === MediaStatus.Watched || item.status === MediaStatus.Read;
  const verbPast = item.type === MediaType.Movie ? 'Watched' : 'Read';
  const verbPresent = item.type === MediaType.Movie ? 'Watch' : 'Read';

  const handleStatusChange = () => {
    let newStatus: MediaStatus;
    if (isCompleted) {
        newStatus = item.type === MediaType.Movie ? MediaStatus.ToWatch : MediaStatus.ToRead;
    } else {
        newStatus = item.type === MediaType.Movie ? MediaStatus.Watched : MediaStatus.Read;
    }
    onUpdateStatus(item.id, newStatus);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col transition-transform hover:scale-105 duration-300">
      <img src={item.posterUrl} alt={item.title} className="w-full h-64 object-cover" />
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{item.title}</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {item.genres.slice(0, 3).map(genre => (
            <span key={genre} className="text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-1 rounded-full">
              {genre}
            </span>
          ))}
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 flex-grow">{item.description}</p>
        
        <div className="mt-auto space-y-4">
            {isCompleted && (
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Your Rating</p>
                    <Rating rating={item.rating} onRate={(r) => onUpdateRating(item.id, r)} />
                </div>
            )}
            <div className="flex justify-between items-center">
                <button
                    onClick={handleStatusChange}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isCompleted ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                >
                    {isCompleted ? `${verbPast}` : `Mark as ${verbPast}`}
                </button>
                <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full"
                    aria-label={`Delete ${item.title}`}
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MediaItem;
