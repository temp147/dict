import { InvalidPayloadError } from '@directus/errors';
import type { Accountability, SchemaOverview } from '@directus/types';
import type { Knex } from 'knex';
import getDatabase from '../../database/index.js';
import { useEnv } from '../../env.js';
// import { getExtensionsPath } from '../../extensions/lib/get-extensions-path.js';
import { useLogger } from '../../logger.js';
// import getMailer from '../../mailer.js';
import type { AbstractServiceOptions } from '../../types/index.js';
import { randomUUID } from 'crypto';
// import  CryptoJS from 'crypto-js'
// import { Url } from '../../utils/url.js';


const env = useEnv();
const logger = useLogger();

// // 定义接口来表示HTTP响应
// interface HttpResponse<T> {
// 	status: number;
// 	message: string;
// 	data: T;
//   }

interface WxSessionRes {
	openid: string,
	session_key: string,
	unionid: string,
	errcode: number,
	errmsg: string,

};

interface WxPhone{
	phoneNumber:string,
	purePhoneNumber:string,
	countryCode	:string,
	watermark: object

}

interface WxPhoneRes {
	errcode: number,
	errmsg: string,
	unionid: string,
	phone_info: WxPhone,

};
// 定义响应类型
interface WxTokenRes {
	access_token: string;
	expires_in: number;
  }

export class WechatService{

	schema: SchemaOverview;
	accountability: Accountability | null;
	knex: Knex;

	constructor(opts: AbstractServiceOptions) {
		this.schema = opts.schema;
		this.accountability = opts.accountability || null;
		this.knex = opts?.knex || getDatabase();

		if (env['WECHAT_AUTH']) {
				if (!env['AUTH_WECHAT_APPKEY']||!env['AUTH_WECHAT_APPSECRET']) {
					logger.warn(`WECHAT APPKEY is not set.`);
			}
		}
	}

	async getAccessToken():Promise<string>{
		const url = new  URL('https://api.weixin.qq.com/cgi-bin/token?' +
		'grant_type=client_credential&appid='+env['AUTH_WECHAT_APPKEY']+'&secret='+env['AUTH_WECHAT_APPSECRET']);

		let eventuallySccessToken = '';
		// let accessToken='';
		//nb_accesstokens为表
		const sqlAccessToken = await this.knex('nb_accesstokens').select('id','create_time','expires_in','access_token').first();

		if(sqlAccessToken != undefined) {
			const expiresIn = sqlAccessToken.expires_in
			const oldTime = new Date(sqlAccessToken.create_time).getTime();
			const newTime = (new Date()).getTime();
			const isTimeValidate = ((newTime - oldTime)/1000-expiresIn)/60;

			//已经失效了或有效时间小于1M‘。
			if(isTimeValidate <1 ){
				//重新获取
				const accessToken = await this.getHttpOption(url);

				if(accessToken){
					//存储token
					await this.knex('nb_accesstokens').update({access_token: accessToken.access_token,expires_in: accessToken.expires_in,create_time:newTime}).where('id', sqlAccessToken.id)
					eventuallySccessToken = accessToken.access_token
				}else{
					throw new InvalidPayloadError({ reason: `AccessToken doesn't exist` });
				}

				return eventuallySccessToken
			}else{
				eventuallySccessToken = sqlAccessToken.access_token
				return eventuallySccessToken
			}
		}else{
			//没有token
			const accessToken = await this.getHttpOption(url)
  			//

			if (accessToken) {
				await this.knex('nb_accesstokens').insert({access_token: accessToken.access_token,expires_in: accessToken.expires_in,id: randomUUID()}) ;
				eventuallySccessToken = accessToken.access_token
			} else {
				throw new InvalidPayloadError({ reason: `AccessToken doesn't exist` });
			 }

			 return  eventuallySccessToken
		}
	};

			//获取用户的UUID
	async jscode2session(jscode: string): Promise<WxSessionRes  | undefined>{
		const url = new  URL('https://api.weixin.qq.com/sns/jscode2session?' +
		'grant_type=authorization_code&appid='+env['AUTH_WECHAT_APPKEY']+'&secret='+env['AUTH_WECHAT_APPSECRET']+'&js_code='+jscode);

		try {
			const res = await fetch(url, {
				method: 'GET'
			})

			if(!res.ok){
				throw new Error(`[${res.status}] ${await res.text()}`)
			}else{
				return res.json() as Promise<WxSessionRes>
			}
		} catch (error: any) {
			logger.error(error);
			return undefined

		}

		// const res =  {'openid':'1234'};

		// return res as WxSessionRes
	}

