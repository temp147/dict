
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import { useLogger } from '../logger.js';
import { WechatService } from './wechatapp/index.js';
import { useEnv } from '../env.js';


const env = useEnv();

interface SummaryItem {
    Id: number;
    Start: number;
    End: number;
    Headline: string;
    Summary: string;
}

interface AutoChaptersResponse {
    AutoChapters: SummaryItem[];
}

interface AISuggestionRes {
	// 假设的字段，根据实际情况进行调整
	todolist: string; // 根据实际返回的数据结构定义具体类型
  };


export class NotesService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_notes', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async getTingwuCallback( reqbody:void): Promise<string | undefined>{


		const logger = useLogger();

		// const OSS = require('ali-oss');

		try{
			const reqobj = reqbody as any;
			const taskStatus = reqobj['Data']["TaskStatus"];

			if(taskStatus === 'COMPLETED'){
				const aliTaskID = reqobj['Data']['TaskId']
				const meetingAssistUrl = reqobj['Data']['Result']["MeetingAssistance"];
				const chapterUrl = reqobj['Data']['Result']["AutoChapters"];
				const summaryUrl = reqobj['Data']['Result']["Summarization"];
				logger.info(`aliTaskID:${aliTaskID}`)
				let description: string | undefined; // 在这里声明 description 变量
				let keywords: object | undefined;
				let summary: object | undefined;
				let summaryText: string | undefined;
				// let suggestion: object | undefined;

				const resMeeting = await fetch(meetingAssistUrl, {
					method: 'GET'
				});

				if(resMeeting.ok){
					const meetingObj = await resMeeting.json() as any;
					keywords = {tags:meetingObj['MeetingAssistance']['Keywords']}
					logger.info(`keywords:${keywords}`);
				}

				const resChapter = await fetch(chapterUrl, {
					method: 'GET'
				});

				if (resChapter.ok) {
                    const chapterObj = await resChapter.json() as AutoChaptersResponse;
                    const summaryItems = chapterObj.AutoChapters;
					summary = { summary: chapterObj['AutoChapters'] as any};


                    if (Array.isArray(summaryItems)) {
                        summaryText = summaryItems.map(item => `${item.Headline} ${item.Summary}`).join(' ');
                        // logger.info(`summaryText:${summaryText}`);
                    } else {
                        logger.error('AutoChapters is not an array');
                    }
                }

				const resSummary = await fetch(summaryUrl, {
					method: 'GET'
				});

				if(resSummary.ok){
					const summaryObj = await resSummary.json() as any;
					description = summaryObj['Summarization']['ParagraphSummary']
					logger.info(`description:${description}`);

				}
				// const text = description+summary['summary'].map(item => `${item.Headline} ${item.Summary}`).join(' ');
				// text = description+summaryText;

				const suggestion = await this.getAISuggestion(summaryText?summaryText:'');
				// logger.info(`suggestion:${suggestion['suggestion'][0]}`);

				// logger.info(`description:${description}`);



				await this.knex('nb_notes').update({description:description,tags:keywords,summary:summary,suggestion:suggestion}).where({aliTaskID:aliTaskID});
			}

			return 'success'

		}catch(error: any){
			logger.error(error);
			return undefined;

		}


	}

	async subscribeWeixin(): Promise<string | undefined>{
		const logger = useLogger();

		// const url = new  URL('https://api.weixin.qq.com/cgi-bin/token?' +
		// 	'grant_type=client_credential&appid='+env['AUTH_WECHAT_APPKEY']+'&secret='+env['AUTH_WECHAT_APPSECRET']);

		const wechatService = new WechatService({
			schema: this.schema,
			knex: this.knex
		})

		const wxAccessToken = await wechatService.getAccessToken();

		const users = this.accountability?.user;

		const timestamp = new Date().toISOString();

		const body = {
				"touser": users?['externalid'] : '',
				"template_id": "Fll3Aw5_Ahxti8T9SmDET6dejqN_TzzJlg8igSymI7Y",
				"page": "pages/tools/WorkNote/filelist",
				"data": {
					"name2": {
						"value": "文件分析"
					},
					"thing3": {
						"value": "文件会议纪要已经分析完毕，请查看"
					},
					"date4": {
						"value": timestamp
					} ,
					"phrase6": {
						"value": "已完成"
					}
				},
				"miniprogram_state":"developer"
		}

		const url = 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token='+wxAccessToken;

		const headers = {
			'Content-Type': 'application/json',
		}

		try{
			const res = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(body),
				headers,
			});

			logger.info(`res:${res}`);

			if(res.ok){
				return 'success'
			}
		}catch(error: any){
			logger.error(error);
			return undefined;
		}
	}

	async getAISuggestion( text:string): Promise<object | undefined>{
		const url = 'https://emotion.metacause.cn/getSuggestion'

		const logger = useLogger();

		const body = {
			text: text,
		}

		const headers = {
			'Content-Type': 'application/json',
		}

		try{
			const res = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(body),
				headers,
			});

			logger.info(`res:${res}`);

			if(res.ok){
				const aiSuggestionObj = await res.json() as AISuggestionRes;
				logger.info(`aiSuggestionObj:${aiSuggestionObj['todolist']}`);
				const suggestionsList = aiSuggestionObj['todolist'].split(';');
				const suggestions = {suggestion:[{}]}

				suggestionsList.forEach(item=>{
					const suggestion = item.split(': ');
					const title = suggestion[0]?suggestion[0]:'';
					const content = suggestion[1]?suggestion[1]:'';
					const row = {title:title,content:content};

					suggestions['suggestion'].push(row);
				})
				// const suggestion = {suggestion:aiSuggestionObj['todolist'].split(';')};
				// logger.info(`suggestion:${suggestion['suggestion'][0]}`);

				return suggestions

			}
		}catch(error: any){
			logger.error(error);
			return undefined;
		}
	}
}
