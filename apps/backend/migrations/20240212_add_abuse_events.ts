import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("abuse_events", (table) => {
    table.uuid("id").primary();
    table.uuid("user_id").references("id").inTable("users").nullable();
    table.string("type").notNullable(); // RATE_LIMIT, CUTOFF_SNIPING, ANOMALY_WINRATE
    table.string("severity").notNullable(); // LOW, MEDIUM, HIGH
    table.json("metadata").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    
    table.index(["user_id", "type"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("abuse_events");
}
