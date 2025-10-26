
import type { MediaItem } from './types';
import { MediaType, MediaStatus } from './types';

export const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: '1',
    user_id: 'user1',
    type: MediaType.Movie,
    title: 'Inception',
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    status: MediaStatus.Watched,
    rating: 5,
    api_id: '27205',
    posterUrl: 'https://picsum.photos/seed/inception/300/450',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.'
  },
  {
    id: '2',
    user_id: 'user1',
    type: MediaType.Movie,
    title: 'Interstellar',
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    status: MediaStatus.ToWatch,
    rating: null,
    api_id: '157336',
    posterUrl: 'https://picsum.photos/seed/interstellar/300/450',
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.'
  },
  {
    id: '3',
    user_id: 'user1',
    type: MediaType.Book,
    title: 'Dune',
    genres: ['Sci-Fi', 'Adventure'],
    status: MediaStatus.Read,
    rating: 5,
    api_id: 'mD-fDAAAQBAJ',
    posterUrl: 'https://picsum.photos/seed/dune/300/450',
    description: 'The story of Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, who must travel to the most dangerous planet in the universe to ensure the future of his family and his people.'
  },
  {
    id: '4',
    user_id: 'user1',
    type: MediaType.Book,
    title: 'Project Hail Mary',
    genres: ['Sci-Fi'],
    status: MediaStatus.ToRead,
    rating: null,
    api_id: '1',
    posterUrl: 'https://picsum.photos/seed/hailmary/300/450',
    description: 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish.'
  }
];
