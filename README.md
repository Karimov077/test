# TestGennis

Next.js, TypeScript, Prisma, Supabase PostgreSQL va Telegram webhook asosidagi test platformasi.

## Lokal ishga tushirish

```powershell
npm install
Copy-Item .env.example .env
```

`.env` ichidagi `DATABASE_URL` uchun Supabase database parolini kiriting. `BOT_TOKEN` va `APP_SECRET`ni yangilang; chatda ilgari yuborilgan Telegram tokenini BotFather orqali bekor qiling. `APP_SECRET` JWT va Telegram webhook’ni tekshirish uchun ishlatiladi.

```powershell
npm run db:push
npm run seed
npm run dev
```

## Telegram webhook

```powershell
npm run bot:setup -- https://YOUR-APP.vercel.app
```

Webhook `https://YOUR-APP.vercel.app/api/telegram/webhook` manziliga sozlanadi. Telegram va admin API’lar `ADMIN_TELEGRAM_ID`, `ADMIN_PASSWORD`, `BOT_TOKEN`, `APP_SECRET` qiymatlaridan foydalanadi.

## Vercel

Vercel Project Settings → Environment Variables хэсэгт `.env.example`-ийн таван утгыг тохируул. `DATABASE_URL`-ийн нууц үгийг Supabase Project Settings → Database хэсгээс ав; тусгай тэмдэгттэй бол URL-encode хийнэ. Vercel-д `DATABASE_URL` build environment-д байх шаардлагатай. API route-ууд runtime дээр ажилладаг тул build үед Supabase руу query хийхгүй.

Push хийсний дараа Vercel дахин deploy хийнэ. Build шалгалт:

```powershell
npm run typecheck
npm run build
```

`.env`-ийг Git рүү бүү оруул. `.env.example` дотор бодит token, password, database secret бүү хадгал.
