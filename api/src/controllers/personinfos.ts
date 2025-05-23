import { isDirectusError } from '@directus/errors';
import express from 'express';
import { ErrorCode } from '@directus/errors';
import { respond } from '../middleware/respond.js';
import useCollection from '../middleware/use-collection.js';
import { validateBatch } from '../middleware/validate-batch.js';
import { PersoninfosService } from '../services/personinfos.js';
import { MetaService } from '../services/meta.js';
import type { PrimaryKey } from '../types/index.js';
import asyncHandler from '../utils/async-handler.js';
import { sanitizeQuery } from '../utils/sanitize-query.js';
import { useLogger } from '../logger.js';

const logger = useLogger();

const router = express.Router();

router.use(useCollection('nb_personinfos'));

router.post(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		if (Array.isArray(req.body)) {
			const keys = await service.createMany(req.body);
			savedKeys.push(...keys);
		} else {
			const primaryKey = await service.createOne(req.body);
			savedKeys.push(primaryKey);
		}

		try {
			if (Array.isArray(req.body)) {
				const records = await service.readMany(savedKeys, req.sanitizedQuery);
				res.locals['payload'] = { data: records };
			} else {
				const record = await service.readOne(savedKeys[0]!, req.sanitizedQuery);
				res.locals['payload'] = { data: record };
			}
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

const readHandler = asyncHandler(async (req, res, next) => {
	const service = new PersoninfosService({
		accountability: req.accountability,
		schema: req.schema,
	});

	const metaService = new MetaService({
		accountability: req.accountability,
		schema: req.schema,
	});

	let result;

	if (req.singleton) {
		result = await service.readSingleton(req.sanitizedQuery);
	} else if (req.body.keys) {
		result = await service.readMany(req.body.keys, req.sanitizedQuery);
	} else {
		result = await service.readByQuery(req.sanitizedQuery);
	}

	const meta = await metaService.getMetaForQuery('directus_folders', req.sanitizedQuery);

	res.locals['payload'] = { data: result, meta };
	return next();
});

router.get('/', validateBatch('read'), readHandler, respond);
router.search('/', validateBatch('read'), readHandler, respond);

router.get(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const record = await service.readOne(req.params['pk']!, req.sanitizedQuery);

		res.locals['payload'] = { data: record || null };
		return next();
	}),
	respond,
);

router.patch(
	'/',
	validateBatch('update'),
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		let keys: PrimaryKey[] = [];

		if (Array.isArray(req.body)) {
			keys = await service.updateBatch(req.body);
		} else if (req.body.keys) {
			keys = await service.updateMany(req.body.keys, req.body.data);
		} else {
			const sanitizedQuery = sanitizeQuery(req.body.query, req.accountability);
			keys = await service.updateByQuery(sanitizedQuery, req.body.data);
		}

		try {
			const result = await service.readMany(keys, req.sanitizedQuery);
			res.locals['payload'] = { data: result || null };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

router.patch(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const primaryKey = await service.updateOne(req.params['pk']!, req.body);

		try {
			const record = await service.readOne(primaryKey, req.sanitizedQuery);
			res.locals['payload'] = { data: record || null };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

router.delete(
	'/',
	validateBatch('delete'),
	asyncHandler(async (req, _res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		if (Array.isArray(req.body)) {
			await service.deleteMany(req.body);
		} else if (req.body.keys) {
			await service.deleteMany(req.body.keys);
		} else {
			const sanitizedQuery = sanitizeQuery(req.body.query, req.accountability);
			await service.deleteByQuery(sanitizedQuery);
		}

		return next();
	}),
	respond,
);

router.delete(
	'/:pk',
	asyncHandler(async (req, _res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		await service.deleteOne(req.params['pk']!);

		return next();
	}),
	respond,
);

router.post(
	'/generatelist/',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		try {
			const companyCode = req.body['companyCode'] ? req.body['companyCode'] : '';

			// const aliTaskID = req.params['pk']?req.params['pk']:'';
			const list = await service.generateList(companyCode);
			// logger.info(list);

			res.locals['payload'] = { data: list };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

router.post(
	'/getmonthsummary/',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		try {
			const userid = req.body['userid'] ? req.body['userid'] : '';

			// const aliTaskID = req.params['pk']?req.params['pk']:'';
			// const list = await service.generateList(companyCode);
			// logger.info(list);
			const list = {
				monthSummary: '     您在追求健康和个人成长的道路上已经取得了一些积极的成果，但仍有一些领域需要进一步的关注和改进。建议您继续关注健康饮食，同时增加运动量，以促进身体健康。在情绪管理方面，您可以继续参与心理健康活动，以维持情绪平衡。对于睡眠质量的改善，您可以尝试睡前放松技巧，并保持规律的作息时间。通过这些具体的行动，您可以进一步养成健康的生活习惯，提升生活质量。',
				image:'https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/summaryImg.jpg?sign=ee3a18fea25ccdb1889d686931eac5a0&t=1734573844'
			}

			res.locals['payload'] = { data: list };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

router.post(
	'/updateInfoFromFlowise/',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		try {
			const userid = req.body['userid'] ? req.body['userid'] : '';
			const chathistory = req.body['chathistory'] ? req.body['chathistory'] : '';
			const selfintroduction = await service.completeInfo(chathistory,userid);

			// const aliTaskID = req.params['pk']?req.params['pk']:'';
			// const list = await service.generateList(companyCode);
			// logger.info(list);
			// const list = {
			// 	monthSummary: '     您在追求健康和个人成长的道路上已经取得了一些积极的成果，但仍有一些领域需要进一步的关注和改进。建议您继续关注健康饮食，同时增加运动量，以促进身体健康。在情绪管理方面，您可以继续参与心理健康活动，以维持情绪平衡。对于睡眠质量的改善，您可以尝试睡前放松技巧，并保持规律的作息时间。通过这些具体的行动，您可以进一步养成健康的生活习惯，提升生活质量。',
			// 	image:'https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/summaryImg.jpg?sign=ee3a18fea25ccdb1889d686931eac5a0&t=1734573844'
			// }

			res.locals['payload'] = { data: selfintroduction };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

router.post(
	'/updateInfoFromFlowiseJson/',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		try {
			const userid = req.body['userid'] ? req.body['userid'] : '';
			const profile = req.body['profile'] ? req.body['profile'] : '';
			const date = req.body['date'] ? req.body['date'] : '';
			const dataid = await service.updateProfile(profile,userid,date);


			res.locals['payload'] = { data: dataid };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

router.post(
	'/updateUserActivityPoolJson/',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		try {
			const userid = req.body['userid'] ? req.body['userid'] : '';
			const profile = req.body['content'] ? req.body['content'] : '';
			const date = req.body['date'] ? req.body['date'] : '';
			const dataid = await service.updateUserActivity(profile,userid,date);


			res.locals['payload'] = { data: dataid };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

router.post(
	'/getWxSignature/',
	asyncHandler(async (req, res, next) => {
		const service = new PersoninfosService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		try {
			const url = req.body['url'] ? req.body['url'] : '';
			const timestamp = req.body['timestamp'] ? req.body['timestamp'] : '';

			// const aliTaskID = req.params['pk']?req.params['pk']:'';
			// const list = await service.generateList(companyCode);
			// logger.info(list);
			const signature = await service.getWxSignature(url, timestamp);

			res.locals['payload'] = { data: signature };
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

export default router;
