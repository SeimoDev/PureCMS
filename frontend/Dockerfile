FROM node:24-alpine AS build

WORKDIR /src
ARG VITE_API_BASE_URL=/api
ARG NPM_CONFIG_REGISTRY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN if [ -n "$NPM_CONFIG_REGISTRY" ]; then npm config set registry "$NPM_CONFIG_REGISTRY"; fi && npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
