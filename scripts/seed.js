const { rawPool } = require('../config/database');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  const conn = await rawPool.getConnection();
  try {
    await conn.beginTransaction();

    const [userRows] = await conn.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count > 0) {
      console.log('⚠️  Database already has data. Skipping seed.');
      await conn.rollback();
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
      const [result] = await conn.query(
        `INSERT INTO units (unit_number, floor, building, type, rent_amount, status)
         VALUES (?, ?, ?, ?, ?, 'available')`,
        [unit.unit_number, unit.floor, unit.building, unit.type, unit.rent_amount]
      );
      unitIds.push(result.insertId);
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    const [managerResult] = await conn.query(
      `INSERT INTO users (email, password, name, role, phone)
       VALUES (?, ?, ?, ?, ?)`,
      ['manager@ancheta.com', hashedPassword, 'John Manager', 'manager', '09123456789']
    );
    const managerId = managerResult.insertId;

    const [staffResult] = await conn.query(
      `INSERT INTO users (email, password, name, role, phone)
       VALUES (?, ?, ?, ?, ?)`,
      ['staff@ancheta.com', hashedPassword, 'Jane Staff', 'staff', '09123456790']
    );
    const staffId = staffResult.insertId;

    const [tenant1Result] = await conn.query(
      `INSERT INTO users (email, password, name, role, phone, unit_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['tenant@ancheta.com', hashedPassword, 'Maria Tenant', 'tenant', '09123456791', unitIds[0]]
    );
    const tenant1Id = tenant1Result.insertId;

    await conn.query('UPDATE units SET status = ? WHERE id = ?', ['occupied', unitIds[0]]);

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const dueDate = nextMonth.toISOString().split('T')[0];

    await conn.query(
      `INSERT INTO maintenance_requests (tenant_id, title, description, priority, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [tenant1Id, 'Leaky faucet', 'The kitchen faucet is leaking', 'medium']
    );

    await conn.commit();
    console.log('✅ Seed data created successfully');
    console.log('\n📋 Default Login Credentials:');
    console.log('Manager: manager@ancheta.com / password123');
    console.log('Staff: staff@ancheta.com / password123');
    console.log('Tenant: tenant@ancheta.com / password123');
  } catch (error) {
    await conn.rollback();
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    conn.release();
  }
};

seedData()
  .then(() => {
    console.log('\nSeed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
