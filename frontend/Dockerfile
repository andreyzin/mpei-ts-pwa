FROM node:22-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM development AS build
# Vite inlines these at build time; empty leaves analytics off in the image.
ARG VITE_UMAMI_SCRIPT_URL=
ARG VITE_UMAMI_WEBSITE_ID=
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

