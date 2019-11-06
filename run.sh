#!/bin/sh
cd "$(dirname "$0")" # I love me some relative paths
docker container run --rm -v $(pwd)/app:/app --env-file ./.env --name massage alekzonder/puppeteer
