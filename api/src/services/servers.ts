import type { PrimaryKey } from '@directus/types';
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';



export class ServersService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_servers', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}


	private async getServerByKey(
		key: PrimaryKey,
	): Promise<{ type: string; url: string; apikey: string; apisecret: string } | undefined> {
		return await this.knex
			.select('type','url','apikey','apisecret')
			.from('nb_servers')
			.whereRaw(`LOWER(??) = ?`, ['uuid', key]);
	}

	async gerateQuery(key: PrimaryKey, data: Record<string, any>, ){


		const aiServer = await this.getServerByKey(key);

		if( aiServer?.type === 'flowise'){
			// todo add flowise structure.
			return 'a'
		}

		return key
	}
}
