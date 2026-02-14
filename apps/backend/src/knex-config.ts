import path from 'path';

// Use SQLite for local dev without a DB server
const config = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DATABASE_URL || path.join(__dirname, '..', 'dev.sqlite3')
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1, // SQLite only supports 1 writer, keeping at 1 to prevent busy errors
    afterCreate: (conn: any, cb: any) => {
      conn.run('PRAGMA journal_mode = WAL;');
      conn.run('PRAGMA synchronous = NORMAL;');
      conn.run('PRAGMA busy_timeout = 5000;');
      cb();
    }
  },
  migrations: {
    directory: path.join(__dirname, '..', 'migrations'),
    extension: 'ts'
  }
};

export default config;
