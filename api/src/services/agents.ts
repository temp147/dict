import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item } from '../types/index.js';
import { ItemsService } from './items.js';
import { ServersService } from './servers.js';
import { ChatsService } from './chats.js';
// import { isEmpty } from 'lodash-es';
import type { PrimaryKey } from '@directus/types';
import { now } from 'lodash-es';
import { UnprocessableContentError } from '@directus/errors';
import { HistoriesService } from './histories.js';


export class AgentsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_agents', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	private async getServerByKey(key: PrimaryKey): Promise<{ servers: PrimaryKey | undefined }> {
		// return await this.knex
		// 	.select('servers')
		// 	.from('nb_agents')
		// 	.whereRaw(`LOWER(??) = ?`, ['flowid', key]);
		const res = await this.knex
			.select('servers')
			.from('nb_agents')
			.whereRaw(`flowid = ?`, [key])
			.first();

		// .select('id', 'role', 'status', 'email','phone','provider')
		// .from('directus_users')
		// .whereRaw(`id = ?`, [userId])
		// .first();
		return res;
	};

	async sendChats(flowId: string, data: Partial<Item>[]): Promise<void> {
		const serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		});

		const agentServer = await this.getServerByKey(flowId);

		if (!agentServer.servers) {
			throw new UnprocessableContentError({ reason: `No functional AI server for this request,. flowId:${flowId}` })
		} else {

			let res

			try{
				res = await serversService.sendChats(agentServer?.servers, flowId, data);
			}catch(err:any){
				throw new Error(`can not send chat to the ai agent. flowId:${flowId}`);
			}

			const chatsService = new ChatsService({
				schema: this.schema,
				accountability: this.accountability,
			});

			const historysService = new HistoriesService({
				schema: this.schema,
				accountability: this.accountability,
			})


			if (res?.chatId) {
				const resChat = chatsService.readOne(res.chatId);

				if (!resChat) {
					await chatsService.updateOne(res.chatId, { last_access: now() });

				} else {
					await chatsService.createOne({ id: res.chatId, agents: flowId, users: this.accountability?.user, last_access: now() });
				}

				//save chat history
				await historysService.createOne({id: res.chatMessageId, question:res.question ,content: res.text, users: this.accountability?.user, chats: res.chatId, last_access: now()});

				return;
			}

			return;
		}

	}

}
