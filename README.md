# Mana Index

Mana Index is a Magic: The Gathering card search client backed by a separate Express API. The API proxies Scryfall search requests and uses PostgreSQL for user accounts and saved decklists.

## Requirements

- Node.js 20 or newer
- PostgreSQL

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a PostgreSQL database named `mana_index`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your local database connection string. Replace `JWT_SECRET` with a random value of at least 32 characters.
4. Create the tables:

   ```sh
   npm run db:migrate
   ```

5. Start both the Express API and Vite client:

   ```sh
   npm run dev
   ```

The client runs on Vite and proxies `/api` requests to the Express API on port 3001. The API can also be started independently with `npm run dev:server`.

## API structure

- `server/src/routes` defines API endpoints.
- `server/src/controllers` validates requests and returns responses.
- `server/src/services` contains Scryfall, account, and decklist operations.
- `server/src/auth` handles JWT cookies and authenticated routes.
- `server/src/db` configures PostgreSQL and runs migrations.
- `server/migrations` contains the SQL schema.

Registration and login use email/password. Passwords are hashed with bcrypt; the signed JWT is stored in an HttpOnly, SameSite cookie. Authenticated users can create, list, rename, and delete decklists and add, change quantities, or remove cards.

## Build and run

```sh
npm run build
npm run start:server
```

The production client build is in `dist`; deploy it as static files alongside the API. Set `DATABASE_URL`, `JWT_SECRET`, `PORT` (optional; defaults to 3001), and `NODE_ENV=production` in the server environment.

## Search syntax

Searches use Scryfall syntax. Examples:

- `Lightning Bolt` — search by card name
- `t:dragon` — search by card type
- `o:draw` — search rules text
- `cmc=3` — search by mana value

Color identity and rarity options are added to the Scryfall query. Card data and images are provided by Scryfall.
