
export enum MediaType {
  Movie = 'movie',
  Book = 'book',
}

export enum MediaStatus {
  Watched = 'watched',
  Read = 'read',
  ToWatch = 'to-watch',
  ToRead = 'to-read',
}

export interface MediaItem {
  id: string;
  user_id: string;
  type: MediaType;
  title: string;
  genres: string[];
  status: MediaStatus;
  rating: number | null;
  api_id: string;
  posterUrl: string;
  description: string;
}

export interface Suggestion {
    title: string;
    description: string;
    genres: string[];
    posterUrl: string;
    type: MediaType;
}

export interface AutocompleteSuggestion {
    title: string;
    type: 'movie' | 'book';
    year?: number;
}
