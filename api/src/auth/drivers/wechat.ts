import {
	InvalidCredentialsError,
	InvalidProviderConfigError,
	InvalidPayloadError,
} from '@directus/errors';
import type { Accountability } from '@directus/types';
import  { Router } from 'express';
import { isEmpty } from 'lodash-es';
import { getAuthProvider } from '../../auth.js';
import { useEnv } from '../../env.js';
import { useLogger } from '../../logger.js';
import { respond } from '../../middleware/respond.js';
import { AuthenticationService } from '../../services/authentication.js';
import { UsersService } from '../../services/users.js';
import type { AuthDriverOptions, User } from '../../types/index.js';
import asyncHandler from '../../utils/async-handler.js';
import { COOKIE_OPTIONS } from '../../constants.js';
import { getIPFromReq } from '../../utils/get-ip-from-req.js';
import { LocalAuthDriver } from './local.js';
import { WechatService } from '../../services/wechatapp/index.js';
import { stall } from '../../utils/stall.js';



// const logger = useLogger();

export class WechatAuthDriver extends LocalAuthDriver {
	// client: Client;
	// redirectUrl: string;
	usersService: UsersService;
	config: Record<string, any>;

	constructor(options: AuthDriverOptions, config: Record<string, any>) {
		super(options, config);

		// const env = useEnv();
		const logger = useLogger();

		//验证appsecret 和appkey 是否在配置文件中设置了。

		const { appsecret, appkey, ...additionalConfig } = config;

		if (!appsecret || !appkey || !additionalConfig['provider']) {
			logger.error('Invalid provider config');
			throw new InvalidProviderConfigError({ provider: additionalConfig['provider'] });
		}

		this.usersService = new UsersService({ knex: this.knex, schema: this.schema });
		this.config = additionalConfig;
	}

	override async login(user: User): Promise<void> {
		return this.refresh(user);
	}

	// override async refresh(user: User): Promise<void> {
		// const logger = useLogger();

		// let authData = user.auth_data as AuthData;

		// if (typeof authData === 'string') {
		// 	try {
		// 		authData = parseJSON(authData);
		// 	} catch {
		// 		logger.warn(`[OAuth2] Session data isn't valid JSON: ${authData}`);
		// 	}
		// }

		// if (authData?.['refreshToken']) {
		// 	try {
		// 		const tokenSet = await this.client.refresh(authData['refreshToken']);

		// 		// Update user refreshToken if provided
		// 		if (tokenSet.refresh_token) {
		// 			await this.usersService.updateOne(user.id, {
		// 				auth_data: JSON.stringify({ refreshToken: tokenSet.refresh_token }),
		// 			});
		// 		}
		// 	} catch (e) {
		// 		throw handleError(e);
		// 	}
		// }
	// }

	override async getUserID(payload: Record<string, any>): Promise<string>{
		const wechatService = new WechatService({
			schema: this.schema,
			knex: this.knex
		})

		const wxSession =await wechatService.jscode2session(payload['code'])

		if (!wxSession){
			throw new InvalidPayloadError({ reason: `Failed to touch the wechat server` });
		}else if(wxSession.errcode===0||!wxSession.errcode){

			//todo get response.phone number
			const wxOpenId = wxSession.openid
			// const wxUnionId = wxSession.unionid
			const wxUser = await this.knex.select('id').from('directus_users').where('external_identifier', wxOpenId).first();

			// Create user first to verify uniqueness if unknown
			if (isEmpty(wxUser)) {
				//todo get user phone number
				const userEmail = wxOpenId + '@nobody.com';
				const userId= await this.usersService.createOne({email: userEmail, status: 'active', external_identifier: wxOpenId, provider: 'wechat'} )
				// throw new InvalidCredentialsError();
				return userId.toString()
			}

				return wxUser.id
		}else{
			throw new InvalidPayloadError({ reason: `Failed to get the wechat userinfo,maybe the code ${payload['code']} is error. wechat errcode ${wxSession.errcode}` });
		}

	}


