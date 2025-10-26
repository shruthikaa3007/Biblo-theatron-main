// Remove SDK type imports - define minimal types locally if needed
// import type { GenerateContentResponse, GenerateContentRequest, GenerationConfig } from "@google/generative-ai";

// Correct the import path assuming types.ts is in the root directory
import type { Suggestion, AutocompleteSuggestion } from '../types.ts'; // Corrected Path
import { MediaType } from '../types.ts'; // Corrected Path

// --- Use Vite's import.meta.env ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const geminiApiUrlBase = "https://generativelanguage.googleapis.com/v1beta/models";

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing. Check your .env file or environment variables.");
}

// --- Minimal Local Types for API Payload ---
// (Based on the structure used in the functions)
interface ApiGenerationConfig {
    responseMimeType?: "application/json";
    responseSchema?: object; // Use generic object for schema
    // Add other config fields if needed (temperature, topK, etc.)
}

interface ApiPart {
    text: string;
}

interface ApiContent {
    parts: ApiPart[];
    role?: string; // Optional role, defaults to 'user' if omitted
}

interface ApiGenerateContentRequest {
    contents: ApiContent[];
    generationConfig?: ApiGenerationConfig;
    // model name is part of the URL, not the payload body usually
}

// --- Schemas remain the same ---
// (Defined using standard JSON object format, compatible with API)
const mediaDetailsSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: 'The official title of the movie or book.' },
    type: { type: "STRING", description: 'The type of media, either "movie" or "book".', enum: ['movie', 'book']},
    genres: { type: "ARRAY", items: { type: "STRING" }, description: 'A list of genres associated with the media.' },
    description: { type: "STRING", description: 'A brief, one-paragraph summary of the plot.' },
    posterUrl: { type: "STRING", description: 'A placeholder image URL from https://picsum.photos/300/450' },
  },
  required: ['title', 'type', 'genres', 'description', 'posterUrl'],
};

const suggestionsSchema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            genres: { type: "ARRAY", items: { type: "STRING" } },
            posterUrl: { type: "STRING", description: 'A placeholder image URL from https://picsum.photos/300/450' },
        },
        required: ['title', 'description', 'genres', 'posterUrl']
    }
};

// Schema for surprise me (returns multiple)
const surpriseSuggestionsSchema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            title: { type: "STRING" },
            type: { type: "STRING", enum: ['movie', 'book'], description: "The type of media, either movie or book." },
            genres: { type: "ARRAY", items: { type: "STRING" } },
            description: { type: "STRING" },
            posterUrl: { type: "STRING", description: 'A placeholder image URL from https://picsum.photos/300/450' },
        },
        required: ['title', 'type', 'genres', 'description', 'posterUrl']
    }
};


const autocompleteSchema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            title: { type: "STRING", description: "The title of the movie or book." },
            type: { type: "STRING", enum: ['movie', 'book'], description: "The type of media, either movie or book." },
            year: { type: "NUMBER", description: "The year of release or publication. Can be omitted if not readily available." },
        },
        required: ['title', 'type']
    }
};


// --- API Call Functions ---

// Helper for safe API calls using fetch with backoff
async function safeGenerateContentWithFetch(payload: ApiGenerateContentRequest, modelName = "gemini-2.5-flash", retries = 3, delay = 1000): Promise<any | null> {
    if (!apiKey) {
        console.error("Gemini API key is missing. Cannot make API calls.");
        return null;
    }

    const apiUrl = `${geminiApiUrlBase}/${modelName}:generateContent?key=${apiKey}`;

    try {
        console.log("Calling Gemini API:", apiUrl); // Log API call
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("API Response Status:", response.status); // Log status

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Error calling Gemini API: ${response.status} ${response.statusText}`, errorBody);

            if (response.status === 429 && retries > 0) {
                 console.warn(`Gemini API throttled. Retrying in ${delay / 1000}s... (${retries} retries left)`);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 return safeGenerateContentWithFetch(payload, modelName, retries - 1, delay * 2);
            }
            // Throw error for non-retriable issues
            throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorBody}`);
        }

        const responseData = await response.json();
        console.log("API Response Data:", JSON.stringify(responseData, null, 2)); // Log response data
        return responseData;

    } catch (error: any) {
         if (retries > 0 && (error.message?.includes('network') || error.message?.includes('failed to fetch'))) {
             console.warn(`Network error during Gemini API call. Retrying in ${delay / 1000}s... (${retries} retries left)`);
             await new Promise(resolve => setTimeout(resolve, delay));
             return safeGenerateContentWithFetch(payload, modelName, retries - 1, delay * 2);
         }
        console.error("Fetch error calling Gemini API:", error);
        return null; // Return null on final failure
    }
}