	async getPhoneByCode(jscode: string, access_token: string ): Promise<WxPhoneRes  | undefined>{
		// https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=ACCESS_TOKEN
		const url = new  URL('https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token='+access_token);

		try {
			const res = await fetch(url, {
				method: 'POST',
				body:JSON.stringify({'code': jscode})
			})

			if(!res.ok){
				throw new Error(`[${res.status}] ${await res.text()}`)
			}else{
				return res.json() as Promise<WxPhoneRes>
			}
		} catch (error: any) {
			logger.error(error);
			return undefined
		}
	// 	const res = {
	// 		errcode: 0,
	// 		errmsg: '',
	// 		unionid: '12131321232132213',
	// 		phone_info: {
	// 			phoneNumber:'+8613765453435',
	// 			purePhoneNumber:'13765453435',
	// 			countryCode	:'+86',
	// 			watermark: {
	// 				"timestamp": 1637744274,
	// 				"appid": "xxxx"
	// 			}
	// 		},}

	// 	return res as WxPhoneRes
	}

	private async getHttpOption (url:URL):Promise<WxTokenRes | undefined> {

		try {
			const res = await fetch(url, {
				method: 'GET',
				// body: JSON.stringify(report),
				// headers,
			});

			if (!res.ok) {
				throw new Error(`[${res.status}] ${await res.text()}`);
			} else{
				return res.json() as Promise<WxTokenRes>
			}
		} catch (error: any) {
			logger.error(error);
			return undefined
		}
	}
}

	// async getUserInfo(jscode: string): Promise<any> {
	// 	const url = new URL('');
	// 	try {
	// 		const resSession = await this.jscode2session(jscode)

	// 		if(resSession['code'] ){
	// 			const res = await fetch(url, {
	// 				method: 'GET'
	// 			})

	// 			if(!res.ok){
	// 				throw new Error(`[${res.status}] ${await res.text()}`)
	// 			}else{

	// 			}

	// 	}

	// }    catch(error: any){
	// 	logger.error(error);
	// 	return undefined
	// }



	// private decryptData(wxEncryptedData: string, wxIv :string, wxSessionKey:string ) {
	// 	// base64 decode
	// 	const sessionKey = Buffer.from(wxSessionKey, 'base64').toString;
	// 	const encryptedData = Buffer.from(wxEncryptedData, 'base64').toString;
	// 	const iv = Buffer.from(wxIv, 'base64')
	// 	try {
    //  // 解密码
	// 		var decipher = CryptoJS.createDecipheriv('aes-128-cbc', sessionKey, iv)
    // // 设置自动 padding 为 true，删除填充补位
    // 		decipher.setAutoPadding(true)
    // 		var decoded = decipher.update(encryptedData, 'binary', 'utf8')
    // 		decoded += decipher.final('utf8')

    // 		decoded = JSON.parse(decoded)

  	// 	} catch (err) {
    // 			throw new Error('Illegal Buffer')
 	// 		}

  	// 	if (decoded.watermark.appid !== this.appId) {
    // 			throw new Error('Illegal Buffer')
  	// 	}

  	// 	return decoded
	// }




// import CryptoJS from 'crypto-js';

// function decryptData(sessionKey: string, encryptedData: string, iv: string): string {
//     let sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
//     let encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
//     let ivBuffer = Buffer.from(iv, 'base64');

//     try {
//         // 解密
//         let decipher = CryptoJS.algo.AES.createDecryptor(
//             CryptoJS.enc.Utf8.parse(sessionKeyBuffer.toString('utf8')),
//             CryptoJS.enc.Utf8.parse(ivBuffer.toString('utf8'))
//         );
//         let decryptedBytes = decipher.decrypt(encryptedDataBuffer);
//         let decryptedData = CryptoJS.enc.Utf8.stringify(decryptedBytes);
//         return decryptedData.toString();
//     } catch (e) {
//         console.error(e);
//         return null;
//     }
// }

// // 使用示例
// const sessionKey = 'YOUR_SESSION_KEY'; // 从微信服务器获取的会话密钥
// const encryptedData = 'USER_ENCRYPTED_DATA'; // 用户提供的加密数据
// const iv = 'USER_IV'; // 用户提供的初始化向量

// const decryptedData = decryptData(sessionKey, encryptedData, iv);
// console.log(decryptedData);
