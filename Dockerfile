FROM node:10

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN mv config.example.js config.js

ENTRYPOINT node index.js
