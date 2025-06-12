import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable('nb_treeholes', (table) => {
		table.uuid('id').primary().notNullable();
		table.string('title');
		table.string('emotion_type');
		table.string('mail_status');
		table.string('user');
		table.text('user_text');
		table.text('aisuggestion');
		table.text('reply_text');
		table.json('tag');
		table.timestamp('send_time').defaultTo(knex.fn.now());
	});

}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTable('nb_treeholes');
}
