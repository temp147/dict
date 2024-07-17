
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import { useLogger } from '../logger.js';


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

				if(resChapter.ok){
					const chapterObj = await resChapter.json() as any;
					summary = {summary: chapterObj['AutoChapters'] }
					logger.info(`summary:${summary}`);

				}

				const resSummary = await fetch(summaryUrl, {
					method: 'GET'
				});

				if(resSummary.ok){
					const summaryObj = await resSummary.json() as any;
					description = summaryObj['Summarization']['ParagraphSummary']
					logger.info(`description:${description}`);
				}

				logger.info(`description:${description}`);



				await this.knex('nb_notes').update({description:description,tags:keywords,summary:summary}).where({aliTaskID:aliTaskID});
			}



			return 'success'

		}catch(error: any){
			logger.error(error);
			return undefined;

		}


	}
}
