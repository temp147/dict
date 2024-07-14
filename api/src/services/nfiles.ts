
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import OSS from 'ali-oss';
import { useEnv } from '../env.js';
// import { useLogger } from '../logger.js';

const env = useEnv();
// const logger = useLogger();
// import OSS from 'ali-oss'


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
}
