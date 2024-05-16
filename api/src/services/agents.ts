import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item, MutationOptions  } from '../types/index.js';
import { ItemsService } from './items.js';
import { ServersService } from './servers.js';
import { ChatsService } from './chats.js';
import { isEmpty } from 'lodash-es';
import type { PrimaryKey } from '@directus/types';

export class AgentsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_agents', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	private async getServerByKey(key: PrimaryKey,
		):Promise<{ servers: PrimaryKey }>{
			return await this.knex
				.select('servers')
				.from('nb_agents')
				.whereRaw(`LOWER(??) = ?`, ['uuid', key]);
	};

	async sendChats(flowId: string ,data: Partial<Item>[], opts?: MutationOptions): Promise<void> {
		const serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		});

		const agentServer = await this.getServerByKey(flowId);

		const servers =await serversService.gerateUrl(agentServer?.servers);

		if(isEmpty(servers)){
			return ;
		}else{
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};

			headers['Authorization'] = servers.apikey;

			const  res = await fetch(servers.url,{
				method:'POST',
				body: JSON.stringify(data),
				headers,
			});

			const chatsService = new ChatsService({
				schema: this.schema,
				accountability: this.accountability,
			});

			if(res.body){
				await chatsService.createOne(res.body)
				return ;
			}

		}

	}

}
