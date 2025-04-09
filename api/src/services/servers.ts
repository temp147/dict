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
	sessionId: string;
	memoryType: string;
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
		): Promise<{url: URL, apikey: string, apisecret:string}|undefined > {

		const aiServer = await this.getServerByKey(key);

		if( aiServer?.type === 'flowise'){
			const url = new URL('/api/v1/prediction/', aiServer.url);
			const apisecret = '0'

			if(aiServer.apikey){
				const apikey = 'Bearer '+aiServer.apikey
				return {url, apikey, apisecret};
			}

			const apikey = '0';
			return {url, apikey, apisecret};
		}
		else{
			return ;
		}
	}

	async gerateRAGUrl(key:PrimaryKey,RAGid:string ):Promise<{url:URL,  apikey: string, apisecret:string}|undefined>{

		const aiServer = await this.getServerByKey(key);

		if(aiServer?.type ==='flowise'){
			const url = new URL('api/v1/document-store/loader/process/'+RAGid, aiServer.url);
			const apisecret = '0';

			if(aiServer.apikey){
				const apikey = 'Bearer '+aiServer.apikey
				return {url, apikey, apisecret};
			}

			const apikey = '0';
			return {url, apikey, apisecret};
		}
		else{
			return ;
		}

	}

	async sendChats(key:PrimaryKey,flowId:string, message: Partial<Item>[]): Promise<FlowiseRes|undefined>{

		const servers =await this.gerateUrl(key);

		if(isEmpty(servers)){
			throw new UnprocessableContentError({reason:`No functional AI server for this request,. serverId:${key}`})
		}else {
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};

			headers['Authorization'] = servers.apikey;

			let res;

			try{
				if(servers.apisecret==='0'){
				    res = await fetch(servers.url+flowId,{
					method:'POST',
					body: JSON.stringify(message),
					});
				}else {
				    res = await fetch(servers.url+flowId,{
					method:'POST',
					body: JSON.stringify(message),
					headers,
					});

					// res =
					//   {
					// 	"text": "很高兴你对自己的财运感兴趣！要进行详细的财运分析，我可以为你提供几种选择：生辰八字算命、星座算命、掌纹算命和面相算命。🔮 你想通过哪种方式来探索你的财运呢？\n\n如果你有特定的选择，请告诉我你的出生日期、性别、出生城市，以及你是否有特别想要通过算命达成的目标。这样我就能根据你提供的信息进行深入分析了。\n\n如果你还没有准备好这些信息，也没有关系！我可以根据我的能力，给你一些基于数字或星象的一般性财运指引。✨\n\n请选择一种方式，或者告诉我更多关于你的信息，让我们开始探索你的财运之旅吧！",
					// 	"question": "\"算算我的财运\"",
					// 	"chatId": "fe89fcec-2de7-485d-bf57-34f4a8417e28",
					// 	"chatMessageId": "e95c5dd9-1c7d-41ca-9526-8a9f02c0a207",
					// 	"sessionId": "fe89fcec-2de7-485d-bf57-34f4a8417e28",
					// 	"memoryType": "Buffer Memory"
 					//  }
				}

			}catch(error: any){
				logger.error(error);
				return undefined
			}

			if(!res.ok){
				throw new Error(`[${res.status}] ${await res.text()}`)
			}else{
				return await res.json() as Promise<FlowiseRes>
			}
		}
	}
}
