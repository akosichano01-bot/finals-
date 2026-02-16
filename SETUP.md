# Setup Guide for Ancheta's Apartment Management System

This guide uses **MySQL/MariaDB** so you can manage the database with **phpMyAdmin**.

## Prerequisites

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **XAMPP** (includes MySQL/MariaDB + phpMyAdmin) — [Download XAMPP](https://www.apachefriends.org/download.html)  
  **or** any setup that gives you **MySQL** or **MariaDB** + **phpMyAdmin**
- **npm** (comes with Node.js)

---

## Step 1: Install XAMPP and Start MySQL

1. **Download and install XAMPP** from https://www.apachefriends.org/download.html  
   (Choose the version that includes MySQL/MariaDB and phpMyAdmin.)

2. **Start the MySQL module** in the XAMPP Control Panel:
   - Open **XAMPP Control Panel**
   - Click **Start** next to **Apache** (optional, only if you want to use phpMyAdmin via Apache)
   - Click **Start** next to **MySQL**  
   MySQL should show a green “Running” status.

3. **Open phpMyAdmin** in your browser:
   - Go to: **http://localhost/phpmyadmin**  
   (If that doesn’t work, try **http://127.0.0.1/phpmyadmin**)

---

## Step 2: Create the Database in phpMyAdmin

1. In phpMyAdmin, click the **Databases** tab.
2. Under **Create database**:
   - **Database name:** `ancheta_apartment`
   - **Collation:** leave as default (e.g. `utf8mb4_general_ci`)
3. Click **Create**.  
   You should see `ancheta_apartment` in the left sidebar.

**Note:** Default MySQL user is usually `root` with no password. If you set a password during XAMPP setup, use it in Step 4.

---

## Step 3: Set Up the Backend

1. Open **PowerShell** and go to the project’s `backend` folder:
   ```powershell
   cd "D:\Janie PC\School\NU\3rd Year\2nd Term\ECommerce\FINALS\Trial 5\backend"
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Copy the environment file:
   ```powershell
   copy .env.example .env
   ```

4. Edit **`backend\.env`** in any text editor and set the database settings.  
   For a default XAMPP MySQL setup, use:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=ancheta_apartment
   DB_USER=root
   DB_PASSWORD=
   ```  
   If you set a MySQL password in XAMPP, put it in `DB_PASSWORD`.

5. Create the tables (migration):
   ```powershell
   npm run migrate
   ```  
   You should see: `✅ Database tables created successfully`.

6. Insert sample data (seed):
   ```powershell
   npm run seed
   ```  
   You should see the default login credentials printed.

7. Start the backend server:
   ```powershell
   npm run dev
   ```  
   Keep this terminal open. The backend runs at **http://localhost:3000**.

---

## Step 4: Set Up the Frontend

1. Open a **new** PowerShell window and go to the frontend folder:
   ```powershell
   cd "D:\Janie PC\School\NU\3rd Year\2nd Term\ECommerce\FINALS\Trial 5\frontend"
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Copy the environment file:
   ```powershell
   copy .env.example .env
   ```

4. You usually don’t need to change **`frontend\.env`**. It should contain:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

5. Start the frontend:
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
