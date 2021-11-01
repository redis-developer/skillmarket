FROM node:lts-alpine as base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --prod

FROM base as build
RUN yarn install
COPY . .
RUN yarn build

FROM base
COPY --from=build /app/build/ .
CMD ["yarn", "start"]
# CMD ["yarn", "dev"]