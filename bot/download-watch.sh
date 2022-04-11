#!/bin/bash

while true
do
       touch ./lastwatch
       sleep 10
       find $DOWNLOAD_PATH -cnewer ./lastwatch -exec synoindex -R $DOWNLOAD_PATH {} \;
done
