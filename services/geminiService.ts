
import { GoogleGenAI, Type } from "@google/genai";
import type { Suggestion, AutocompleteSuggestion } from "../types";
import { MediaType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const mediaDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'The official title of the movie or book.' },
    type: { type: Type.STRING, description: 'The type of media, either "movie" or "book".', enum: ['movie', 'book']},
    genres: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of genres associated with the media.' },
    description: { type: Type.STRING, description: 'A brief, one-paragraph summary of the plot.' },
    posterUrl: { type: Type.STRING, description: 'A placeholder image URL from https://picsum.photos/300/450' },
  },
  required: ['title', 'type', 'genres', 'description', 'posterUrl'],
};

export const fetchMediaDetails = async (query: string): Promise<Omit<Suggestion, 'type'> & { type: 'movie' | 'book' } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate details for the movie or book titled "${query}". Infer whether it's a movie or a book. Use a relevant seed for the picsum URL (e.g., /seed/query/).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: mediaDetailsSchema,
      },
    });

    const text = response.text.trim();
    if (text) {
      return JSON.parse(text);
    }
    return null;
  } catch (error) {
    console.error("Error fetching media details from Gemini:", error);
    return null;
  }
};

const suggestionsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            genres: { type: Type.ARRAY, items: { type: Type.STRING } },
            posterUrl: { type: Type.STRING, description: 'A placeholder image URL from https://picsum.photos/300/450' },
        },
        required: ['title', 'description', 'genres', 'posterUrl']
    }
};

export const fetchSuggestions = async (genres: string[], type: MediaType): Promise<Omit<Suggestion, 'type'>[]> => {
    if (genres.length === 0) return [];
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Suggest three ${type}s for someone who enjoys the following genres: ${genres.join(', ')}. Do not suggest titles that are extremely popular or part of a major franchise. Provide unique and interesting recommendations.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestionsSchema,
            },
        });

        const text = response.text.trim();
        if (text) {
            return JSON.parse(text);
        }
        return [];
    } catch (error) {
        console.error("Error fetching suggestions from Gemini:", error);
        return [];
    }
};

export const fetchSurpriseSuggestion = async (): Promise<Suggestion | null> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Suggest one random, interesting, and lesser-known movie or book. Provide its title, a brief description, genres, and a placeholder poster URL from https://picsum.photos/300/450. Infer if it's a movie or book. Use a relevant seed for the picsum URL.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: mediaDetailsSchema,
        },
      });
  
      const text = response.text.trim();
      if (text) {
        const result = JSON.parse(text);
        return {
            ...result,
            type: result.type === 'movie' ? MediaType.Movie : MediaType.Book
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching surprise suggestion from Gemini:", error);
      return null;
    }
};

const autocompleteSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The title of the movie or book." },
            type: { type: Type.STRING, enum: ['movie', 'book'], description: "The type of media, either movie or book." },
            year: { type: Type.NUMBER, description: "The year of release or publication. Can be omitted if not readily available." },
        },
        required: ['title', 'type']
    }
};

export const fetchAutocompleteSuggestions = async (query: string): Promise<AutocompleteSuggestion[]> => {
    if (!query) return [];
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Provide up to 5 autocomplete suggestions for popular movie or book titles that start with "${query}". For each suggestion, include its type (movie or book) and year of release or publication if available.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: autocompleteSchema,
            },
        });

        const text = response.text.trim();
        if (text) {
            const results: AutocompleteSuggestion[] = JSON.parse(text);
            return results;
        }
        return [];
    } catch (error) {
        console.error("Error fetching autocomplete suggestions from Gemini:", error);
        return [];
    }
};
