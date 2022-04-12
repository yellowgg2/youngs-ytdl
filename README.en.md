[한글](README.md)

# youtube-dl download telegram bot

You can install this bot where `Docker` is installed. For instance, Synology NAS, Linux Server.

This bot is working with [ydls](https://hub.docker.com/r/mwader/ydls/dockerfile).

I modified [ydls](https://hub.docker.com/r/mwader/ydls/dockerfile) original code to add `Channel name and Upload date` to filename, so I had to include ydls code to this repo as submodule.

# Features

- Download Youtube

  - Supported Formats : `mp3, mp4, m4a, flac, ogg, wav, webm`
  - To download youtube, just send url to the bot and choose the format which you would like to download with
  - As soon as you choose a format, it will start downloading
  - Once downloading is completed, it will send back complete message.
  - It will automatically download youtube without choosing a format if you set default file types with `setft` (multiple formats can be chosen)

    <img src="./screenshots/download_tube.png" alt="drawing" width="300"/>

- User and Admin can be added separately

  - Modify `TELEGRAM_ADMIN_USERNAME` in`.env` to add `Admin`
  - `User` can be added by `Admin`, while operating, with telegram command

- User Menu

  - `User` means the one who is registered by `Admin`
  - `help`: Show help menu
  - `allusers`: Show all users registered
  - `setft`: Set default file types. If do so, it won't ask file type to be downloaded. (Default file types can be cleared with choosing `none`)
  - `showft`: Show default file types that User have made with `setft`

    <img src="./screenshots/user_menu.png" alt="drawing" width="300"/>

- Admin Menu

  - `Admin` is the one who can manage `Users`
  - `adduser`: Add `User`, or `Admin`
  - `upuser`: Update `User` or `Admin` info, especially description or user type
  - `deluser`: Delete `User`
  - `chtof`: Add `channel` to the filename that will be download (Toggled if executed the cmd again. **This will be applied to all users current and future users registered**)
  - `udtof`: Add `Upload Date` to the filename that will be download (Toggled if executed the cmd again. **This will be applied to all users current and future users registered**)

    <img src="./screenshots/admin_menu.png" alt="drawing" width="300"/>

- Delete file downloaded accidentally

  - To delete file from the download directory, reply to `download completed` message with one of the words below.
  - `지우기, 삭제, d, del, delete`

    <img src="./screenshots/delete_file.png" alt="drawing" width="300"/>

# environments

`.env` variables you need to set before installing it

| key                       | desc                                                                                      | example        |
| ------------------------- | ----------------------------------------------------------------------------------------- | -------------- |
| `PUID`                    | host UID (Check with `id -u`)                                                             | 1000           |
| `GUID`                    | host GID (Check with `id -g`)                                                             | 1000           |
| `TELEGRAM_BOT_API_TOKEN`  | Bot Api Token. This can be optained with [Bot Father](https://t.me/botfather) in Telegram |                |
| `TELEGRAM_ADMIN_USERNAME` | Telegram Id for `Admin`.                                                                  |                |
| `TELEGRAM_ADMIN_DESC`     | Admin User Description                                                                    | SuperMan       |
| `TELEGRAM_ADMIN_CHATID`   | Telegram Chat id for `Admin` to receive message with once error occurs                    | 11223344       |
| `DOWNLOAD_PATH`           | Download location in host machine                                                         | ./bot/download |
| `BOT_LANG`                | Set language (ko: Korean, en: English)                                                    | ko or en       |

# Installation

> Basically you _MUST_ install docker, docker-compose.

- Clone repo recursively with `git clone --recurse-submodules https://github.com/yellowgg2/youngs-ytdl`
- Modify `.env` file as you wish
- If you are using `Synology` and want to make it work with `DS audio` especially
  - You need to create a scheduler as boot script in control panel of Synology that executes `download-watch.sh` included in this repo for Synology to start indexing once download completed. (You MUST change `DOWNLOAD_PATH` in `download-watch.sh` to what `DS audio` watching)
  - You won't be able to see the file downloaded in `DS audio` if you don't do so
- Run `docker-compose up -d --build` finally

# Update

Executes the below commands sequentially

- git pull --recurse-submodules
- docker-compose down && docker-compose up -d --build
