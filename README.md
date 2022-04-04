# youtube download bot

[ydls](https://hub.docker.com/r/mwader/ydls/dockerfile)와 함께 사용할 수 있는 봇

# 기능

URL을 붙여 넣으면 mp3로 다운로드 해준다

# 설치 시 주의사항 (docker-compose.yml)

1. `PUID/GUID`를 host 계정과 맞춤
1. `BOT_API_TOKEN`에 나의 봇 토큰 설정
1. 다운로드 경로인 `/ytdlbot/download` 폴더를 원하는 host 경로에 마운트 시킨다
1. 시놀로지의 경우 Music folder에 마운트를 하면 indexing을 위해 `download-watch.sh`를 부팅 스케줄러로 걸어준다
   1. 이 작업을 하지 않으면 파일이 다운로드 되어도 안보일 수 있음
