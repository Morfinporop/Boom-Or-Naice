# LUXURY BATTLE - Multiplayer Game

Мультиплеерная игра в стиле TikTok где два игрока соревнуются за люксовые бренды.

## Игра

**Правила:**
1. Каждый игрок выбирает люксовый предмет (CHANEL, ROLEX, GUCCI, и т.д.)
2. Разместите 3 своих предмета на поле 3×3
3. По очереди угадывайте где находятся предметы соперника
4. Кто первый откроет все 3 предмета соперника - побеждает!
5. У каждого игрока 30 секунд на ход

## Режимы игры

- **CREATE GAME** - создать игру и получить Game ID для друга
- **JOIN GAME** - присоединиться по Game ID
- **QUICK MATCH** - быстрый поиск случайного соперника

## Деплой на Railway.app

### Шаг 1: Подготовка
1. Загрузите код в GitHub репозиторий

### Шаг 2: Деплой
1. Создайте новый проект на [railway.app](https://railway.app)
2. Выберите "Deploy from GitHub repo"
3. Выберите ваш репозиторий

### Шаг 3: Настройка порта
1. Перейдите в Settings → Networking
2. Установите Target port: **8080**
3. Нажмите "Generate Domain"

Railway автоматически:
- Установит зависимости через `npm install`
- Соберет фронтенд через `npm run build`
- Запустит сервер через `npm start`

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Сборка и запуск
npm run build
npm start
```

Сервер будет доступен на http://localhost:8080

## Технологии

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + Socket.io
- **Real-time**: WebSocket через Socket.io
- **Hosting**: Railway.app

## Структура проекта

```
├── src/
│   ├── App.tsx          # Главный компонент игры
│   ├── main.tsx         # Точка входа React
│   ├── index.css        # Стили
│   └── utils/cn.ts      # Утилиты
├── server.js            # Node.js сервер
├── package.json         # Зависимости и скрипты
├── railway.json         # Конфиг Railway
└── Procfile             # Команда запуска
```

## Переменные окружения

Railway автоматически установит переменную `PORT`.
Сервер по умолчанию использует порт 8080.
