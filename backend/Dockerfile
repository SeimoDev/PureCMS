FROM golang:1.24-alpine AS build

WORKDIR /src
ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=$GOPROXY
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/cms-api ./cmd/api

FROM alpine:3.21

WORKDIR /app
RUN apk add --no-cache ca-certificates && adduser -D -H cms
COPY --from=build /out/cms-api /app/cms-api
COPY migrations /app/migrations
RUN mkdir -p /app/uploads && chown -R cms:cms /app/uploads
USER cms

EXPOSE 8080
CMD ["/app/cms-api"]
