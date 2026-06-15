# AutoClip AI — production image (Next.js + ffmpeg + yt-dlp)
# The pipeline needs ffmpeg (with libass) and yt-dlp, so this runs on a real
# container/VM (Railway, Render, Fly, a VPS) — not on serverless.
FROM node:20-bookworm-slim

# System deps: ffmpeg (Debian build includes libass), yt-dlp, python3
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-pip ca-certificates curl \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Deepgram is the primary transcriber (cloud); Whisper model is optional.
EXPOSE 3000
CMD ["npm", "run", "start"]
