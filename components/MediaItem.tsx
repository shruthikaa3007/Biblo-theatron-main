import React from 'react';
import type { MediaItem as MediaItemType } from '../types'; // Use type import alias
import { MediaStatus, MediaType } from '../types';
import { StarIcon, TrashIcon, PlayIcon } from './icons'; // Assuming icons are correctly exported

interface MediaItemProps {
  item: MediaItemType;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: MediaStatus) => void;
  // Correct the type to accept number OR null
  onUpdateRating: (id: string, rating: number | null) => void;
}

// Rating Component remains the same
const Rating: React.FC<{ rating: number | null; onRate: (rating: number | null) => void }> = ({ rating, onRate }) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} onClick={() => onRate(rating === star ? null : star)} title={`Rate ${star} star${star > 1 ? 's' : ''}`}>
          <StarIcon className={`w-6 h-6 transition-colors duration-200 ease-in-out ${rating && star <= rating ? 'text-yellow-400 hover:text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'}`} />
        </button>
      ))}
       {rating && (
            <button onClick={() => onRate(null)} className="ml-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Clear rating">
                Clear
            </button>
        )}
    </div>
  );
};


const MediaItemComponent: React.FC<MediaItemProps> = ({ item, onDelete, onUpdateStatus, onUpdateRating }) => {
  // Define all 3 states
  const isPending = item.status === MediaStatus.ToWatch || item.status === MediaStatus.ToRead;
  const isInProgress = item.status === MediaStatus.Watching || item.status === MediaStatus.Reading;
  const isCompleted = item.status === MediaStatus.Watched || item.status === MediaStatus.Read;

  // Define verb variants
  const verbPast = item.type === MediaType.Movie ? 'Watched' : 'Read';
  const verbPresent = item.type === MediaType.Movie ? 'Watch' : 'Read';
  const verbProgressive = item.type === MediaType.Movie ? 'Watching' : 'Reading';

  const handleStatusChange = () => {
    let newStatus: MediaStatus;
    if (item.type === MediaType.Movie) {
        if (item.status === MediaStatus.ToWatch) {
            newStatus = MediaStatus.Watching;
        } else if (item.status === MediaStatus.Watching) {
            newStatus = MediaStatus.Watched;
        } else { // item.status === MediaStatus.Watched
            newStatus = MediaStatus.ToWatch;
        }
    } else { // item.type === MediaType.Book
        if (item.status === MediaStatus.ToRead) {
            newStatus = MediaStatus.Reading;
        } else if (item.status === MediaStatus.Reading) {
            newStatus = MediaStatus.Read;
        } else { // item.status === MediaStatus.Read
            newStatus = MediaStatus.ToRead;
        }
    }
    onUpdateStatus(item.id, newStatus);
  };

  // Determine button text, title, style based on state
  let buttonText = '';
  let buttonTitle = '';
  let buttonStyle = '';
  let ButtonIcon = null;

  if (isPending) {
    buttonText = `Start ${verbProgressive}`;
    buttonTitle = `Mark as ${verbProgressive}`;
    // Green
    buttonStyle = 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-800/50';
    ButtonIcon = <PlayIcon className="h-4 w-4 mr-1" />;
  } else if (isInProgress) {
    buttonText = `Mark ${verbPast}`;
    buttonTitle = `Mark as ${verbPast}`;
    // Blue
    buttonStyle = 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50';
    // Simple checkmark
    ButtonIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
  } else { // isCompleted
    buttonText = `Mark To ${verbPresent}`;
    buttonTitle = `Reset status to To ${verbPresent}`;
    // Slate/Grey
    buttonStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600';
    // Checked circle
    ButtonIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
  }


  return (
    // Added group class for potential hover effects on children
    <div className="group bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative h-64 w-full overflow-hidden">
        <img
            src={item.posterUrl}
            alt={`Poster for ${item.title}`}
            // Use onError for fallback image
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite loop if fallback also fails
                target.src = `https://placehold.co/300x450/eee/aaa?text=Image+Not+Found`;
            }}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
         {/* Optional: Add a gradient overlay for text readability */}
         {/* <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent"></div> */}
         
         {/* Status Badge */}
         {isInProgress && (
            <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                {verbProgressive}
            </span>
         )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2" title={item.title}>
            {item.title}
        </h3>
        {/* Genres */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.genres.slice(0, 3).map(genre => (
            <span key={genre} className="text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              {genre}
            </span>
          ))}
        </div>
        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 flex-grow line-clamp-3" title={item.description}>
            {item.description || 'No description available.'}
        </p>

        {/* Actions & Rating - push to bottom */}
        <div className="mt-auto space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            {/* Show Rating only if item is completed */}
            {isCompleted && (
                <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Your Rating</p>
                    <Rating rating={item.rating} onRate={(r) => onUpdateRating(item.id, r)} />
                </div>
            )}
            {/* Action Buttons */}
            <div className="flex justify-between items-center">
                <button
                    onClick={handleStatusChange}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 flex items-center ${buttonStyle}`}
                    title={buttonTitle}
                >
                    {ButtonIcon}
                    {buttonText}
                </button>
                <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                    aria-label={`Delete ${item.title}`}
                    title={`Delete ${item.title}`}
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

// Export with a potentially different name if needed, but default is fine here
export default MediaItemComponent;
