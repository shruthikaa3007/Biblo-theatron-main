// types.ts

export enum MediaType {
  Movie = 'movie',
  Book = 'book',
}

export enum MediaStatus {
  Watched = 'watched',
  Read = 'read',
  ToWatch = 'to-watch',
  ToRead = 'to-read',
  // Added "in-progress" statuses
  Watching = 'watching',
  Reading = 'reading',
}

export interface MediaItem {
  id: string; // Firestore document ID
  user_id: string; // Belongs to specific user
  type: MediaType;
  title: string;
  genres: string[];
  status: MediaStatus;
  rating: number | null; // e.g., 1-5 stars, null if not rated
  api_id: string; // Optional: ID from an external API (like TMDB or Google Books) or unique identifier
  posterUrl: string; // URL to the poster image
  description: string; // Brief summary
  // Optional: Add Firestore Timestamp if tracking creation/update times
  // createdAt?: import('firebase/firestore').Timestamp;
  // updatedAt?: import('firebase/firestore').Timestamp;
}

// Type for suggestions returned by the Gemini API
export interface Suggestion {
    title: string;
    description: string;
    genres: string[];
    posterUrl: string; // Should be a valid URL string
    type: MediaType; // Ensure this matches MediaType enum values
}

// Type for autocomplete suggestions returned by Gemini API
export interface AutocompleteSuggestion {
    title: string;
    type: 'movie' | 'book'; // Matches the expected string values
    year?: number; // Optional year
}
