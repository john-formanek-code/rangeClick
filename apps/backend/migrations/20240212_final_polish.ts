import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add decision_path to oracle_samples for transparency
  await knex.schema.alterTable("oracle_samples", (table) => {
    table.string("decision_path").nullable(); // e.g. "MEDIAN", "FALLBACK_REFUND", "INTERPOLATED"
  });

  // Create user limits table (Responsible Gambling)
  await knex.schema.createTable("user_limits", (table) => {
    table.uuid("user_id").primary().references("id").inTable("users").onDelete("CASCADE");
    table.decimal("max_bet_amount", 14, 2).defaultTo(1000);
    table.integer("max_bets_per_round").defaultTo(10);
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_limits");
  await knex.schema.alterTable("oracle_samples", (table) => {
    table.dropColumn("decision_path");
  });
}
