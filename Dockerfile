FROM node:10

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN mv config.example.js config.js
RUN mv database.example.js database.json

ENTRYPOINT node node_modules/db-migrate/bin/db-migrate up && node index.js
