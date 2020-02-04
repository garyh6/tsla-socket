FROM node:10

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install
# RUN npm ci --only=production

COPY . .

CMD [ "yarn", "start" ]

EXPOSE 5000