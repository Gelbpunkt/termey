FROM alpine:edge

RUN apk add --no-cache linux-pam linux-pam-dev python3 make g++ nodejs-current npm

WORKDIR /termey

COPY . .

RUN echo "root\ntest" | passwd

CMD node .
