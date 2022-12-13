#!/bin/sh

URL=git@github.com:MJDymalla/algo-trading.git

REPO=trading-bot

git pull

docker build -t trading-bot .

docker run --env-file .env -it --rm trading-bot