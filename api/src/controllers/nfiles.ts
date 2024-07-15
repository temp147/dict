import { isDirectusError } from '@directus/errors';
import express from 'express';
import { ErrorCode } from '@directus/errors';
import { respond } from '../middleware/respond.js';
import useCollection from '../middleware/use-collection.js';
import { validateBatch } from '../middleware/validate-batch.js';
import { NfilesService } from '../services/nfiles.js';
import { MetaService } from '../services/meta.js';
import type { PrimaryKey } from '../types/index.js';
import asyncHandler from '../utils/async-handler.js';
import { sanitizeQuery } from '../utils/sanitize-query.js';
import { useLogger } from '../logger.js';


const router = express.Router();

router.use(useCollection('nb_nfiles'));

router.post(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new NfilesService({
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
	const service = new NfilesService({
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
		const service = new NfilesService({
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
		const service = new NfilesService({
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
		const service = new NfilesService({
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
		const service = new NfilesService({
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
		const service = new NfilesService({
			accountability: req.accountability,
			schema: req.schema,
		});

		await service.deleteOne(req.params['pk']!);

		return next();
	}),
	respond,
);

router.get(
	'/oss/getfileurl/:pk',
	asyncHandler(async(req, res, next)=>{
		// const code = req.body.code;

		//验证用户是否存在
		// if (!req.accountability?.user) {
		// 	throw new InvalidCredentialsError();
		// }

		// const logger = useLogger();

		const service= new NfilesService({
			accountability: req.accountability,
			schema: req.schema,
		})

		const file = await service.readOne(req.params['pk']!, req.sanitizedQuery);

		const bucket = file['bucket'];
		const filepath = file['path'];
		const record = await service.getOssFileUrl(bucket, filepath);
		res.locals['payload'] = { data: record || null };

		// await service.updatePhoneByWxcode(req.accountability.user);
		// res.locals['payload'] ={data: {id:req.accountability.user}}

		return next();
	}),
	respond,
)

router.get(
	'/oss/analyzefile/:pk',
	asyncHandler(async(req, res, next)=>{
		// const code = req.body.code;

		//验证用户是否存在
		// if (!req.accountability?.user) {
		// 	throw new InvalidCredentialsError();
		// }
		const logger = useLogger();

		const service= new NfilesService({
			accountability: req.accountability,
			schema: req.schema,
		})

		const file = await service.readOne(req.params['pk']!, req.sanitizedQuery);

		// logger.error(`file:${file['path']}`);


		const bucket = file['bucket'];
		const filepath = file['path'];
		const filename = file['name'];
		const nfileid = file['id']
		const fileurl = await service.getOssFileUrl(bucket, filepath);
		// logger.info(`fileurl:${fileurl}`);
		const record = await service.analyzeOssFile(fileurl, filename,nfileid);
		// logger.info(`record:${record}`);

		res.locals['payload'] = { data: record || null };



		return next();
	}),
	respond,
)

export default router;
