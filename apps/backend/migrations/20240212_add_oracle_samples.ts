import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("oracle_samples", (table) => {
    table.uuid("id").primary();
    table.string("round_id").references("id").inTable("rounds").onDelete("CASCADE");
    table.string("instrument").notNullable();
    table.decimal("computed_price", 14, 2).notNullable();
    table.json("source_prices").notNullable(); // { "Binance": 30000.1, "Coinbase": 30000.5 ... }
    table.integer("source_count").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    
    table.index(["round_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("oracle_samples");
}
