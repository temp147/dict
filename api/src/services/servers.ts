import type { PrimaryKey } from '@directus/types';
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions,Item } from '../types/index.js';
import { ItemsService } from './items.js';
import { URL } from 'node:url';
import { isEmpty } from 'lodash-es';
// import type { Url } from '../utils/url.js';
import { UnprocessableContentError } from '@directus/errors';
import { useLogger } from '../logger.js';

const logger = useLogger();

interface FlowiseRes {
	text: string;
	question: string;
	chatId: string;
	chatMessageId: string;
  }


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
			.whereRaw(`id = ?`, [key])
			.first();
	}

	// async gerateS(key: PrimaryKey, data: Record<string, any>,
	private async gerateUrl(key: PrimaryKey,
		): Promise<{url: URL ; apikey: string, apisecret:string}|undefined > {

		const aiServer = await this.getServerByKey(key);

		if( aiServer?.type === 'flowise'){
			const url = new URL('/api/v1/prediction/', aiServer.url);
			const apikey = '0'

			if(aiServer.apisecret){
				const apisecret = 'Bearer '+aiServer.apisecret
				return {url, apikey, apisecret};
			}

			const apisecret = '0';
			return {url, apikey, apisecret};
		}
		else{
			return ;
		}
	}

	async sendChats(key:PrimaryKey,message: Partial<Item>[]): Promise<FlowiseRes|undefined>{

		const servers =await this.gerateUrl(key);

		if(isEmpty(servers)){
			throw new UnprocessableContentError({reason:`No functional AI server for this request,. serverId:${key}`})
		}else {
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};

			headers['Authorization'] = servers.apisecret;

			let res;

			try{
				if(servers.apisecret==='0'){
				    res = await fetch(servers.url,{
					method:'POST',
					body: JSON.stringify(message),
					});
				}else {
				    res = await fetch(servers.url,{
					method:'POST',
					body: JSON.stringify(message),
					headers,
					});
				}

			}catch(error: any){
				logger.error(error);
				return undefined
			}

			if(!res.ok){
					throw new Error(`[${res.status}] ${await res.text()}`)
			}else{
				return  res.json() as Promise<FlowiseRes>
			}
		}
	}
}