export const fetchMediaDetails = async (query: string): Promise<Omit<Suggestion, 'type'> & { type: 'movie' | 'book' } | null> => {
   const payload: ApiGenerateContentRequest = { // Use local type
       contents: [{ parts: [{ text: `Generate details for the movie or book titled "${query}". Infer whether it's a movie or a book. Use a relevant seed for the picsum URL (e.g., /seed/query/).` }] }],
       generationConfig: {
           responseMimeType: "application/json",
           responseSchema: mediaDetailsSchema,
       },
   };

   const result = await safeGenerateContentWithFetch(payload, "gemini-2.5-flash");
   const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

   if (text) {
     try {
       const parsedResult = JSON.parse(text);
        if (parsedResult && typeof parsedResult === 'object' && parsedResult.title && (parsedResult.type === 'movie' || parsedResult.type === 'book')) {
           return parsedResult;
        } else {
            console.warn("Parsed media details response is invalid or lacks required fields:", parsedResult);
            return null;
        }
     } catch (jsonError) {
       console.error("Error parsing Gemini JSON response (fetchMediaDetails):", jsonError, "Raw text:", text);
       return null;
     }
   }
   console.log("No text content found in Gemini response (fetchMediaDetails). Full result:", JSON.stringify(result, null, 2)); // Log full result on failure
   return null;
};


export const fetchSuggestions = async (genres: string[], type: MediaType): Promise<Omit<Suggestion, 'type'>[]> => {
    if (!genres || genres.length === 0) return [];

    const payload: ApiGenerateContentRequest = { // Use local type
        contents: [{ parts: [{ text: `Suggest three ${type}s for someone who enjoys the following genres: ${genres.join(', ')}. Do not suggest titles that are extremely popular or part of a major franchise. Provide unique and interesting recommendations.` }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: suggestionsSchema,
        },
    };

    const result = await safeGenerateContentWithFetch(payload, "gemini-2.5-flash");
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

   if (text) {
     try {
       const parsedResult = JSON.parse(text);
       if (Array.isArray(parsedResult)) {
           return parsedResult;
       } else {
           console.warn("Parsed suggestions response is not an array:", parsedResult);
           return [];
       }
     } catch (jsonError) {
       console.error("Error parsing Gemini JSON response (fetchSuggestions):", jsonError, "Raw text:", text);
       return [];
     }
   }
   console.log("No text content found in Gemini response (fetchSuggestions). Full result:", JSON.stringify(result, null, 2)); // Log full result on failure
   return [];
};


export const fetchSurpriseSuggestion = async (): Promise<Suggestion[] | null> => {

    const payload: ApiGenerateContentRequest = { // Use local type
        contents: [{ parts: [{ text: `Suggest three random, interesting, and lesser-known movies or books. Provide title, description, genres, type (movie or book), and a placeholder poster URL from https://picsum.photos/300/450. Use a relevant seed for the picsum URL.` }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: surpriseSuggestionsSchema, // Use new schema for multiple items
        },
    };

    const result = await safeGenerateContentWithFetch(payload, "gemini-2.5-flash");
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      try {
        const parsedResult = JSON.parse(text);
        if (Array.isArray(parsedResult) && parsedResult.length > 0) {
            // Map the 'type' string to the MediaType enum
            return parsedResult.map((item: any) => ({
                ...item,
                type: item.type === 'movie' ? MediaType.Movie : MediaType.Book
            }));
        } else {
             console.warn("Parsed surprise suggestion response is not a valid array:", parsedResult);
             return null;
        }
      } catch (jsonError) {
        console.error("Error parsing Gemini JSON response (fetchSurpriseSuggestion):", jsonError, "Raw text:", text);
        return null;
      }
    }
    console.log("No text content found in Gemini response (fetchSurpriseSuggestion). Full result:", JSON.stringify(result, null, 2)); // Log full result on failure
    return null;
};


export const fetchAutocompleteSuggestions = async (query: string): Promise<AutocompleteSuggestion[]> => {
    if (!query || query.trim().length < 2) return [];

    const payload: ApiGenerateContentRequest = { // Use local type
        contents: [{ parts: [{ text: `Provide up to 5 autocomplete suggestions for popular movie or book titles that start with "${query}". For each suggestion, include its type (movie or book) and year of release or publication if available.` }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: autocompleteSchema,
        },
    };

    const result = await safeGenerateContentWithFetch(payload, "gemini-2.5-flash");
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

   if (text) {
     try {
       const results: AutocompleteSuggestion[] = JSON.parse(text);
       if (Array.isArray(results)) {
           return results;
       } else {
            console.warn("Parsed autocomplete response is not an array:", results);
            return [];
       }
     } catch (jsonError) {
       console.error("Error parsing Gemini JSON response (fetchAutocompleteSuggestions):", jsonError, "Raw text:", text);
       return [];
     }
   }
   console.log("No text content found in Gemini response (fetchAutocompleteSuggestions). Full result:", JSON.stringify(result, null, 2)); // Log full result on failure
   return [];
};
