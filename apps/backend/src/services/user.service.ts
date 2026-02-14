import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  constructor(private knex: Knex) {}

  async findOrCreateUser(username: string) {
    let user = await this.knex('users').where({ username }).first();
    
    if (!user) {
      const id = uuidv4();
      [user] = await this.knex('users').insert({
        id,
        username,
        created_at: this.knex.fn.now()
      }).returning('*');
    }
    
    return user;
  }

  async getUser(id: string) {
    return this.knex('users').where({ id }).first();
  }
}
