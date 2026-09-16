FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3005
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "npx next start -p ${PORT:-3005} -H 0.0.0.0"]
