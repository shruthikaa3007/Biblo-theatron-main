# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
# Pass GEMINI_API_KEY as a build argument
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:20-alpine AS backend
WORKDIR /app
COPY package.json package-lock.json ./
# Install only production dependencies
RUN npm install --omit=dev
COPY . .
# Remove node_modules from frontend build context that might have been copied
RUN rm -rf /app/dist/node_modules

# --- Stage 3: Final Production Image ---
FROM node:20-alpine
WORKDIR /app
# Copy production dependencies from backend stage
COPY --from=backend /app/node_modules ./node_modules
# Copy backend code
COPY --from=backend /app/server.js ./server.js
COPY --from=backend /app/models ./models
COPY package.json ./

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist

# Set env to signal we are in docker/production
ENV NODE_ENV=docker
EXPOSE 3001
CMD [ "node", "server.js" ]
