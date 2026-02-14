import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("settlement_anchors", (table) => {
    table.uuid("id").primary();
    table.string("round_id").references("id").inTable("rounds").onDelete("CASCADE");
    table.string("merkle_root").notNullable();
    table.integer("bet_count").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    
    table.index(["round_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("settlement_anchors");
}
