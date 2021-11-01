#!/bin/bash
set -e -o pipefail

docker compose up -d

sleep 10

alice_id=$(http :8080/users \
   name="Alice" \
   expertises:='["piano", "dancing"]' \
   interests:='["spanish", "bowling"]' \
   location:='{"longitude": 2.2948552, "latitude": 48.8736537}')

http :8080/users \
   name="Bob" \
   expertises:='["french", "spanish"]' \
   interests:='["piano"]' \
   location:='{"longitude": 2.2945412, "latitude": 48.8583206}'

http :8080/users \
   name="Charles" \
   expertises:='["spanish", "bowling"]' \
   interests:='["piano", "dancing"]' \
   location:='{"longitude": -0.124772, "latitude": 51.5007169}'

http ":8080/users/${alice_id}/matches?radiusKm=15"

docker compose down --volumes --remove-orphans
