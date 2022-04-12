#!/bin/bash

DOWNLOAD_PATH=synology ds audio path

while true
do
       touch ./lastwatch
       sleep 10
       find $DOWNLOAD_PATH -cnewer ./lastwatch -exec synoindex -R $DOWNLOAD_PATH {} \;
done
