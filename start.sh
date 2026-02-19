#!/bin/bash

echo "🎮 LUXURY BATTLE - Starting Server..."
echo ""

# Проверка зависимостей
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Сборка фронтенда
echo "🔨 Building frontend..."
npm run build

# Запуск сервера
echo "🚀 Starting server..."
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:3000/socket.io"
echo ""
echo "Press Ctrl+C to stop"
echo ""

node server.js
