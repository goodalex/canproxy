FROM alpine:latest

ENV VEGETA_VERSION 12.2.0

ADD https://github.com/tsenart/vegeta/releases/download/cli%2Fv${VEGETA_VERSION}/vegeta-${VEGETA_VERSION}-linux-amd64.tar.gz .
RUN tar -xzf vegeta-${VEGETA_VERSION}-linux-amd64.tar.gz && chmod +x vegeta && rm vegeta-${VEGETA_VERSION}-linux-amd64.tar.gz

CMD exec /bin/sh -c "trap : TERM INT; (while true; do sleep 1000; done) & wait"
