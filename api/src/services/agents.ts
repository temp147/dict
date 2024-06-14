import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item, MutationOptions  } from '../types/index.js';
import { ItemsService } from './items.js';
import { ServersService } from './servers.js';
import { ChatsService } from './chats.js';
// import { isEmpty } from 'lodash-es';
import type { PrimaryKey } from '@directus/types';
import { now } from 'lodash-es';

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
				.whereRaw(`LOWER(??) = ?`, ['id', key]);
	};

	async sendChats(flowId: string ,data: Partial<Item>[], opts?: MutationOptions): Promise<void> {
		const serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		});

		const agentServer = await this.getServerByKey(flowId);

		const res =await serversService.sendChat(agentServer?.servers, data);


		const chatsService = new ChatsService({
			schema: this.schema,
			accountability: this.accountability,
		});

		//todo save chat history
		if(res?.chatMessageId){
			const resChat = chatsService.readOne(res.chatId)

			if(!resChat){
				await chatsService.updateOne(res.chatId,{last_access: now()})
				return;
			}else{
				await chatsService.createOne({id: res.chatId, agents: flowId, users: this.accountability?.user,last_access: now()})
				return ;
			}

		}

	}

}
