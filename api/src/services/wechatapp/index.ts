import { InvalidPayloadError } from '@directus/errors';
import type { Accountability, SchemaOverview } from '@directus/types';
import type { Knex } from 'knex';
import getDatabase from '../../database/index.js';
import { useEnv } from '../../env.js';
// import { getExtensionsPath } from '../../extensions/lib/get-extensions-path.js';
import { useLogger } from '../../logger.js';
// import getMailer from '../../mailer.js';
import type { AbstractServiceOptions } from '../../types/index.js';
// import { Url } from '../../utils/url.js';
// import { aw } from 'vitest/dist/reporters-O4LBziQ_.js';


const env = useEnv();
const logger = useLogger();

export class WechatService{

	schema: SchemaOverview;
	accountability: Accountability | null;
	knex: Knex;

	constructor(opts: AbstractServiceOptions) {
		this.schema = opts.schema;
		this.accountability = opts.accountability || null;
		this.knex = opts?.knex || getDatabase();

		if (env['WECHAT_AUTH']) {
				if (!env['WECHAT_APPKEY']||!env['WECHAT_APPSECRET']) {
					logger.warn(`WECHAT APPKEY is not set.`);
			}
		}
	}

	async getAccessToken(){
		const url = new  URL('https://api.weixin.qq.com/cgi-bin/token?' +
		'grant_type=client_credential&appid='+env['WECHAT_APPKEY']+'&secret='+env['WECHAT_APPSECRET']);

		let eventuallySccessToken = '';
		// let accessToken='';
		//nb_accessToken为表
		const sqlAccessToken = await this.knex('nb_accessToken').select('*').first();

		if(sqlAccessToken != undefined) {
			// const oldTime = sqlAccessToken.create_time
			const oldTime = new Date(sqlAccessToken.create_time).getTime();
			const newTime = (new Date()).getTime();
			const isTimeValidate = (newTime - oldTime)/1000/60/60;

			//已经失效了。
			if(isTimeValidate >1 ){
				//重新获取
				const accessToken = await this.getHttpOption(url);

				if(accessToken){
					await this.knex('nb_accessToken').update({access_token: accessToken}).where('id', sqlAccessToken.id)
					eventuallySccessToken = accessToken
				}else{
					throw new InvalidPayloadError({ reason: `AccessToken doesn't exist` });
				}

				return eventuallySccessToken
			}else{
				eventuallySccessToken = sqlAccessToken.access_token
				return eventuallySccessToken
			}
		}else{
			//
			const accessToken = await this.getHttpOption(url)
  			//

			if (accessToken) {
				await this.knex('wx_accessToken').insert({access_token: accessToken}) ;
				eventuallySccessToken = accessToken
			} else {
				throw new InvalidPayloadError({ reason: `AccessToken doesn't exist` });
			 }

			 return  eventuallySccessToken
		}
	};


	async  getHttpOption (url:URL) {

		const res = await fetch(url, {
		method: 'GET',
		// body: JSON.stringify(report),
		// headers,
	});

	if (!res.ok) {
		throw new Error(`[${res.status}] ${await res.text()}`);
	} else{
		const accessToken = JSON.stringify(res.body)
		return accessToken
	}

	}

}
