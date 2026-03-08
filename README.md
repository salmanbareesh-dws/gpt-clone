## ChatGPT-like Tool (Next.js + PostgreSQL)

This project includes:

- Next.js (React) frontend
- TypeScript
- PostgreSQL database with Prisma ORM
- Authentication with roles: `ADMIN` and `USER`
- Chat interface with stored chat history
- Admin panel to create/manage users

## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Configure `.env` (already created):

```env
DATABASE_URL="postgresql://postgres:123455@localhost:5432/chatgpt_clone?schema=public"
JWT_SECRET="change-this-to-a-random-long-secret"
OPENAI_API_KEY=""
```

3) Run migrations and seed admin:

```bash
npm run db:migrate -- --name init
npm run db:seed
```

4) Start app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Default Admin

- Email: `barath.kumar@digitalwebsolutions.in`
- Password: `Barath@123`

You can create more users from `/admin` after logging in as admin.

## Notes

- If `OPENAI_API_KEY` is empty, chat uses a local fallback response.
- If PostgreSQL authentication fails, verify your local DB username/password and that database `chatgpt_clone` exists.

