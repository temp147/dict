import type { PrimaryKey } from '@directus/types';
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import { URL } from 'node:url';
// import type { Url } from '../utils/url.js';



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

	// async gerateS(key: PrimaryKey, data: Record<string, any>,
	async gerateUrl(key: PrimaryKey,
		): Promise<{url: URL ; apikey: string, apisecret:string}|undefined > {

		const aiServer = await this.getServerByKey(key);

		if( aiServer?.type === 'flowise'){
			const url = new URL('/api/v1/prediction/', aiServer.url);
			const apikey = aiServer.apikey
			const apisecret = aiServer.apisecret
			return {url, apikey, apisecret};
		}
		else{
			return ;
		}
	}
}
