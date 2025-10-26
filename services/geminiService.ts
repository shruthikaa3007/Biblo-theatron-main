import { GoogleGenerativeAI, type GenerateContentResponse, type RequestOptions, type GenerationConfig, type GenerateContentRequest, type GenerationConfig as GeminiGenerationConfig } from "@google/generative-ai";
import type { Suggestion, AutocompleteSuggestion } from 'types.ts';
import { MediaType } from 'types.ts';

// --- Use Vite's import.meta.env ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing. Check your .env file.");
    // Optionally, you could throw an error or have functions return null/empty immediately
    // throw new Error("Missing VITE_GEMINI_API_KEY");
}

// Initialize with the key loaded via Vite's env system
// Use optional chaining in case apiKey is missing to prevent runtime error
const ai = apiKey ? new GoogleGenerativeAI({ apiKey }) : null;


// --- Schemas remain the same ---
// (mediaDetailsSchema, suggestionsSchema, autocompleteSchema)

const mediaDetailsSchema = {
  type: "OBJECT", // Use string literals for Type enum values in schema
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
    type: "ARRAY", // Use string literals
    items: {
        type: "OBJECT", // Use string literals
        properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            genres: { type: "ARRAY", items: { type: "STRING" } },
            posterUrl: { type: "STRING", description: 'A placeholder image URL from https://picsum.photos/300/450' },
        },
        required: ['title', 'description', 'genres', 'posterUrl']
    }
};

const autocompleteSchema = {
    type: "ARRAY", // Use string literals
    items: {
        type: "OBJECT", // Use string literals
        properties: {
            title: { type: "STRING", description: "The title of the movie or book." },
            type: { type: "STRING", enum: ['movie', 'book'], description: "The type of media, either movie or book." },
            year: { type: "NUMBER", description: "The year of release or publication. Can be omitted if not readily available." },
        },
        required: ['title', 'type']
    }
};


// --- API Call Functions ---

// Helper for safe API calls
async function safeGenerateContent(request: GenerateContentRequest): Promise<GenerateContentResponse | null> {
    if (!ai) {
        console.error("Gemini AI client not initialized (API key missing?).");
        return null;
    }
    try {
        // Use getGenerativeModel to specify the model
        const model = ai.getGenerativeModel({ model: request.model || "gemini-2.5-flash" }); // Default model if not specified
        // Pass the rest of the request (contents, generationConfig)
        const result = await model.generateContent({
             contents: request.contents,
             generationConfig: request.generationConfig as GeminiGenerationConfig // Cast needed for schema/mimetype
        });
        return result; // The result structure might vary slightly, adjust processing below if needed

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // More specific error handling could be added here
        return null;
    }
}


export const fetchMediaDetails = async (query: string): Promise<Omit<Suggestion, 'type'> & { type: 'movie' | 'book' } | null> => {
   const request: GenerateContentRequest = {
       contents: [{ parts: [{ text: `Generate details for the movie or book titled "${query}". Infer whether it's a movie or a book. Use a relevant seed for the picsum URL (e.g., /seed/query/).` }] }],
       generationConfig: { // Use generationConfig
           responseMimeType: "application/json",
           responseSchema: mediaDetailsSchema,
       } as GeminiGenerationConfig, // Cast to correct type if needed
       model: "gemini-2.5-flash", // Specify model explicitly
   };

   const result = await safeGenerateContent(request);

    // Process response using optional chaining and standard structure
    const candidate = result?.response?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

   if (text) {
     try {
       return JSON.parse(text);
     } catch (jsonError) {
       console.error("Error parsing Gemini JSON response (fetchMediaDetails):", jsonError, "Raw text:", text);
       return null;
     }
   }
   console.log("No text content found in Gemini response (fetchMediaDetails).");
   return null;
};


export const fetchSuggestions = async (genres: string[], type: MediaType): Promise<Omit<Suggestion, 'type'>[]> => {
    if (genres.length === 0) return [];

    const request: GenerateContentRequest = {
        contents: [{ parts: [{ text: `Suggest three ${type}s for someone who enjoys the following genres: ${genres.join(', ')}. Do not suggest titles that are extremely popular or part of a major franchise. Provide unique and interesting recommendations.` }] }],
        generationConfig: { // Use generationConfig
            responseMimeType: "application/json",
            responseSchema: suggestionsSchema,
        } as GeminiGenerationConfig,
        model: "gemini-2.5-flash",
    };

    const result = await safeGenerateContent(request);
    const candidate = result?.response?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

   if (text) {
     try {
       return JSON.parse(text);
     } catch (jsonError) {
       console.error("Error parsing Gemini JSON response (fetchSuggestions):", jsonError, "Raw text:", text);
       return [];
     }
   }
   console.log("No text content found in Gemini response (fetchSuggestions).");
   return [];
};


export const fetchSurpriseSuggestion = async (): Promise<Suggestion | null> => {

    const request: GenerateContentRequest = {
        contents: [{ parts: [{ text: `Suggest one random, interesting, and lesser-known movie or book. Provide its title, a brief description, genres, and a placeholder poster URL from https://picsum.photos/300/450. Infer if it's a movie or book. Use a relevant seed for the picsum URL.` }] }],
        generationConfig: { // Use generationConfig
            responseMimeType: "application/json",
            responseSchema: mediaDetailsSchema,
        } as GeminiGenerationConfig,
        model: "gemini-2.5-flash",
    };

    const result = await safeGenerateContent(request);
    const candidate = result?.response?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (text) {
      try {
        const parsedResult = JSON.parse(text);
        // Ensure the type from the response is correctly mapped to your enum
        if (parsedResult && (parsedResult.type === 'movie' || parsedResult.type === 'book')) {
            return {
                ...parsedResult,
                type: parsedResult.type === 'movie' ? MediaType.Movie : MediaType.Book
            };
        } else {
             console.warn("Surprise suggestion response has invalid type:", parsedResult?.type);
             return null;
        }
      } catch (jsonError) {
        console.error("Error parsing Gemini JSON response (fetchSurpriseSuggestion):", jsonError, "Raw text:", text);
        return null;
      }
    }
    console.log("No text content found in Gemini response (fetchSurpriseSuggestion).");
    return null;
};


export const fetchAutocompleteSuggestions = async (query: string): Promise<AutocompleteSuggestion[]> => {
    if (!query) return [];

    const request: GenerateContentRequest = {
        contents: [{ parts: [{ text: `Provide up to 5 autocomplete suggestions for popular movie or book titles that start with "${query}". For each suggestion, include its type (movie or book) and year of release or publication if available.` }] }],
        generationConfig: { // Use generationConfig
            responseMimeType: "application/json",
            responseSchema: autocompleteSchema,
        } as GeminiGenerationConfig,
        model: "gemini-2.5-flash",
    };

    const result = await safeGenerateContent(request);
    const candidate = result?.response?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

   if (text) {
     try {
       const results: AutocompleteSuggestion[] = JSON.parse(text);
       return results;
     } catch (jsonError) {
       console.error("Error parsing Gemini JSON response (fetchAutocompleteSuggestions):", jsonError, "Raw text:", text);
       return [];
     }
   }
   console.log("No text content found in Gemini response (fetchAutocompleteSuggestions).");
   return [];
};

