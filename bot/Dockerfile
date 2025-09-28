# Multi-stage build: First stage to get yt-dlp
FROM ghcr.io/jauderho/yt-dlp:latest AS yt-dlp-stage

# Second stage: Main Node.js application
FROM node:22.13.0
ENV TZ 'Asia/Seoul'

# Copy yt-dlp binary and Python dependencies from first stage
COPY --from=yt-dlp-stage /usr/local/bin/yt-dlp /usr/local/bin/yt-dlp
COPY --from=yt-dlp-stage /usr/bin/python3* /usr/bin/
COPY --from=yt-dlp-stage /usr/lib/python3* /usr/lib/
COPY --from=yt-dlp-stage /usr/local/lib/python3* /usr/local/lib/

RUN echo "deb http://archive.debian.org/debian stretch main contrib non-free" > /etc/apt/sources.list
#RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list
#RUN sed -i s/security.debian.org/archive.debian.org/g /etc/apt/sources.list
RUN echo $TZ > /etc/timezone && \
    apt-get update && \
    apt-get install -y tzdata python3 python3-minimal libpython3-stdlib && \
    rm /etc/localtime && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    apt-get clean

# Make yt-dlp executable
RUN chmod +x /usr/local/bin/yt-dlp

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
