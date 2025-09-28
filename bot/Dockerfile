FROM node:22.13.0
ENV TZ 'Asia/Seoul'

RUN echo "deb http://archive.debian.org/debian stretch main contrib non-free" > /etc/apt/sources.list
#RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list
#RUN sed -i s/security.debian.org/archive.debian.org/g /etc/apt/sources.list
RUN echo $TZ > /etc/timezone && \ 
    apt-get update && \
    apt-get install -y tzdata && \
    rm /etc/localtime && \ 
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \ 
    dpkg-reconfigure -f noninteractive tzdata && \ 
    apt-get clean

RUN mkdir -p /ytdlbot/download
RUN mkdir -p /ytdlbot/db

ARG UNAME
ARG PUID
ARG PGID
RUN groupadd -g $PGID -o $UNAME
RUN useradd -m -u $PUID -g $PGID -o -s /bin/sh $UNAME

WORKDIR /ytdlbot

COPY . .

RUN npm i

RUN chmod +x /ytdlbot/entry-point.sh
RUN chown -R $UNAME:$UNAME /ytdlbot
RUN ls -la
USER $UNAME

CMD ["/ytdlbot/entry-point.sh"]
