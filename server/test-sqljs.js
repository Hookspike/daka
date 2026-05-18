(async () => {
  try {
    const sql = require('D:/windsruf/kaka/daka/server/node_modules/sql.js/dist/sql-wasm.js');
    console.log('Loaded sql.js module, type:', typeof sql);
    console.log('default type:', typeof sql.default);
    const SQL = await sql.default();
    console.log('Initialized SQL, type:', typeof SQL);
    const db = new SQL.Database();
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    db.exec('INSERT INTO test VALUES (1, "hello")');
    const stmt = db.prepare('SELECT * FROM test WHERE id = ?');
    stmt.bind([1]);
    stmt.step();
    console.log('Result:', stmt.getAsObject());
    stmt.free();
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  }
})();
