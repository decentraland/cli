FROM node:10
WORKDIR /usr/src/app

COPY package-lock.json .
COPY package.json .

RUN npm install
COPY . .
RUN npm link
RUN npm run build

EXPOSE 8080

ENTRYPOINT [ "/bin/bash" ]