FROM python:3.12-alpine

RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /app

USER runner

CMD ["python3"]