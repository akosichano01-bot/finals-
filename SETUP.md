# Setup Guide for Ancheta's Apartment Management System

This guide uses **PostgreSQL** (recommended: `docker-compose.yml` included) for the database.

## Prerequisites

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ (either Docker or a local install)
- **Docker Desktop** (optional, recommended for local Postgres) — [Download](https://www.docker.com/products/docker-desktop/)
- **npm** (comes with Node.js)

---

## Step 1: Start PostgreSQL

### Option A (recommended): Docker Compose

From the project root:

```powershell
docker compose up -d postgres
```

This starts Postgres on `localhost:5432` with:
- DB: `ancheta_apartment`
- User: `postgres`
- Pass: `postgres`

### Option B: Local Postgres

Install Postgres 14+ and ensure you have a database named `ancheta_apartment`.

---

## Step 2: Create your `.env`

Create a root `.env` file (not committed). Use `config/env.example` as a guide.

Minimum required:
- `JWT_SECRET`
- `DATABASE_URL` **or** `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`

---

## Step 3: Set Up the Backend

1. Install dependencies:
   ```powershell
   npm install
   ```

2. Create the tables (migration):
   ```powershell
   npm run migrate
   ```  
   You should see: `✅ Database tables created successfully`.

3. Insert sample data (seed):
   ```powershell
   npm run seed
   ```  
   You should see the default login credentials printed.

4. Start the backend server:
   ```powershell
   npm run server
   ```  
   Keep this terminal open. The backend runs at **http://localhost:5000** (or your `PORT`).

---

## Step 4: Set Up the Frontend

1. You usually don’t need to set a separate frontend `.env`. If you do, you can set:
   ```env
   VITE_API_URL=/api
   VITE_PROXY_TARGET=http://localhost:5000
   ```

2. Start the frontend:
   ```powershell
   npm run dev
   ```  
   The frontend runs at **http://localhost:5173**.

---

## Step 5: Use the Application

1. In your browser, go to: **http://localhost:5173**
2. Log in with one of these accounts:
   - **Manager:** manager@ancheta.com / password123  
   - **Staff:** staff@ancheta.com / password123  
   - **Tenant:** tenant@ancheta.com / password123  

---

## Using phpMyAdmin to View or Edit Data

- Open **http://localhost/phpmyadmin**
- Click **ancheta_apartment** in the left sidebar
- Click a table name (e.g. `users`, `bills`, `units`) to:
  - **Browse** rows
  - **Structure** (columns)
  - **SQL** to run custom queries

The app creates and updates data; phpMyAdmin is for viewing and manual edits if you need them.

---

## Troubleshooting

### “Cannot connect to MySQL” or “Access denied”

- In XAMPP, make sure **MySQL** is **Started** (green).
- In `backend\.env`, check:
  - `DB_USER=root`
  - `DB_PASSWORD=` (empty if you never set a MySQL password).
- If you set a MySQL root password, use it in `DB_PASSWORD`.

### “Unknown database 'ancheta_apartment'”

- Create the database in phpMyAdmin (Step 2) and run **Step 3.5** again:
  ```powershell
  npm run migrate
  ```

### Migration or seed errors

- Ensure the database `ancheta_apartment` exists and MySQL is running.
- If you need a clean start, in phpMyAdmin:
  1. Select database **ancheta_apartment**
  2. Tab **Operations** → **Drop the database (DROP)** (this deletes all data)
  3. Create the database again (Step 2) and run:
     ```powershell
     npm run migrate
     npm run seed
     ```

### Frontend can’t reach the backend

- Backend must be running: `npm run dev` in the **backend** folder.
- In `frontend\.env`, `VITE_API_URL` should be `http://localhost:3000/api`.

### Port 3000 or 5173 already in use

- Change **Backend port:** in `backend\.env` set e.g. `PORT=3001`, and in `frontend\.env` set `VITE_API_URL=http://localhost:3001/api`.
- Change **Frontend port:** in `frontend/vite.config.js`, under `server`, set e.g. `port: 5174`.

---

## Summary Checklist

| Step | What to do |
|------|------------|
| 1 | Install XAMPP, start **MySQL** in XAMPP |
| 2 | In phpMyAdmin, create database **ancheta_apartment** |
| 3 | In `backend`: `npm install` → `copy .env.example .env` → edit `.env` → `npm run migrate` → `npm run seed` → `npm run dev` |
| 4 | In `frontend`: `npm install` → `copy .env.example .env` → `npm run dev` |
| 5 | Open **http://localhost:5173** and log in with the credentials above |

You can use **phpMyAdmin** anytime at **http://localhost/phpmyadmin** to view or edit the **ancheta_apartment** database.

---

## Rental Law PDF (RA 9653)

To enable the **Rental Law (PDF)** download link in the app:

1. Copy your file **ra_9653_2009.pdf** (e.g. from `ECommerce\FINALS\ra_9653_2009.pdf`) into the frontend public folder:
   - **Destination:** `Trial 5\frontend\public\ra_9653_2009.pdf`
2. The app shows a **Rental Law (PDF)** link in the top bar; it will open or download this file.
