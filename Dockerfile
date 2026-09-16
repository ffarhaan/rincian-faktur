FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 7860
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"
CMD ["npx", "next", "start", "-p", "7860", "-H", "0.0.0.0"]