	async getUserInfo(code: string): Promise<void>{

		// Todo insert
		const wechatService = new WechatService({
			schema: this.schema,
			knex: this.knex,
		})

		const wxToken = wechatService.getAccessToken();

		//todo get openid

		// const payload = { email: '111@123.com', scope: 'password-reset', hash: getSimpleHash('' + 'user.password') };
		// const token = jwt.sign(payload, env['SECRET'] as string, { expiresIn: '1d', issuer: 'directus' });

	}
}

// const handleError = (e: any) => {
// 	const logger = useLogger();

// 	if (e instanceof errors.OPError) {
// 		if (e.error === 'invalid_grant') {
// 			// Invalid token
// 			logger.warn(e, `[OAuth2] Invalid grant`);
// 			return new InvalidTokenError();
// 		}

// 		// Server response error
// 		logger.warn(e, `[OAuth2] Unknown OP error`);
// 		return new ServiceUnavailableError({
// 			service: 'oauth2',
// 			reason: `Service returned unexpected response: ${e.error_description}`,
// 		});
// 	} else if (e instanceof errors.RPError) {
// 		// Internal client error
// 		logger.warn(e, `[OAuth2] Unknown RP error`);
// 		return new InvalidCredentialsError();
// 	}

// 	logger.warn(e, `[OAuth2] Unknown error`);
// 	return e;
// };

export function createWechatAuthRouter(providerName: string): Router {
	const env = useEnv();

	const router = Router();
	// const env = useEnv();

	router.post(
		'/',
		asyncHandler(async (req, res, next) => {
			// const provider = getAuthProvider(providerName) as WechatAuthDriver;
			const logger = useLogger();

			const STALL_TIME = env['LOGIN_STALL_TIME'];
			const timeStart = performance.now();

			const accountability: Accountability = {
				ip: getIPFromReq(req),
				role: null,
			};

			const userAgent = req.get('user-agent');
			if (userAgent) accountability.userAgent = userAgent;

			const origin = req.get('origin');
			if (origin) accountability.origin = origin;

			const authenticationService = new AuthenticationService({
				accountability: accountability,
				schema: req.schema,
			});

			if(!req.body.code){
				await stall(STALL_TIME, timeStart);
				logger.warn(`[Wechat] There is no parameters called code.`);
				throw new InvalidCredentialsError();
			}

			// const code = req.body.code;

			// try{
			// 	provider.login(code);
			// }
			// catch(e:any){
			// 	logger.warn(`[Wechat] code exchage failed.`);
			// 	throw(e);
			// }
			const mode = req.body.mode || 'json';

			const { accessToken, refreshToken, expires } = await authenticationService.login(
				providerName,
				req.body,
				req.body?.otp,
			);

			const payload = {
				data: { access_token: accessToken, expires },
			} as Record<string, Record<string, any>>;

			if (mode === 'json') {
				payload['data']!['refresh_token'] = refreshToken;
			}

			if (mode === 'cookie') {
				res.cookie(env['REFRESH_TOKEN_COOKIE_NAME'], refreshToken, COOKIE_OPTIONS);
			}

			res.locals['payload'] = payload;

			return next();
		}),
		respond,
	);

	router.post(
		'/getUserInfo',

		(req,res) => {

			const provider = getAuthProvider(providerName) as WechatAuthDriver;
			const logger = useLogger();

			if(!req.body.code){
				logger.warn(`[Wechat] There is no parameters called code.`);
				throw new InvalidCredentialsError();
			}

			const code = req.body.code;

			try{
				provider.getUserInfo(code);
			}
			catch(e:any){
				logger.warn(`[Wechat] code exchage failed.`);
				throw(e);
			}

			res.redirect(303, `./callback?${new URLSearchParams(req.body)}`);

		}

	)



	return router;
}
