import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("settlement_anchors", (table) => {
    table.string("batch_tx_hash").nullable(); // Simulated Strategy B reference
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("settlement_anchors", (table) => {
    table.dropColumn("batch_tx_hash");
  });
}
