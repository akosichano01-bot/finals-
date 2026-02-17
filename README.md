# Ancheta's Apartment Building Management System

A comprehensive apartment management system with billing, PayMongo payments, and tenant management.

## Features

- **User roles**: Manager, Staff, Tenant
- **Units**: Rent-only billing; monthly rent bills generated automatically
- **Payments**: PayMongo for tenants (pay rent online)
- **Maintenance**: Request and track issues
- **Rental Law**: Downloadable PDF (RA 9653)

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, Vite, Tailwind CSS
- **Database**: PostgreSQL (`docker-compose.yml` included)
- **Payments**: PayMongo

---

## Opening the system again (next day)

When you open the project on another day, do this in order:

1. **Start PostgreSQL**
   - If using Docker: run `docker compose up -d postgres`
   - Or start your local PostgreSQL service

2. **Start the backend**
   ```powershell
   npm run server
   ```
   Leave this terminal open. You should see:
   - `Server running on http://localhost:5000` (or your `PORT`)
   - `Database connected`
   - `PayMongo configured` (if your `.env` has the key)

3. **Start the frontend** (new terminal)
   ```powershell
   npm run dev
   ```

4. **Open the app**
   - In your browser go to: **http://localhost:5173**
   - Log in with your account (e.g. manager@ancheta.com / password123)

You do **not** need to run `npm install`, `migrate`, or `seed` again unless you reset the database or clone the project on a new machine.

---

## First-time setup

See **[SETUP.md](./SETUP.md)** for full instructions.

**Short version:**

1. Install **XAMPP** and start **MySQL**; create database **ancheta_apartment** in phpMyAdmin.
2. Start Postgres (recommended: `docker compose up -d postgres`).
3. Create a root `.env` (use `config/env.example` as a guide). Set at least `JWT_SECRET` and your DB connection.
4. Run: `npm install` → `npm run migrate` → `npm run seed` → `npm run server` → (new terminal) `npm run dev`
5. Open **http://localhost:5173** and log in.

### Default logins

- **Manager:** manager@ancheta.com / password123  
- **Staff:** staff@ancheta.com / password123  
- **Tenant:** tenant@ancheta.com / password123  

---

## PayMongo (tenant payments)

If you see **"PayMongo not configured"** when a tenant tries to pay:

1. Open the root **`.env`** and add (or fix) the line:
   ```env
   PAYMONGO_SECRET_KEY
   ```
2. **Restart the backend**: stop the terminal where `npm run server` is running (Ctrl+C), then run `npm run server` again.
3. On startup you should see: `PayMongo configured (tenant payments)`.

The key is loaded from `.env` only when the server starts, so changes require a restart.

---

## Reset database and repopulate (wipe everything)

You can clear all data and load fresh seed data in either of these ways.

### Option 1: Drop and recreate the database (recommended)

1. **Open phpMyAdmin** → http://localhost/phpmyadmin  
2. Select the **ancheta_apartment** database in the left sidebar.  
3. Click the **Operations** tab.  
4. Under **Remove database**, click **Drop the database (DROP)**.  
   Confirm when asked.  
5. Create the database again: click **New** in the left sidebar → Database name: **ancheta_apartment** → **Create**.  
6. **From your project folder**, in a terminal run:
   ```powershell
   cd "D:\Janie PC\School\NU\3rd Year\2nd Term\ECommerce\FINALS\Trial 5\backend"
   npm run migrate
   npm run seed
   ```
7. Restart the backend if it’s running (`npm run dev`).  
8. Log in again at http://localhost:5173 with the default accounts (e.g. manager@ancheta.com / password123).

### Option 2: Clear all tables but keep the database

1. Open **phpMyAdmin** → select database **ancheta_apartment**.  
2. Click the **SQL** tab.  
3. Paste and run this (clears all data in the right order):
   ```sql
   SET FOREIGN_KEY_CHECKS = 0;
   TRUNCATE TABLE payments;
   TRUNCATE TABLE bills;
   TRUNCATE TABLE maintenance_requests;
   TRUNCATE TABLE users;
   TRUNCATE TABLE units;
   SET FOREIGN_KEY_CHECKS = 1;
   ```
4. In a terminal, from the **backend** folder, run:
   ```powershell
   cd "D:\Janie PC\School\NU\3rd Year\2nd Term\ECommerce\FINALS\Trial 5\backend"
   npm run seed
   ```
5. Restart the backend if it’s running, then use the app with the default logins again.

After either option, you’ll have the default Manager, Staff, and Tenant accounts and sample units/bills.

---

## Removing old utilities / extra rent info from bills

The system uses **rent-only** billing. If you still have old bills (e.g. "Utilities") or descriptions from an earlier setup:

**Option A – Delete non-rent bills in phpMyAdmin**

1. Open **http://localhost/phpmyadmin** → select database **ancheta_apartment**.
2. Open the **bills** table → **SQL** tab.
3. Run (this deletes all bills that are not "Rent"; adjust if needed):
   ```sql
   DELETE FROM bills WHERE type != 'Rent';
   ```
4. If you also want to clear **description** on all bills:
   ```sql
   UPDATE bills SET description = NULL;
   ```

**Option B – Delete all bills and regenerate**

1. In phpMyAdmin, run:
   ```sql
   DELETE FROM payments;
   DELETE FROM bills;
   ```
2. In the app, log in as Manager or Staff, go to **Bills**, and click **Generate monthly rent bills** to create new rent-only bills for current tenants.

---

## Rental law PDF

- The app shows a **Rental Law (PDF)** link in the top bar.
- For it to work, place your PDF file here:
  - **Path:** `public/ra_9653_2009.pdf`
- If the file is in another folder (e.g. `ECommerce\\FINALS\\ra_9653_2009.pdf`), copy it into `public/` and name it `ra_9653_2009.pdf`.

---

## Project structure

```
.
├── server.js    # Express API (and SPA hosting in prod)
├── routes/      # Express routes
├── scripts/     # migrate/seed scripts (Postgres)
├── pages/       # React pages
├── components/  # React components
├── contexts/    # React context
├── public/      # Static assets (PDF, etc.)
├── README.md    # This file
└── SETUP.md     # Detailed setup guide
```

---

## Quick reference

| When you open the project again | Start Postgres → `npm run server` → new terminal → `npm run dev` → open http://localhost:5173 |
| PayMongo not configured         | Add `PAYMONGO_SECRET_KEY=sk_test_...` in `.env` and **restart the backend** |
| Remove old utilities/rent data   | In your SQL client: `DELETE FROM bills WHERE type != 'Rent';` or delete all bills and use "Generate monthly rent bills" |
| Reset DB and repopulate         | Drop & recreate DB → `npm run migrate` then `npm run seed` |

For more detail, see **SETUP.md**.
