
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import { ServerService } from './server.js';
import { ChatsService } from './chats.js';


export class AgentsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_agents', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async sendChats(wscode: string, option: string){


	}

}
