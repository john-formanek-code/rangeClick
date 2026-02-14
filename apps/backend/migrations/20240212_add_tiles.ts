import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("round_tiles", (table) => {
    table.uuid("id").primary();
    table.string("round_id").references("id").inTable("rounds").onDelete("CASCADE");
    table.decimal("min_price", 14, 2).notNullable();
    table.decimal("max_price", 14, 2).notNullable();
    table.decimal("multiplier", 10, 2).notNullable();
    table.decimal("probability", 10, 4).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("round_tiles");
}
