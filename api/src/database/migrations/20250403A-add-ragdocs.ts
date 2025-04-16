import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable('ng_ragdocs', (table) => {
		table.uuid('id').primary().notNullable();
		table.string('doc_id');
		table.uuid('rags').references('id').inTable('nb_rags').onDelete('CASCADE');
		table.uuid('documents').references('id').inTable('nb_documents').onDelete('CASCADE');
	});

}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTable('ng_ragdocs');
}
