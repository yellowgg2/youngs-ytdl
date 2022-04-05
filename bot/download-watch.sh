#!/bin/bash

while true
do
       touch ./lastwatch
       sleep 10
       find /volume1/Music/bot-download -cnewer ./lastwatch -exec synoindex -R /volume1/Music/bot-download {} \;
done
