# TestGennis

A Telegram-based student testing platform for private educational use, built with React, TypeScript, Prisma, PostgreSQL, and a Vercel-compatible API layer.

## 1. Project overview

This project is designed for a teacher who manages everything from an admin panel and distributes individual student credentials to students. Students then access the platform via Telegram, authenticate, enter a secret test code, solve the quiz, and receive an immediate score summary.

Key features:
- Admin panel for managing students, tests, questions, and results
- Telegram bot with `/start`, `/login`, `/test`, `/result`, `/help`, and `/logout`
- PostgreSQL with Prisma ORM on Supabase Free
- JWT-based admin authentication
- Secure password hashing with bcrypt
- Score calculation on the backend only
- Vercel-compatible API routes
- Production webhook support for Telegram

## 2. Requirements

- Node.js 20+
- npm
- A Supabase Free account
- A Telegram bot token from BotFather
- A Vercel account for deployment
- A valid PostgreSQL connection string from Supabase

## 3. Supabase Free setup

1. Open Supabase and create a new project.
2. Choose a project name, database password, and region.
3. Wait for the project to finish provisioning.
4. Open Project Settings -> Database.
5. Copy the connection string for Prisma.

## 4. Create Supabase project

In PowerShell:

```powershell
# Install dependencies
npm install
```

Then configure your environment variables in `.env` before running Prisma or the app.

## 5. Get DATABASE_URL

In Supabase:
- Go to Project Settings > Database
- Copy the connection string under Connection string > PostgreSQL connection string
- Use the URL in `.env` as `DATABASE_URL`
- Set `DIRECT_URL` to the same connection string if needed for Prisma direct connection

Example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require"
```

## 6. Environment variables

Create a `.env` file in the project root. Example:

```env
BOT_TOKEN=your_bot_token_here
ADMIN_TELEGRAM_ID=1840817356
ADMIN_PASSWORD=change_me_admin_password
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=your_long_random_secret
WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=https://your-app.vercel.app
```

Important:
- Never hardcode the Telegram bot token in code.
- Never commit `.env` to Git.
- Use a strong random value for `JWT_SECRET` and `WEBHOOK_SECRET`.

## 7. Install dependencies

In PowerShell:

```powershell
npm install
```

## 8. Prisma migration

During setup:

```powershell
npx prisma migrate deploy
```

If you are creating a new database from scratch, also run the seed command once the migration has succeeded.

## 9. Seed database

Run:

```powershell
npm run seed
```

This creates:
- Demo admin configuration for Telegram ID `1840817356`
- 3 demo tests
- 15 questions for each test
- Example student accounts with sample credentials

## 10. Run locally

Start the local app in PowerShell:

```powershell
npm run dev
```

The app runs with:
- Vite frontend on `http://localhost:5173`
- Local Express API server on the same dev setup

## 11. Create Telegram bot

1. Open Telegram and search for `@BotFather`.
2. Run `/newbot`.
3. Choose a bot name and username.
4. Copy the token.
5. Save it in `.env` as `BOT_TOKEN`.

## 12. Configure webhook

The production environment uses Telegram webhooks, not polling.

Set the webhook URL to your deployed app:

```powershell
$env:WEBHOOK_URL="https://your-app.vercel.app"
$env:BOT_TOKEN="YOUR_BOT_TOKEN"
$env:WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
npx tsx src/scripts/setupWebhook.ts
```

The webhook endpoint is:

```text
https://your-app.vercel.app/api/telegram/webhook
```

## 13. Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Set the root as the project directory.
4. Use the same Node.js version as the project requires.
5. Add environment variables in Vercel Settings > Environment Variables.

## 14. Add Vercel environment variables

Add the following variables in Vercel:

```env
BOT_TOKEN=your_bot_token_here
ADMIN_TELEGRAM_ID=1840817356
ADMIN_PASSWORD=change_me_admin_password
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=your_long_random_secret
WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=https://your-app.vercel.app
```

## 15. Configure production webhook

After deployment, run the webhook setup script again with the deployed URL:

```powershell
$env:WEBHOOK_URL="https://your-app.vercel.app"
$env:BOT_TOKEN="YOUR_BOT_TOKEN"
$env:WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
npx tsx src/scripts/setupWebhook.ts
```

## 16. Troubleshooting

### Prisma errors

If Prisma reports missing environment variables, check that `.env` exists and all required fields are filled.

### Telegram bot not responding

Check:
- `BOT_TOKEN` is valid
- `WEBHOOK_SECRET` matches the deployed webhook secret
- The webhook endpoint is reachable

### Admin login fails

Check:
- `ADMIN_TELEGRAM_ID` matches the admin Telegram ID
- `ADMIN_PASSWORD` is correctly set in Vercel and `.env`

### Database errors

Check the Supabase connection string and verify the database is active.

## 17. Deployment notes

This project is designed for:
- Vercel Free
- Supabase Free PostgreSQL
- Telegram Bot API

It does not require Docker, Redis, a VPS, or paid services.

## 18. First admin setup

1. Add the Telegram ID from `.env` to the admin configuration.
2. Start the app.
3. Log in to the admin panel using the configured Telegram ID and `ADMIN_PASSWORD`.
4. Create students from the admin dashboard.

## 19. How to create the first student

From the admin panel:
- Open Students
- Click O‘quvchi qo‘shish
- Fill in first name, last name, username, and password
- Save
- The credentials are displayed once and can be shared with the student

## 20. How to create the first test

From the admin panel:
- Open Tests
- Click Test yaratish
- Add a title, description, unique secret code, and status
- Save the test
- Add questions and set the correct answer for each one
- Activate the test to allow students to begin it

## 21. Project structure

```text
/
├── api/
│   └── index.ts
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── lib/
│   ├── scripts/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── server.ts
│   └── vite-env.d.ts
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
├── vite.config.ts
├── README.md
└── .vercel/
```

## 22. Important security notes

- Password hashes are stored instead of plain-text passwords.
- Student credentials are never used in frontend markup.
- Scores are calculated only on the backend.
- Telegram webhook secret is validated on each request.
- Admin routes are protected with JWT validation.
- Prisma protects the app from SQL injection by using parameterized queries.
