import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item, MutationOptions  } from '../types/index.js';
import { ItemsService } from './items.js';
import { ServersService } from './servers.js';
import { ChatsService } from './chats.js';
import { isEmpty } from 'lodash-es';


export class AgentsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_agents', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async sendChats(chatId: string ,data: Partial<Item>[], opts?: MutationOptions): Promise<void> {
		const serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		});

		const servers =await serversService.gerateUrl(chatId)

		if(isEmpty(servers)){
			return
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

			return
			// const keys = await chatsService.createOne(res.body)

		}

	}

}
