# Use Node.js 20 to match dependency requirements
FROM node:20-alpine

# Install build dependencies for native modules like better-sqlite3
RUN apk add --no-cache python3 make g++

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json (package-lock.json if exists)
COPY package.json ./
COPY package-lock.json* ./

# Install all dependencies (including devDependencies needed for frontend)
RUN npm install

# Copy the rest of the application code
COPY . .

# Create data directory for SQLite database
RUN mkdir -p data

# Set production environment
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]