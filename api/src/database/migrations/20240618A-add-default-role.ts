import type { Knex } from 'knex';
// import { merge } from 'lodash-es';

export async function down (knex: Knex): Promise<void> {
	await knex('directus_roles')
		.delete()
		.where('name', '=', 'Public');
}

export async function up(knex: Knex): Promise<void> {
	const defaults = {
		id: '7f3c027c-0d17-47fb-988e-89802024c1b6',
		name: 'Public',
		icon: 'supervised_user_circle',
		app_access: true
	};

	await knex.insert(defaults).into('directus_roles');
}
