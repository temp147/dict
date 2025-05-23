import { InvalidPayloadError, ServiceUnavailableError } from '@directus/errors';
import { handlePressure } from '@directus/pressure';
import cookieParser from 'cookie-parser';
import type { Request, RequestHandler, Response } from 'express';
import express from 'express';
import type { ServerResponse } from 'http';
import { merge } from 'lodash-es';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'path';
import qs from 'qs';
import { registerAuthProviders } from './auth.js';
import activityRouter from './controllers/activity.js';
import assetsRouter from './controllers/assets.js';
import authRouter from './controllers/auth.js';
import collectionsRouter from './controllers/collections.js';
import dashboardsRouter from './controllers/dashboards.js';
import extensionsRouter from './controllers/extensions.js';
import fieldsRouter from './controllers/fields.js';
import filesRouter from './controllers/files.js';
import flowsRouter from './controllers/flows.js';
import foldersRouter from './controllers/folders.js';
import graphqlRouter from './controllers/graphql.js';
import itemsRouter from './controllers/items.js';
import notFoundHandler from './controllers/not-found.js';
import notificationsRouter from './controllers/notifications.js';
import operationsRouter from './controllers/operations.js';
import panelsRouter from './controllers/panels.js';
import permissionsRouter from './controllers/permissions.js';
import presetsRouter from './controllers/presets.js';
import relationsRouter from './controllers/relations.js';
import revisionsRouter from './controllers/revisions.js';
import rolesRouter from './controllers/roles.js';
import schemaRouter from './controllers/schema.js';
import serverRouter from './controllers/server.js';
import settingsRouter from './controllers/settings.js';
import sharesRouter from './controllers/shares.js';
import translationsRouter from './controllers/translations.js';
import usersRouter from './controllers/users.js';
import utilsRouter from './controllers/utils.js';
import versionsRouter from './controllers/versions.js';
import webhooksRouter from './controllers/webhooks.js';
//Following is the customer router lists
import custspacesRouter from './controllers/custspaces.js';
import companiesRouter from './controllers/companies.js';
import coursesRouter from './controllers/courses.js';
import membersRouter from './controllers/members.js';
import organizationsRouter from './controllers/organizations.js';
import supervisorsRouter from './controllers/supervisors.js';
import usermoodssRouter from './controllers/usermoods.js';
import userstressRouter from './controllers/userstress.js';
import resourcesRouter from './controllers/resourses.js';
import surveysRouter from './controllers/surveys.js';
import chatsRouter from './controllers/chats.js';
import agentsRouter from './controllers/agents.js';
import badgestoresRouter from './controllers/badgestores.js';
import badgesRouter from './controllers/badges.js';
import goalsRouter from './controllers/goals.js';
import keyresultsRouter from './controllers/keyresults.js';
import tasksRouter from './controllers/tasks.js';
import tasklogsRouter from './controllers/tasklogs.js';
import benefitsRouter from './controllers/benefits.js';
import calendarsRouter from './controllers/calendars.js';
import notesRouter from './controllers/notes.js';
import tagsRouter from './controllers/tags.js';
import serversRouter from './controllers/servers.js';
import nfilesRouter from './controllers/nfiles.js';
import personinfosRouter from './controllers/personinfos.js';
import candidateresultRouter from './controllers/candidateresult.js';
import nutritionanalyzeRouter from './controllers/nutritionanalyze.js';
import documentsRouter from './controllers/documents.js';
import ragsRouter from './controllers/rags.js';

import {
	isInstalled,
	validateDatabaseConnection,
	validateDatabaseExtensions,
	validateMigrations,
} from './database/index.js';
import emitter from './emitter.js';
import { useEnv } from './env.js';
import { getExtensionManager } from './extensions/index.js';
import { getFlowManager } from './flows.js';
import { createExpressLogger, useLogger } from './logger.js';
import authenticate from './middleware/authenticate.js';
import cache from './middleware/cache.js';
import { checkIP } from './middleware/check-ip.js';
import cors from './middleware/cors.js';
import errorHandler from './middleware/error-handler.js';
import extractToken from './middleware/extract-token.js';
import getPermissions from './middleware/get-permissions.js';
import rateLimiterGlobal from './middleware/rate-limiter-global.js';
import rateLimiter from './middleware/rate-limiter-ip.js';
import sanitizeQuery from './middleware/sanitize-query.js';
import schema from './middleware/schema.js';
import { initTelemetry } from './telemetry/index.js';
import { getConfigFromEnv } from './utils/get-config-from-env.js';
import { Url } from './utils/url.js';
import { validateEnv } from './utils/validate-env.js';
import { validateStorage } from './utils/validate-storage.js';
import { init as initWebhooks } from './webhooks.js';

const require = createRequire(import.meta.url);

