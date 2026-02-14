import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("bets", (table) => {
    table.uuid("tile_id").references("id").inTable("round_tiles");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("bets", (table) => {
    table.dropColumn("tile_id");
  });
}
