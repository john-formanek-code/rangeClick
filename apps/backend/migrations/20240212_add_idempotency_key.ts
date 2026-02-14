import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("bets", (table) => {
    table.string("idempotency_key").nullable().unique();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("bets", (table) => {
    table.dropColumn("idempotency_key");
  });
}
