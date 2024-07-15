
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import OSS from 'ali-oss';
import { useEnv } from '../env.js';
import { useLogger } from '../logger.js';
import { randomUUID } from 'crypto';
import type { Knex } from 'knex';

// import { useLogger } from '../logger.js';

const env = useEnv();
// const logger = useLogger();

// import OSS from 'ali-oss'

interface FileAnalyzeRes {
  // 假设的字段，根据实际情况进行调整
  keywords: string;
  summary: string;
  todolist: string; // 根据实际返回的数据结构定义具体类型
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

	async analyzeOssFile( fileurl:string, filepath:string, nfileid:string,category:string, filetype:string): Promise<string | undefined>{

		const url = 'https://emotion.metacause.cn/analyze'

		const logger = useLogger();

		const body = {
			url: fileurl,
			filepath: filepath,
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
				const suggestions = {suggestion:fileAnalyzeObj['todolist'].split('。')};
				const tags = {tags:fileAnalyzeObj['keywords'].split(', ')};

				const users = this.accountability?.user;

				const timestamp = new Date().toISOString();

				await this.knex('nb_notes').insert({name: filepath,description:fileAnalyzeObj['summary'],tags:tags, suggestion:suggestions,users:users ,files:nfileid,timestamp:timestamp,category:category,filetype:filetype, id: randomUUID()}) ;
			}

			return 'success'

		}catch(error: any){
			logger.error(error);
			return undefined;

		}


	}


}
