import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable('nb_testcases', (table) => {
		table.uuid('id').primary().notNullable();
		table.string('name');
		table.text('input_question');
		table.uuid('input_flowid').references('id').inTable('nb_agents').onDelete('CASCADE');
		table.text('verify_text');
		table.uuid('verify_flowid').references('id').inTable('nb_agents').onDelete('CASCADE');
	});

}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTable('nb_testcases');
}
