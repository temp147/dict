
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import OSS from 'ali-oss';
import { useEnv } from '../env.js';
import { useLogger } from '../logger.js';
import { randomUUID } from 'crypto';
import { WechatService } from './wechatapp/index.js';
import type { Knex } from 'knex';

// import { useLogger } from '../logger.js';

const env = useEnv();
// const logger = useLogger();

// import OSS from 'ali-oss'

interface FileAnalyzeRes {
  // 假设的字段，根据实际情况进行调整
  title: string;
  keywords: string;
  summary: string;
  todolist: string; // 根据实际返回的数据结构定义具体类型
  chaptersummary: string;
};

export class NfilesService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_nfiles', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async getOssFileUrl( bucket:string, filepath:string): Promise<string>{

		// const url =
		// const OSS = require('ali-oss');

		const client = new OSS({
			// yourRegion填写Bucket所在地域。以华东1（杭州）为例，yourRegion填写为oss-cn-hangzhou。
			region: "oss-cn-beijing",
			// 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
			accessKeyId: env['OSS_ACCESS_KEY_ID'],
			accessKeySecret: env['OSS_ACCESS_KEY_SECRET'],
			// 填写Bucket名称，例如examplebucket。
			bucket: bucket,
		  });

		  // 生成用于下载文件的签名URL。
		  const url = client.signatureUrl(filepath);

		  return url;

		}

	async analyzeWeb( fileurl:string, filepath:string, nfileid:string,category:string, filetype:string,type:string): Promise<string | undefined>{
		const url = 'https://emotion.metacause.cn/webanalyze'

		const logger = useLogger();

		const body = {
			url: fileurl,
			filepath: filepath,
			filetype: filetype
		}

		const headers = {
			'Content-Type': 'application/json',
		}
		// const OSS = require('ali-oss');

		try{
			const res = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(body),
				headers,
			});

			logger.info(`res:${res}`);

			if(res.ok){
				const fileAnalyzeObj = await res.json() as FileAnalyzeRes;
				const title = fileAnalyzeObj['title']
				const suggestionsList = fileAnalyzeObj['todolist'].split(';');
				const suggestions = {suggestion:[{}]}
				const tags = {tags:fileAnalyzeObj['keywords'].split(', ')};
				const chaptersummary = fileAnalyzeObj['chaptersummary'].split(';');
				const summary = {summary:[{}]}

				suggestionsList.forEach(item=>{
					const suggestion = item.split(': ');
					const title = suggestion[0]?suggestion[0]:'';
					const content = suggestion[1]?suggestion[1]:'';
					const row = {title:title,content:content};

					suggestions['suggestion'].push(row);
				})

				chaptersummary.forEach(item=>{
					const chapter = item.split(': ');
					const chapterindex = chapter[0]?chapter[0]:'';
					const chaptertitle = chapter[1]?chapter[1]:'';
					const chaptercontent = chapter[2]?chapter[2]:'';
					const row = {chapterindex:chapterindex,chaptertitle:chaptertitle, chaptercontent:chaptercontent};

					summary['summary'].push(row);
				})

				const users = this.accountability?.user;

				const timestamp = new Date().toISOString();

				this.notifyUser();


				await this.knex('nb_notes').insert(
					{
						name: title,
						description:fileAnalyzeObj['summary'],
						tags:tags,
						suggestion:suggestions,
						users:users ,
						files:nfileid,
						timestamp:timestamp,
						category:category,
						filetype:type,
						summary:summary,
						id: randomUUID()
					}) ;
			}

			return 'success'

		}catch(error: any){
			logger.error(error);
			return undefined;

		}

	}

	async analyzeOssFile( fileurl:string, filepath:string, nfileid:string,category:string, filetype:string,type:string): Promise<string | undefined>{

		const url = 'https://emotion.metacause.cn/analyze'

		const logger = useLogger();

		const body = {
			url: fileurl,
			filepath: filepath,
			filetype: filetype
		}

		const headers = {
			'Content-Type': 'application/json',
		}
		// const OSS = require('ali-oss');

		try{
			const res = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(body),
				headers,
			});

			logger.info(`res:${res}`);

			if(res.ok){
				const fileAnalyzeObj = await res.json() as FileAnalyzeRes;
				const suggestionsList = fileAnalyzeObj['todolist'].split(';');
				const suggestions = {suggestion:[{}]}
				const tags = {tags:fileAnalyzeObj['keywords'].split(', ')};
				const chaptersummary = fileAnalyzeObj['chaptersummary'].split(';');
				const summary = {summary:[{}]}

				suggestionsList.forEach(item=>{
					const suggestion = item.split(': ');
					const title = suggestion[0]?suggestion[0]:'';
					const content = suggestion[1]?suggestion[1]:'';
					const row = {title:title,content:content};

					suggestions['suggestion'].push(row);
				})

				chaptersummary.forEach(item=>{
					const chapter = item.split(': ');
					const chapterindex = chapter[0]?chapter[0]:'';
					const chaptertitle = chapter[1]?chapter[1]:'';
					const chaptercontent = chapter[2]?chapter[2]:'';
					const row = {chapterindex:chapterindex,chaptertitle:chaptertitle, chaptercontent:chaptercontent};

					summary['summary'].push(row);
				})

				const users = this.accountability?.user;

				const timestamp = new Date().toISOString();

				this.notifyUser();


				await this.knex('nb_notes').insert(
					{
						name: filepath,
						description:fileAnalyzeObj['summary'],
						tags:tags,
						suggestion:suggestions,
						users:users ,
						files:nfileid,
						timestamp:timestamp,
						category:category,
						filetype:type,
						summary:summary,
						id: randomUUID()
					}) ;
			}

			return 'success'

		}catch(error: any){
			logger.error(error);
			return undefined;

		}


	}

	async notifyUser(): Promise<string | undefined>{
		const logger = useLogger();

		// const url = new  URL('https://api.weixin.qq.com/cgi-bin/token?' +
		// 	'grant_type=client_credential&appid='+env['AUTH_WECHAT_APPKEY']+'&secret='+env['AUTH_WECHAT_APPSECRET']);

		const wechatService = new WechatService({
			schema: this.schema,
			knex: this.knex
		})

		const wxAccessToken = await wechatService.getAccessToken();

		logger.info(`wxAccessToken:${wxAccessToken}`);

		const users = this.accountability?.user;

		const external_identifier = await this.knex
			.select('external_identifier')
			.from('directus_users')
			.whereRaw('id = ?', [ users])
			.first();

		const timestamp = new Date().toISOString();

		const date = new Date();
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');

		const datestr = `${year}-${month}-${day}`;

		logger.info(`external_identifier:${external_identifier['external_identifier']}`);
		// logger.info(`users:${users}`)

		const body = {
				touser: external_identifier['external_identifier'],
				template_id: "Fll3Aw5_Ahxti8T9SmDET6dejqN_TzzJlg8igSymI7Y",
				page: "pages/tools/WorkNote/filelist",
				data: {
					name2: {
						value: "文件分析"
					},
					thing3: {
						value: "文件会议纪要已经分析完毕，请查看"
					},
					date4: {
						value: datestr
					} ,
					phrase6: {
						value: "已完成"
					}
				},
				miniprogram_state:"formal"
		}

		const url = 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token='+wxAccessToken;

		const headers = {
			'Content-Type': 'application/json',
		}

		logger.info(`body:${JSON.stringify(body)}`)

		try{
			const res = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(body),
				headers,
			});

			logger.info(`res:${JSON.stringify(res)}`);

			if(res.ok){
				return 'success'
			}
		}catch(error: any){
			logger.error(error);
			return undefined;
		}
	}


}
