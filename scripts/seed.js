// scripts/seed.js
// Seeds Postgres with initial units + default accounts.
import bcrypt from 'bcryptjs';
import { rawPool } from '../config/database.js';

async function seedData() {
  const client = await rawPool.connect();
  try {
    await client.query('BEGIN');

    const userRows = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if ((userRows.rows[0]?.count || 0) > 0) {
      console.log('⚠️  Database already has data. Skipping seed.');
      await client.query('ROLLBACK');
      return;
    }

    const units = [
      { unit_number: '101', floor: 1, building: 'Building A', type: 'Studio', rent_amount: 5000 },
      { unit_number: '102', floor: 1, building: 'Building A', type: '1BR', rent_amount: 7000 },
      { unit_number: '201', floor: 2, building: 'Building A', type: '2BR', rent_amount: 10000 },
      { unit_number: '202', floor: 2, building: 'Building A', type: '2BR', rent_amount: 10000 },
      { unit_number: '301', floor: 3, building: 'Building A', type: '3BR', rent_amount: 15000 },
    ];

    const unitIds = [];
    for (const unit of units) {
      const result = await client.query(
        `INSERT INTO units (unit_number, floor, building, type, rent_amount, status, maintenance_status)
         VALUES ($1, $2, $3, $4, $5, 'available', 'none')
         RETURNING id`,
        [unit.unit_number, unit.floor, unit.building, unit.type, unit.rent_amount]
      );
      unitIds.push(result.rows[0].id);
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    await client.query(
      `INSERT INTO users (email, password, name, role, phone)
       VALUES ($1, $2, $3, $4, $5)`,
      ['manager@ancheta.com', hashedPassword, 'John Manager', 'manager', '09123456789']
    );

    await client.query(
      `INSERT INTO users (email, password, name, role, phone)
       VALUES ($1, $2, $3, $4, $5)`,
      ['staff@ancheta.com', hashedPassword, 'Jane Staff', 'staff', '09123456790']
    );

    const tenantRes = await client.query(
      `INSERT INTO users (email, password, name, role, phone, unit_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['tenant@ancheta.com', hashedPassword, 'Maria Tenant', 'tenant', '09123456791', unitIds[0]]
    );
    const tenantId = tenantRes.rows[0].id;

    await client.query("UPDATE units SET status = 'occupied' WHERE id = $1", [unitIds[0]]);

    // Create 1 unpaid rent bill for next month end (demo)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 2; // next month (1-based)
    const lastDay = new Date(year, month, 0).getDate();
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    await client.query(
      `INSERT INTO bills (tenant_id, type, amount, description, due_date, status)
       VALUES ($1, 'Rent', $2, $3, $4, 'unpaid')`,
      [tenantId, 5000, 'Seed rent bill', dueDate]
    );

    await client.query(
      `INSERT INTO maintenance_requests (tenant_id, title, description, priority, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [tenantId, 'Leaky faucet', 'The kitchen faucet is leaking', 'medium']
    );

    await client.query('COMMIT');

    console.log('✅ Seed data created successfully');
    console.log('\n📋 Default Login Credentials:');
    console.log('Manager: manager@ancheta.com / password123');
    console.log('Staff: staff@ancheta.com / password123');
    console.log('Tenant: tenant@ancheta.com / password123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    client.release();
  }
}

seedData()
  .then(() => {
    console.log('\nSeed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
