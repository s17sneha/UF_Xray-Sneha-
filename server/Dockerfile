# Multi-stage to keep final image small
FROM node:18-bullseye AS base

# Install Python and pip
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy server package manifests and install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy remaining server files
COPY . .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Environment
ENV NODE_ENV=production
ENV PYTHON_BIN=python3
ENV PORT=5000

EXPOSE 5000

# Start the server
CMD ["npm", "start"]
