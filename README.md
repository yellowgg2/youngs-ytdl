[한글](README.ko.md)

# YouTube Download Telegram Bot

A powerful Telegram bot for downloading videos and audio from YouTube and 1000+ other media sites. Works anywhere Docker can be installed (Linux servers, Synology NAS, etc.).

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Usage](#usage)
- [Update](#update)

## Overview

This bot uses the powerful media downloader [yt-dlp](https://github.com/yt-dlp/yt-dlp) internally. It automatically adds `channel name` and `upload date` to downloaded filenames for better organization.

## Features

### Media Download
- Supports YouTube and 1000+ other sites (Twitter, Instagram, TikTok, etc.)
  - [Complete list of supported sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- **Supported Formats**: `mp3`, `mp4`, `m4a`, `flac`, `ogg`, `wav`, `webm`
- Send URL to bot and choose format from interactive buttons
- Instant download starts after format selection
- Set default formats with `setft` command for automatic downloads (multiple formats supported)

  <img src="./screenshots/download_tube.png" alt="drawing" width="300"/>

### Playlist Download

- Automatically detects URLs starting with `https://www.youtube.com/playlist?list`
- Downloads all videos in the playlist sequentially
- **Note**: Playlist must be public
- Stop download anytime: send `정지`, `멈춤`, `s`, or `stop`

### User Management System

- Initial admin is set via `TELEGRAM_ADMIN_USERNAME` in `.env` file
- Admins can register regular users or additional admins

### User Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help menu |
| `/allusers` | List all registered users |
| `/setft` | Set default download formats (choose `none` to clear) |
| `/showft` | Show current default formats |
| `/ff [search]` | Search downloaded files |

  <img src="./screenshots/user_menu.png" alt="drawing" width="300"/>

### Admin Commands

| Command | Description |
|---------|-------------|
| `/ahelp` | Show admin help menu |
| `/adduser [ID] [Name] [Type]` | Add user/admin |
| `/upuser [ID] [Name] [Type]` | Update user info |
| `/deluser [ID]` | Delete user |
| `/chtof` | Toggle channel name in filename (**applies to all users**) |
| `/udtof` | Toggle upload date in filename (**applies to all users**) |

  <img src="./screenshots/admin_menu.png" alt="drawing" width="300"/>

### File Deletion Feature

Reply to any `download completed` message with one of these words to delete the file:
- `지우기`, `삭제`, `d`, `del`, `delete`

  <img src="./screenshots/delete_file.png" alt="drawing" width="300"/>

## Environment Configuration

`.env` file settings

| Variable | Description | Example |
|----------|-------------|----------|
| `PUID` | Host user ID (check with `id -u`) | `1000` |
| `PGID` | Host group ID (check with `id -g`) | `1000` |
| `TELEGRAM_BOT_API_TOKEN` | Bot token from [BotFather](https://t.me/botfather) | - |
| `TELEGRAM_ADMIN_USERNAME` | Admin Telegram ID (without `@`)<br>Example: `@superman` → `superman` | `superman` |
| `TELEGRAM_ADMIN_DESC` | Admin description | `SuperMan` |
| `TELEGRAM_ADMIN_CHATID` | Chat ID for error notifications | `11223344` |
| `DOWNLOAD_PATH` | Download location (host path) | `./bot/download` |
| `SEARCH_ROOT_PATH` | File search path (optional) | `/music` |
| `BOT_LANG` | Language (`ko`: Korean, `en`: English) | `ko` |

## Installation

### Prerequisites
- Docker
- Docker Compose

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/yellowgg2/youngs-ytdl
   cd youngs-ytdl
   ```

2. **Configure Environment**
   ```bash
   cp .env.sample .env
   # Edit .env file with your settings
   ```

3. **Start the Bot**
   ```bash
   docker compose up -d --build
   ```

### Additional Setup for Synology Users

To integrate with DS Audio:
1. Create a scheduled task in Control Panel (triggered at startup)
2. Add the `download-watch.sh` script to the task
3. Modify `DOWNLOAD_PATH` in the script to match DS Audio's watch folder
   ```bash
   DOWNLOAD_PATH="/music"  # Path monitored by DS Audio
   ```

## Usage

1. Search for your bot in Telegram and start it
2. Send a YouTube URL to the bot
3. Choose desired format (or use pre-configured defaults)
4. Wait for download completion

## Update

### Update yt-dlp Engine
Update to the latest yt-dlp version (for YouTube compatibility):
```bash
# Rebuild bot with latest yt-dlp (pulls latest base image)
docker compose build --pull ytdl-download-bot && docker compose up -d ytdl-download-bot
```

### Update Bot Code
Update to the latest bot code from repository:
```bash
# Pull latest code and rebuild
git pull
docker compose up -d --build
```

### Full System Update
Update everything to the latest versions:
```bash
git pull
docker compose build --pull --no-cache
docker compose up -d
```

> **Tip**: If YouTube downloads start failing, updating yt-dlp usually fixes the issue. Use the first command to quickly update only yt-dlp.
