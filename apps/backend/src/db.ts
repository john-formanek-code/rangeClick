import knex from 'knex';
import config from './knex-config';

const db = knex(config);

export default db;
