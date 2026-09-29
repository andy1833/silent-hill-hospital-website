// Creates the tables from schema.sql in a MySQL database.
// Nothing is stored: the connection details are typed into your own terminal (the password is hidden).
//   npm run db:schema
// Optional: set DATABASE_URL (mysql://user:password@host:port/database) to skip the questions.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');

function ask(question, { hidden = false, fallback = '' } = {}) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); else rl.output.write(s.replace(/[^\r\n]/g, '*')); };
    }
    rl.question(question, answer => { rl.close(); if (hidden) console.log(''); resolve(answer.trim() || fallback); });
  });
}

(async () => {
  let config;
  const url = (process.env.DATABASE_URL || process.env.MYSQL_URL || '').trim();
  if (url) {
    if (!/^mysql:\/\//i.test(url)) throw new Error('DATABASE_URL must start with mysql://  (or leave it unset and answer the questions instead)');
    config = { uri: url };
  } else {
    console.log('Enter the connection details from Railway: MySQL service > Connect > Public network.\n');
    const host = await ask('Host (e.g. something.proxy.rlwy.net): ');
    const port = Number(await ask('Port (e.g. 54504): ')) || 3306;
    const user = await ask('User [root]: ', { fallback: 'root' });
    const password = await ask('Password (hidden): ', { hidden: true });
    const database = await ask('Database [railway]: ', { fallback: 'railway' });
    if (!host) throw new Error('Host is required.');
    config = { host, port, user, password, database };
  }

  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  const conn = await mysql.createConnection({ ...config, multipleStatements: true });
  try {
    await conn.query(sql);
    const [rows] = await conn.query('SHOW TABLES');
    console.log('\nSchema applied. Tables now in the database (' + rows.length + '):');
    for (const r of rows) console.log('  - ' + Object.values(r)[0]);
  } finally {
    await conn.end();
  }
})().catch(e => { console.error('\nFailed: ' + e.message); process.exit(1); });
