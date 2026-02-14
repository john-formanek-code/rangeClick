import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Archive for raw venue data (Section 5.3)
  await knex.schema.createTable("oracle_ticks", (table) => {
    table.uuid("id").primary();
    table.string("instrument").notNullable();
    table.string("source").notNullable();
    table.decimal("price", 14, 2).notNullable();
    table.bigInteger("timestamp").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    
    table.index(["instrument", "timestamp"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("oracle_ticks");
}
