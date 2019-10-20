#!/bin/sh
docker container run -it --rm -v $(pwd)/app:/app --env-file ./.env --name massage alekzonder/puppeteer