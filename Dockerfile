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

# NEXT_PUBLIC_* are inlined by `next build`, so they MUST be present at build
# time. Railway passes service variables to the Docker build as build args —
# declare them here so the browser bundle gets the real values.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

ENV NODE_ENV=production
# Deepgram is the primary transcriber (cloud); Whisper model is optional.
EXPOSE 3000
CMD ["npm", "run", "start"]