export default async function createApp(): Promise<express.Application> {
	const env = useEnv();
	const logger = useLogger();
	const helmet = await import('helmet');

	validateEnv(['KEY', 'SECRET']);

	if (!new Url(env['PUBLIC_URL']).isAbsolute()) {
		logger.warn('PUBLIC_URL should be a full URL');
	}

	await validateStorage();

	await validateDatabaseConnection();
	await validateDatabaseExtensions();

	if ((await isInstalled()) === false) {
		logger.error(`Database doesn't have Directus tables installed.`);
		process.exit(1);
	}

	if ((await validateMigrations()) === false) {
		logger.warn(`Database migrations have not all been run`);
	}

	await registerAuthProviders();

	const extensionManager = getExtensionManager();
	const flowManager = getFlowManager();

	await extensionManager.initialize();
	await flowManager.initialize();

	const app = express();

	app.disable('x-powered-by');
	app.set('trust proxy', env['IP_TRUST_PROXY']);
	app.set('query parser', (str: string) => qs.parse(str, { depth: 10 }));

	if (env['PRESSURE_LIMITER_ENABLED']) {
		const sampleInterval = Number(env['PRESSURE_LIMITER_SAMPLE_INTERVAL']);

		if (Number.isNaN(sampleInterval) === true || Number.isFinite(sampleInterval) === false) {
			throw new Error(`Invalid value for PRESSURE_LIMITER_SAMPLE_INTERVAL environment variable`);
		}

		app.use(
			handlePressure({
				sampleInterval,
				maxEventLoopUtilization: env['PRESSURE_LIMITER_MAX_EVENT_LOOP_UTILIZATION'],
				maxEventLoopDelay: env['PRESSURE_LIMITER_MAX_EVENT_LOOP_DELAY'],
				maxMemoryRss: env['PRESSURE_LIMITER_MAX_MEMORY_RSS'],
				maxMemoryHeapUsed: env['PRESSURE_LIMITER_MAX_MEMORY_HEAP_USED'],
				error: new ServiceUnavailableError({ service: 'api', reason: 'Under pressure' }),
				retryAfter: env['PRESSURE_LIMITER_RETRY_AFTER'],
			}),
		);
	}

	app.use(
		helmet.contentSecurityPolicy(
			merge(
				{
					useDefaults: true,
					directives: {
						// Unsafe-eval is required for vue3 / vue-i18n / app extensions
						scriptSrc: ["'self'", "'unsafe-eval'"],

						// Even though this is recommended to have enabled, it breaks most local
						// installations. Making this opt-in rather than opt-out is a little more
						// friendly. Ref #10806
						upgradeInsecureRequests: null,

						// These are required for MapLibre
						workerSrc: ["'self'", 'blob:'],
						childSrc: ["'self'", 'blob:'],
						imgSrc: ["'self'", 'data:', 'blob:'],
						mediaSrc: ["'self'"],
						connectSrc: ["'self'", 'https://*'],
					},
				},
				getConfigFromEnv('CONTENT_SECURITY_POLICY_'),
			),
		),
	);

	if (env['HSTS_ENABLED']) {
		app.use(helmet.hsts(getConfigFromEnv('HSTS_', ['HSTS_ENABLED'])));
	}

	await emitter.emitInit('app.before', { app });

	await emitter.emitInit('middlewares.before', { app });

	app.use(createExpressLogger());

	app.use((_req, res, next) => {
		res.setHeader('X-Powered-By', 'Directus');
		next();
	});

	if (env['CORS_ENABLED'] === true) {
		app.use(cors);
	}

	app.use((req, res, next) => {
		(
			express.json({
				limit: env['MAX_PAYLOAD_SIZE'],
			}) as RequestHandler
		)(req, res, (err: any) => {
			if (err) {
				return next(new InvalidPayloadError({ reason: err.message }));
			}

			return next();
		});
	});

	app.use(cookieParser());

	app.use(extractToken);

	app.get('/', (_req, res, next) => {
		if (env['ROOT_REDIRECT']) {
			res.redirect(env['ROOT_REDIRECT']);
		} else {
			next();
		}
	});

	app.get('/robots.txt', (_, res) => {
		res.set('Content-Type', 'text/plain');
		res.status(200);
		res.send(env['ROBOTS_TXT']);
	});

	if (env['SERVE_APP']) {
		const adminPath = require.resolve('@directus/app');
		const adminUrl = new Url(env['PUBLIC_URL']).addPath('admin');

		const embeds = extensionManager.getEmbeds();

		// Set the App's base path according to the APIs public URL
		const html = await readFile(adminPath, 'utf8');

		const htmlWithVars = html
			.replace(/<base \/>/, `<base href="${adminUrl.toString({ rootRelative: true })}/" />`)
			.replace('<!-- directus-embed-head -->', embeds.head)
			.replace('<!-- directus-embed-body -->', embeds.body);

		const sendHtml = (_req: Request, res: Response) => {
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Vary', 'Origin, Cache-Control');
			res.send(htmlWithVars);
		};

		const setStaticHeaders = (res: ServerResponse) => {
			res.setHeader('Cache-Control', 'max-age=31536000, immutable');
			res.setHeader('Vary', 'Origin, Cache-Control');
		};

		app.get('/admin', sendHtml);
		app.use('/admin', express.static(path.join(adminPath, '..'), { setHeaders: setStaticHeaders }));
		app.use('/admin/*', sendHtml);
	}

	// use the rate limiter - all routes for now
	if (env['RATE_LIMITER_GLOBAL_ENABLED'] === true) {
		app.use(rateLimiterGlobal);
	}

	if (env['RATE_LIMITER_ENABLED'] === true) {
		app.use(rateLimiter);
	}

	app.get('/server/ping', (_req, res) => res.send('pong'));

	app.use(authenticate);

	app.use(checkIP);

	app.use(sanitizeQuery);

	app.use(cache);

	app.use(schema);

	app.use(getPermissions);

	await emitter.emitInit('middlewares.after', { app });

	await emitter.emitInit('routes.before', { app });

	app.use('/auth', authRouter);

	app.use('/graphql', graphqlRouter);

	app.use('/activity', activityRouter);
	app.use('/assets', assetsRouter);
	app.use('/collections', collectionsRouter);
	// Following is the customer collection router lists.
	app.use('/items/custom_custspaces', custspacesRouter);
	app.use('/items/nb_companies', companiesRouter);
	app.use('/items/nb_courses', coursesRouter);
	app.use('/items/nb_members', membersRouter);
	app.use('/items/nb_organizations', organizationsRouter);
	// app.use('/items/nb_qustionnaires', qustionnairesRouter);
	app.use('/items/nb_resources', resourcesRouter);
	app.use('/items/nb_surveys', surveysRouter);
	app.use('/items/nb_usermoods', usermoodssRouter);
	app.use('/items/nb_userstress', userstressRouter);
	app.use('/items/nb_courses', coursesRouter);
	app.use('/items/nb_chats', chatsRouter);
	app.use('/items/nb_agents', agentsRouter);
	app.use('/items/nb_servers', serversRouter);
	app.use('/items/nb_supervisors', supervisorsRouter);
	app.use('/items/nb_badgestores', badgestoresRouter);
	app.use('/items/nb_badges', badgesRouter);
	app.use('/items/nb_goals', goalsRouter);
	app.use('/items/nb_keyresults', keyresultsRouter);
	app.use('/items/nb_tasks', tasksRouter);
	app.use('/items/nb_tasklogs', tasklogsRouter);
	app.use('/items/nb_benefits', benefitsRouter);
	app.use('/items/nb_calendars', calendarsRouter);
	app.use('/items/nb_notes', notesRouter);
	app.use('/items/nb_tags', tagsRouter);
	app.use('/items/nb_nfiles', nfilesRouter);
	app.use('/items/nb_documents', documentsRouter);
	app.use('/items/nb_rags', ragsRouter);
	app.use('/items/nb_nfiles', nfilesRouter);
	app.use('/items/nb_personinfos', personinfosRouter);
	app.use('/items/nb_candidateresult', candidateresultRouter);
	app.use('/items/nb_nutritionanalyze', nutritionanalyzeRouter);

	app.use('/dashboards', dashboardsRouter);
	app.use('/extensions', extensionsRouter);
	app.use('/fields', fieldsRouter);
	app.use('/files', filesRouter);
	app.use('/flows', flowsRouter);
	app.use('/folders', foldersRouter);
	app.use('/items', itemsRouter);
	app.use('/notifications', notificationsRouter);
	app.use('/operations', operationsRouter);
	app.use('/panels', panelsRouter);
	app.use('/permissions', permissionsRouter);
	app.use('/presets', presetsRouter);
	app.use('/translations', translationsRouter);
	app.use('/relations', relationsRouter);
	app.use('/revisions', revisionsRouter);
	app.use('/roles', rolesRouter);
	app.use('/schema', schemaRouter);
	app.use('/server', serverRouter);
	app.use('/settings', settingsRouter);
	app.use('/shares', sharesRouter);
	app.use('/users', usersRouter);
	app.use('/utils', utilsRouter);
	app.use('/versions', versionsRouter);
	app.use('/webhooks', webhooksRouter);




	// app.use('/resources', resourcesRouter);


	// Register custom endpoints
	await emitter.emitInit('routes.custom.before', { app });
	app.use(extensionManager.getEndpointRouter());
	await emitter.emitInit('routes.custom.after', { app });

	app.use(notFoundHandler);
	app.use(errorHandler);

	await emitter.emitInit('routes.after', { app });

	// Register all webhooks
	await initWebhooks();

	initTelemetry();

	await emitter.emitInit('app.after', { app });

	return app;
}
