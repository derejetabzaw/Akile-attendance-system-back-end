FROM node:14

WORKDIR /app

RUN npm config set cache /tmp/.npm-cache --global

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 9000

CMD ["node", "index.js"]