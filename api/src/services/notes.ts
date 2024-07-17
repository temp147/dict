
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import { useLogger } from '../logger.js';


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
				const suggestion = {suggestion:aiSuggestionObj['todolist'].split('；')};
				logger.info(`suggestion:${suggestion['suggestion'][0]}`);

				return suggestion

			}
		}catch(error: any){
			logger.error(error);
			return undefined;
		}
	}
}
