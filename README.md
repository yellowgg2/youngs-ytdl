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

`git clone --recurse-submodules https://github.com/yellowgg2/youngs-ytdl` 명령으로 submodule까지 clone 하시고 

> docker, docker-compose는 기본적으로 설치하셔야 합니다.

위의 환경변수 값들을 셋팅 후 아래 명령 실행

> environment와 args에 있는 PUID, PGID를 일치 시켜야함  
> UNAME은 변경할 필요 없습니다.

```sh
docker-compose up -d --build
```

# 기존 사용자

`ydls`이 포함되지 않은 구조로 사용하신 분은 아래 과정을 거쳐야합니다.

1. `git clone --recurse-submodules https://github.com/yellowgg2/youngs-ytdl` 명령으로 적당한 위치에 클론을 합니다.
1. 기존 폴더에서 `docker-compose down`으로 기존 컨테이너 삭제
1. 새로 다운로드 한 위치의 `docker-compose.yml` 파일을 기존에 폴더에 있는 파일에서 매치되는 값을 가져와 변경합니다.
   1. docker-compose.yml의 `args` 부분에 `PUID, PGID`가 새로 추가되었으니 확인하세요
1. 기존 폴더의 `db/ytdl-bot.db` 파일의 권한이 `root` 라면 `chown`으로 소유권 변경
1. 기존 폴더의 `download/` 폴더의 권한이 `root`라면 `chown`으로 소유권 변경
1. 위 두 폴더 `db, download`를 새로 클론한 폴더에 복사
1. 새로 클론한 폴더에서 `docker-compose up -d --build`로 다시 설치

> 위 과정이 복잡하시면 그냥 새로 설치하는게 빠를 수 있습니다.

# 주의사항

1. 다운로드 경로인 `/ytdlbot/download` 폴더를 원하는 host 경로에 마운트 시킨다
1. 시놀로지의 경우 Music folder에 마운트를 하면 indexing을 위해 `download-watch.sh`를 부팅 스케줄러로 걸어준다
   1. 이 작업을 하지 않으면 파일이 다운로드 되어도 안보일 수 있음
