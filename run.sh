#!/bin/sh

echo "Building image.."

docker build -t trading-bot .

echo "Running container.."

docker run --env-file .env -it --rm trading-bot