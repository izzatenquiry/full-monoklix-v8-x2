# ---------- Build Stage ----------
FROM node:18-bullseye-slim AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy semua source code
COPY . .

# Build React app
RUN npm run build

# ---------- Production Stage ----------
FROM node:18-bullseye-slim

WORKDIR /app

# Install serve untuk host SPA
RUN npm install -g serve

# Copy hasil build sahaja
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 8080

# Start command
CMD ["serve", "-s", "dist", "-l", "8080"]
