# NexoPOS Dashboard

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and update the database URL:
```bash
cp .env.example .env
```

3. Run Prisma migrations:
```bash
npx prisma migrate dev
```

4. Seed the database (creates default admin):
```bash
npx prisma db seed
```

5. Start the development server:
```bash
npm run dev
```

## Default Login
- Email: admin@nexopos.com
- Password: admin123

## API Endpoints

### POST /api/v1/license/activate
Activate a license key

### POST /api/v1/license/validate
Validate a license key

### POST /api/v1/license/reset-machine
Reset machine ID for a license
