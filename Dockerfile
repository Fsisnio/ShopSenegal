FROM python:3.12-alpine

WORKDIR /app

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY . .

EXPOSE 10000

ENTRYPOINT ["/docker-entrypoint.sh"]
