FROM node:22-alpine

RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /app

USER runner

CMD ["node"]