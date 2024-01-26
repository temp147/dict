import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable('directus_custspaces', (table) => {
		table.uuid('id').primary().notNullable();
		table.string('name').notNullable();
		table.string('discription');
		table.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable();
	});
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTable('directus_custspace');
}
