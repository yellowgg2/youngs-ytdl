# youtube download bot

[ydls](https://hub.docker.com/r/mwader/ydls/dockerfile)와 함께 사용할 수 있는 봇

# 기능

URL을 붙여 넣으면 원하는 파일 타입으로 다운로드 해준다

# environments

docker-compose.yml의 env, args값 설명

| key              | 설명                                                         | 예시     |
| ---------------- | ------------------------------------------------------------ | -------- |
| `PUID`           | host PUID                                                    | 1000     |
| `GUID`           | host GUID                                                    | 1000     |
| `BOT_API_TOKEN`  | 봇 토큰                                                      |          |
| `ADMIN_USERNAME` | 텔레그램 아이디 - 관리자 용 (보통 설치하는 사람 아이디 입력) |          |
| `ADMIN_DESC`     | 관리자 설명                                                  |          |
| `ADMIN_CHATID`   | 특정 명령이나 에러 발생 시 메세지를 보낼 chat id             | 11223344 |

# 설치

> docker, docker-compose는 기본적으로 설치하셔야 합니다.

위의 환경변수 값들을 셋팅 후 아래 명령 실행 (environment와 args에 있는 PUID, PGID를 일치 시켜야함)

```sh
docker-compose up -d --build
```

# 주의사항

1. 다운로드 경로인 `/ytdlbot/download` 폴더를 원하는 host 경로에 마운트 시킨다
1. 시놀로지의 경우 Music folder에 마운트를 하면 indexing을 위해 `download-watch.sh`를 부팅 스케줄러로 걸어준다
   1. 이 작업을 하지 않으면 파일이 다운로드 되어도 안보일 수 있음
