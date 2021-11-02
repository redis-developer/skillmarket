#!/bin/bash

docker run \
  --rm \
  -v $(pwd):/app \
  --workdir /app \
  pandoc/core \
  README.md -f markdown -t odt -s -o README.odt
