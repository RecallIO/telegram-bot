# Telegram RecallIO Bot

This project implements a simple Telegram bot that stores user messages as memories using the [RecallIO](https://www.npmjs.com/package/recallio) service. Users can recall their memories through the `/recall` command.

## Prerequisites

- Node.js 20+
- A Telegram bot token
- A RecallIO API key and project ID

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your credentials:

   ```bash
   cp .env.example .env
   # Edit .env and set TELEGRAM_TOKEN, RECALLIO_API_KEY and RECALLIO_PROJECT_ID
   ```

## Build

Compile the TypeScript source to JavaScript:

```bash
npm run build
```

The compiled files are written to the `dist` directory.

## Run

After building, start the bot with:

```bash
npm start
```

The bot will store every non-command message as a memory and will respond to `/recall <query>` with the best matching memory content.
