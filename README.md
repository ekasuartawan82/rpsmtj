# RPS App MTJ

Bootstrap awal untuk aplikasi manajemen RPS Program Studi D3 Manajemen Transportasi Jalan Poltrada Bali.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL
- NextAuth/Auth.js
- Zod + React Hook Form

## Menjalankan Project

1. Salin `.env.example` menjadi `.env`.
2. Isi `DATABASE_URL`, `NEXTAUTH_SECRET`, dan `NEXTAUTH_URL`.
3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Jalankan development server:

```bash
npm run dev
```

## Script Penting

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:studio
npm run db:seed
```

## Dokumen Acuan

- [PRD final](./PRD/konsep_aplikasi_rps_mtj_v3_final.md)
- [Implementation plan](./PRD/implementation_plan_rps_app.md)
- [Architecture note phase 0](./docs/phase-0-architecture.md)
# Test 2D-A: Timestamp corruption
