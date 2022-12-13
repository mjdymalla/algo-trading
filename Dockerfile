FROM node:alpine

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

WORKDIR /build

CMD ["node", "index.js"]