FROM eclipse-temurin:21-jdk

RUN useradd -m runner

WORKDIR /app

COPY runner.sh /runner.sh

RUN chmod +x /runner.sh

USER runner

ENTRYPOINT ["/runner.sh"]