# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Telegram bot for downloading YouTube videos and other media using yt-dlp. The bot is containerized using Docker and consists of two main services:
- `ytdl-download-bot`: TypeScript-based Telegram bot
- `ytdl-service` & `yt-dlp-service`: Backend services for media downloading

## Development Commands

### Running the Application
```bash
# Start all services
docker-compose up -d --build

# Stop services
docker-compose down

# View logs
docker logs ytdl-download-bot
```

### Bot Development (TypeScript)
```bash
# Navigate to bot directory
cd bot

# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production
npm start

# Run tests
npm test
```

## Architecture

### Service Structure
- **Bot Service** (`bot/`): TypeScript Telegram bot handling user interactions
  - `src/app.ts`: Main entry point
  - `src/services/telegram/`: Telegram bot logic
  - `src/services/sqlite/`: Database operations
  - `src/models/`: Data models
  - `src/language/`: Internationalization (ko/en)

### Database
- SQLite database stored in `bot/db/`
- Handles user authorization and settings

### Download Process
1. User sends YouTube URL to bot
2. Bot validates user authorization
3. User selects format (or uses default)
4. Bot sends request to ydls/yt-dlp service
5. Downloaded files saved to configured `DOWNLOAD_PATH`

## Environment Configuration

Required `.env` variables (see `.env.sample`):
- `TELEGRAM_BOT_API_TOKEN`: Bot token from BotFather
- `TELEGRAM_ADMIN_USERNAME`: Admin Telegram ID
- `TELEGRAM_ADMIN_CHATID`: Admin chat ID for error notifications
- `DOWNLOAD_PATH`: Host path for downloads
- `BOT_LANG`: Language (ko/en)
- `PUID/PGID`: User/Group IDs for file permissions

## Key Bot Commands

### User Commands
- `help`: Show help menu
- `setft`: Set default file types
- `showft`: Show configured default file types
- `allusers`: List all registered users

### Admin Commands
- `ahelp`: Show admin help
- `adduser`: Add new user/admin
- `upuser`: Update user info
- `deluser`: Delete user
- `chtof`: Toggle channel name in filename
- `udtof`: Toggle upload date in filename

## Update Process
```bash
git pull --recurse-submodules
docker-compose down && docker-compose up -d --build
```