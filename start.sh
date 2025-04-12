#!/bin/sh
git pull
docker build . -t fetchtvweb
docker stop fetchtvweb
docker rm fetchtvweb
docker run -p 5002:5001 --env-file .env --name fetchtvweb --restart=always --detach fetchtvweb
