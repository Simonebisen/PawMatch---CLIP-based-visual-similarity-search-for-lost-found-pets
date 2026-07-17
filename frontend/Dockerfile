FROM node:22-slim

WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host so the dev server is reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
