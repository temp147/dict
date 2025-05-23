/**
 * @NOTE
 * For all possible keys, see: https://docs.directus.io/self-hosted/config-options/
 */

import { JAVASCRIPT_FILE_EXTS } from '@directus/constants';
import { parseJSON, toArray } from '@directus/utils';
import dotenv from 'dotenv';
import fs from 'fs';
import { clone, toNumber, toString } from 'lodash-es';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'path';
import getModuleDefault from './utils/get-module-default.js';
import { requireYAML } from './utils/require-yaml.js';
import { toBoolean } from './utils/to-boolean.js';

const require = createRequire(import.meta.url);

// keeping this here for now to prevent a circular import to constants.ts
const allowedEnvironmentVars = [
	// general
	'CONFIG_PATH',
	'HOST',
	'PORT',
	'PUBLIC_URL',
	'LOG_LEVEL',
	'LOG_STYLE',
	'LOG_HTTP_IGNORE_PATHS',
	'MAX_PAYLOAD_SIZE',
	'ROOT_REDIRECT',
	'SERVE_APP',
	'GRAPHQL_INTROSPECTION',
	'MAX_BATCH_MUTATION',
	'LOGGER_.+',
	'QUERY_LIMIT_MAX',
	'QUERY_LIMIT_DEFAULT',
	'ROBOTS_TXT',
	'TEMP_PATH',
	// server
	'SERVER_.+',
	// database
	'DB_.+',
	// security
	'KEY',
	'SECRET',
	'ACCESS_TOKEN_TTL',
	'REFRESH_TOKEN_TTL',
	'REFRESH_TOKEN_COOKIE_DOMAIN',
	'REFRESH_TOKEN_COOKIE_SECURE',
	'REFRESH_TOKEN_COOKIE_SAME_SITE',
	'REFRESH_TOKEN_COOKIE_NAME',

	'REDIS',
	'REDIS_HOST',
	'REDIS_PORT',
	'REDIS_USERNAME',
	'REDIS_PASSWORD',
	'REDIS_DB',

	'LOGIN_STALL_TIME',
	'PASSWORD_RESET_URL_ALLOW_LIST',
	'USER_INVITE_URL_ALLOW_LIST',
	'IP_TRUST_PROXY',
	'IP_CUSTOM_HEADER',
	'ASSETS_CONTENT_SECURITY_POLICY',
	'IMPORT_IP_DENY_LIST',
	'CONTENT_SECURITY_POLICY_.+',
	'HSTS_.+',
	// hashing
	'HASH_.+',
	// cors
	'CORS_ENABLED',
	'CORS_ORIGIN',
	'CORS_METHODS',
	'CORS_ALLOWED_HEADERS',
	'CORS_EXPOSED_HEADERS',
	'CORS_CREDENTIALS',
	'CORS_MAX_AGE',
	// rate limiting
	'RATE_LIMITER_GLOBAL_.+',
	'RATE_LIMITER_.+',
	// cache
	'CACHE_ENABLED',
	'CACHE_TTL',
	'CACHE_CONTROL_S_MAXAGE',
	'CACHE_AUTO_PURGE',
	'CACHE_AUTO_PURGE_IGNORE_LIST',
	'CACHE_SYSTEM_TTL',
	'CACHE_SCHEMA',
	'CACHE_PERMISSIONS',
	'CACHE_NAMESPACE',
	'CACHE_STORE',
	'CACHE_STATUS_HEADER',
	'CACHE_VALUE_MAX_SIZE',
	'CACHE_SKIP_ALLOWED',
	'CACHE_HEALTHCHECK_THRESHOLD',
	// storage
	'STORAGE_LOCATIONS',
	'STORAGE_.+_DRIVER',
	'STORAGE_.+_ROOT',
	'STORAGE_.+_KEY',
	'STORAGE_.+_SECRET',
	'STORAGE_.+_BUCKET',
	'STORAGE_.+_REGION',
	'STORAGE_.+_ENDPOINT',
	'STORAGE_.+_ACL',
	'STORAGE_.+_CONTAINER_NAME',
	'STORAGE_.+_SERVER_SIDE_ENCRYPTION',
	'STORAGE_.+_ACCOUNT_NAME',
	'STORAGE_.+_ACCOUNT_KEY',
	'STORAGE_.+_ENDPOINT',
	'STORAGE_.+_KEY_FILENAME',
	'STORAGE_.+_BUCKET',
	'STORAGE_.+_HEALTHCHECK_THRESHOLD',
	// metadata
	'FILE_METADATA_ALLOW_LIST',

	// files
	'FILES_MAX_UPLOAD_SIZE',
	'FILES_CONTENT_TYPE_ALLOW_LIST',

	// assets
	'ASSETS_CACHE_TTL',
	'ASSETS_TRANSFORM_MAX_CONCURRENT',
	'ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION',
	'ASSETS_TRANSFORM_MAX_OPERATIONS',
	'ASSETS_TRANSFORM_TIMEOUT',
	'ASSETS_CONTENT_SECURITY_POLICY',
	'ASSETS_INVALID_IMAGE_SENSITIVITY_LEVEL',
	// auth
	'AUTH_PROVIDERS',
	'AUTH_DISABLE_DEFAULT',
	'AUTH_.+_DRIVER',
	'AUTH_.+_CLIENT_ID',
	'AUTH_.+_CLIENT_SECRET',
	'AUTH_.+_SCOPE',
	'AUTH_.+_AUTHORIZE_URL',
	'AUTH_.+_ACCESS_URL',
	'AUTH_.+_PROFILE_URL',
	'AUTH_.+_IDENTIFIER_KEY',
	'AUTH_.+_EMAIL_KEY',
	'AUTH_.+_FIRST_NAME_KEY',
	'AUTH_.+_LAST_NAME_KEY',
	'AUTH_.+_ALLOW_PUBLIC_REGISTRATION',
	'AUTH_.+_DEFAULT_ROLE_ID',
	'AUTH_.+_ICON',
	'AUTH_.+_LABEL',
	'AUTH_.+_PARAMS',
	'AUTH_.+_ISSUER_URL',
	'AUTH_.+_AUTH_REQUIRE_VERIFIED_EMAIL',
	'AUTH_.+_CLIENT_URL',
	'AUTH_.+_BIND_DN',
	'AUTH_.+_BIND_PASSWORD',
	'AUTH_.+_USER_DN',
	'AUTH_.+_USER_ATTRIBUTE',
	'AUTH_.+_USER_SCOPE',
	'AUTH_.+_MAIL_ATTRIBUTE',
	'AUTH_.+_FIRST_NAME_ATTRIBUTE',
	'AUTH_.+_LAST_NAME_ATTRIBUTE',
	'AUTH_.+_GROUP_DN',
	'AUTH_.+_GROUP_ATTRIBUTE',
	'AUTH_.+_GROUP_SCOPE',
	'AUTH_.+_IDP.+',
	'AUTH_.+_SP.+',
	// extensions
	'PACKAGE_FILE_LOCATION',
	'EXTENSIONS_LOCATION',
	'EXTENSIONS_PATH',
	'EXTENSIONS_MUST_LOAD',
	'EXTENSIONS_AUTO_RELOAD',
	'EXTENSIONS_CACHE_TTL',
	'EXTENSIONS_SANDBOX_MEMORY',
	'EXTENSIONS_SANDBOX_TIMEOUT',
	// messenger
	'MESSENGER_STORE',
	'MESSENGER_NAMESPACE',
	// synchronization
	'SYNCHRONIZATION_STORE',
	'SYNCHRONIZATION_NAMESPACE',
	// emails
	'EMAIL_FROM',
	'EMAIL_TRANSPORT',
	'EMAIL_VERIFY_SETUP',
	'EMAIL_SENDMAIL_NEW_LINE',
	'EMAIL_SENDMAIL_PATH',
	'EMAIL_SMTP_NAME',
	'EMAIL_SMTP_HOST',
	'EMAIL_SMTP_PORT',
	'EMAIL_SMTP_USER',
	'EMAIL_SMTP_PASSWORD',
	'EMAIL_SMTP_POOL',
	'EMAIL_SMTP_SECURE',
	'EMAIL_SMTP_IGNORE_TLS',
	'EMAIL_MAILGUN_API_KEY',
	'EMAIL_MAILGUN_DOMAIN',
	'EMAIL_MAILGUN_HOST',
	'EMAIL_SENDGRID_API_KEY',
	'EMAIL_SES_CREDENTIALS__ACCESS_KEY_ID',
	'EMAIL_SES_CREDENTIALS__SECRET_ACCESS_KEY',
	'EMAIL_SES_REGION',
	// admin account
	'ADMIN_EMAIL',
	'ADMIN_PASSWORD',
	// telemetry
	'TELEMETRY',
	'TELEMETRY_URL',
	'TELEMETRY_AUTHORIZATION',

	// limits & optimization
	'RELATIONAL_BATCH_SIZE',
	'EXPORT_BATCH_SIZE',
	// flows
	'FLOWS_ENV_ALLOW_LIST',
	'FLOWS_RUN_SCRIPT_MAX_MEMORY',
	'FLOWS_RUN_SCRIPT_TIMEOUT',
	// websockets
	'WEBSOCKETS_.+',
].map((name) => new RegExp(`^${name}$`));

const acceptedEnvTypes = ['string', 'number', 'regex', 'array', 'json'];

export const defaults: Record<string, any> = {
	CONFIG_PATH: path.resolve(process.cwd(), '.env'),

	HOST: '0.0.0.0',
	PORT: 8055,
	PUBLIC_URL: '/',
	MAX_PAYLOAD_SIZE: '1mb',
	MAX_RELATIONAL_DEPTH: 10,
	QUERY_LIMIT_DEFAULT: 100,
	MAX_BATCH_MUTATION: Infinity,
	ROBOTS_TXT: 'User-agent: *\nDisallow: /',

	TEMP_PATH: './node_modules/.directus',

	DB_EXCLUDE_TABLES: 'spatial_ref_sys,sysdiagrams',

	STORAGE_LOCATIONS: 'local',
	STORAGE_LOCAL_DRIVER: 'local',
	STORAGE_LOCAL_ROOT: './uploads',

	RATE_LIMITER_ENABLED: false,
	RATE_LIMITER_POINTS: 50,
	RATE_LIMITER_DURATION: 1,
	RATE_LIMITER_STORE: 'memory',

	RATE_LIMITER_GLOBAL_ENABLED: false,
	RATE_LIMITER_GLOBAL_POINTS: 1000,
	RATE_LIMITER_GLOBAL_DURATION: 1,
	RATE_LIMITER_GLOBAL_STORE: 'memory',

	ACCESS_TOKEN_TTL: '15m',
	REFRESH_TOKEN_TTL: '7d',
	REFRESH_TOKEN_COOKIE_SECURE: false,
	REFRESH_TOKEN_COOKIE_SAME_SITE: 'lax',
	REFRESH_TOKEN_COOKIE_NAME: 'directus_refresh_token',

	LOGIN_STALL_TIME: 500,
	SERVER_SHUTDOWN_TIMEOUT: 1000,

	ROOT_REDIRECT: './admin',

	CORS_ENABLED: false,
	CORS_ORIGIN: false,
	CORS_METHODS: 'GET,POST,PATCH,DELETE',
	CORS_ALLOWED_HEADERS: 'Content-Type,Authorization',
	CORS_EXPOSED_HEADERS: 'Content-Range',
	CORS_CREDENTIALS: true,
	CORS_MAX_AGE: 18000,

	CACHE_ENABLED: false,
	CACHE_STORE: 'memory',
	CACHE_TTL: '5m',
	CACHE_NAMESPACE: 'system-cache',
	CACHE_AUTO_PURGE: false,
	CACHE_AUTO_PURGE_IGNORE_LIST: 'directus_activity,directus_presets',
	CACHE_CONTROL_S_MAXAGE: '0',
	CACHE_SCHEMA: true,
	CACHE_PERMISSIONS: true,
	CACHE_VALUE_MAX_SIZE: false,
	CACHE_SKIP_ALLOWED: false,

	AUTH_PROVIDERS: '',
	AUTH_DISABLE_DEFAULT: false,

	PACKAGE_FILE_LOCATION: '.',
	EXTENSIONS_PATH: './extensions',
	EXTENSIONS_MUST_LOAD: false,
	EXTENSIONS_AUTO_RELOAD: false,
	EXTENSIONS_SANDBOX_MEMORY: 100,
	EXTENSIONS_SANDBOX_TIMEOUT: 1000,

	EMAIL_FROM: 'no-reply@example.com',
	EMAIL_VERIFY_SETUP: true,
	EMAIL_TRANSPORT: 'sendmail',
	EMAIL_SENDMAIL_NEW_LINE: 'unix',
	EMAIL_SENDMAIL_PATH: '/usr/sbin/sendmail',

	TELEMETRY: false,
	TELEMETRY_URL: 'https://telemetry.directus.io',

	ASSETS_CACHE_TTL: '30d',
	ASSETS_TRANSFORM_MAX_CONCURRENT: 25,
	ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION: 6000,
	ASSETS_TRANSFORM_MAX_OPERATIONS: 5,
	ASSETS_TRANSFORM_TIMEOUT: '7500ms',
	ASSETS_INVALID_IMAGE_SENSITIVITY_LEVEL: 'warning',

	IP_TRUST_PROXY: true,
	IP_CUSTOM_HEADER: false,

	IMPORT_IP_DENY_LIST: ['0.0.0.0', '169.254.169.254'],

	SERVE_APP: true,

	RELATIONAL_BATCH_SIZE: 25000,

	EXPORT_BATCH_SIZE: 5000,

	FILE_METADATA_ALLOW_LIST: 'ifd0.Make,ifd0.Model,exif.FNumber,exif.ExposureTime,exif.FocalLength,exif.ISO',

	GRAPHQL_INTROSPECTION: true,

	WEBSOCKETS_ENABLED: false,
	WEBSOCKETS_REST_ENABLED: true,
	WEBSOCKETS_REST_AUTH: 'handshake',
	WEBSOCKETS_REST_AUTH_TIMEOUT: 10,
	WEBSOCKETS_REST_PATH: '/websocket',
	WEBSOCKETS_GRAPHQL_ENABLED: true,
	WEBSOCKETS_GRAPHQL_AUTH: 'handshake',
	WEBSOCKETS_GRAPHQL_AUTH_TIMEOUT: 10,
	WEBSOCKETS_GRAPHQL_PATH: '/graphql',
	WEBSOCKETS_HEARTBEAT_ENABLED: true,
	WEBSOCKETS_HEARTBEAT_PERIOD: 30,

	FLOWS_ENV_ALLOW_LIST: false,
	FLOWS_RUN_SCRIPT_MAX_MEMORY: 32,
	FLOWS_RUN_SCRIPT_TIMEOUT: 10000,

	PRESSURE_LIMITER_ENABLED: true,
	PRESSURE_LIMITER_SAMPLE_INTERVAL: 250,
	PRESSURE_LIMITER_MAX_EVENT_LOOP_UTILIZATION: 0.99,
	PRESSURE_LIMITER_MAX_EVENT_LOOP_DELAY: 500,
	PRESSURE_LIMITER_MAX_MEMORY_RSS: false,
	PRESSURE_LIMITER_MAX_MEMORY_HEAP_USED: false,
	PRESSURE_LIMITER_RETRY_AFTER: false,

	FILES_MIME_TYPE_ALLOW_LIST: '*/*',
};

/**
 * Allows us to force certain environment variable into a type, instead of relying
 * on the auto-parsed type in processValues.
 */
const typeMap: Record<string, string> = {
	HOST: 'string',
	PORT: 'string',

	DB_NAME: 'string',
	DB_USER: 'string',
	DB_PASSWORD: 'string',
	DB_DATABASE: 'string',
	DB_PORT: 'number',

	DB_EXCLUDE_TABLES: 'array',

	CACHE_SKIP_ALLOWED: 'boolean',
	CACHE_AUTO_PURGE_IGNORE_LIST: 'array',

	IMPORT_IP_DENY_LIST: 'array',

	FILE_METADATA_ALLOW_LIST: 'array',

	GRAPHQL_INTROSPECTION: 'boolean',

	MAX_BATCH_MUTATION: 'number',

	SERVER_SHUTDOWN_TIMEOUT: 'number',

	LOG_HTTP_IGNORE_PATHS: 'array',
};

let env: Record<string, any> = {
	...defaults,
	...process.env,
	...(await processConfiguration()),
};

process.env = env;

env = processValues(env);

export const useEnv = () => env;

/**
 * When changes have been made during runtime, like in the CLI, we can refresh the env object with
 * the newly created variables
 */
export async function refreshEnv(): Promise<void> {
	env = {
		...defaults,
		...process.env,
		...(await processConfiguration()),
	};

	process.env = env;

	env = processValues(env);
}

async function processConfiguration() {
	const configPath = path.resolve(process.env['CONFIG_PATH'] || defaults['CONFIG_PATH']);

	if (fs.existsSync(configPath) === false) return {};

	const fileExt = path.extname(configPath).toLowerCase().substring(1);

	if ((JAVASCRIPT_FILE_EXTS as readonly string[]).includes(fileExt)) {
		const data = await import(pathToFileURL(configPath).toString());
		const config = getModuleDefault(data);

		if (typeof config === 'function') {
			return config(process.env);
		} else if (typeof config === 'object') {
			return config;
		}

		throw new Error(
			`Invalid JS configuration file export type. Requires one of "function", "object", received: "${typeof config}"`,
		);
	}

	if (fileExt === 'json') {
		return require(configPath);
	}

	if (fileExt === 'yaml' || fileExt === 'yml') {
		const data = requireYAML(configPath);

		if (typeof data === 'object') {
			return data as Record<string, string>;
		}

		throw new Error('Invalid YAML configuration. Root has to be an object.');
	}

	// Default to env vars plain text files
	return dotenv.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
}

function getVariableType(variable: string) {
	return variable.split(':').slice(0, -1)[0];
}

function getEnvVariableValue(variableValue: string, variableType: string) {
	return variableValue.split(`${variableType}:`)[1];
}

function getEnvironmentValueWithPrefix(envArray: Array<string>): Array<string | number | RegExp> {
	return envArray.map((item: string) => {
		if (isEnvSyntaxPrefixPresent(item)) {
			return getEnvironmentValueByType(item);
		}

		return item;
	});
}

function getEnvironmentValueByType(envVariableString: string) {
	const variableType = getVariableType(envVariableString)!;
	const envVariableValue = getEnvVariableValue(envVariableString, variableType)!;

	switch (variableType) {
		case 'number':
			return toNumber(envVariableValue);
		case 'array':
			return getEnvironmentValueWithPrefix(toArray(envVariableValue));
		case 'regex':
			return new RegExp(envVariableValue);
		case 'string':
			return envVariableValue;
		case 'json':
			return tryJSON(envVariableValue);
	}
}

function isEnvSyntaxPrefixPresent(value: string): boolean {
	return acceptedEnvTypes.some((envType) => value.includes(`${envType}:`));
}

export function processValues(env: Record<string, any>) {
	env = clone(env);

	for (let [key, value] of Object.entries(env)) {
		// If key ends with '_FILE', try to get the value from the file defined in this variable
		// and store it in the variable with the same name but without '_FILE' at the end
		let newKey: string | undefined;

		if (key.length > 5 && key.endsWith('_FILE')) {
			newKey = key.slice(0, -5);

			if (allowedEnvironmentVars.some((pattern) => pattern.test(newKey as string))) {
				if (newKey in env && !(newKey in defaults && env[newKey] === defaults[newKey])) {
					throw new Error(
						`Duplicate environment variable encountered: you can't use "${newKey}" and "${key}" simultaneously.`,
					);
				}

				try {
					value = fs.readFileSync(value, { encoding: 'utf8' });
					key = newKey;
				} catch {
					throw new Error(`Failed to read value from file "${value}", defined in environment variable "${key}".`);
				}
			}
		}

		// Convert values with a type prefix
		// (see https://docs.directus.io/reference/environment-variables/#environment-syntax-prefix)
		if (typeof value === 'string' && isEnvSyntaxPrefixPresent(value)) {
			env[key] = getEnvironmentValueByType(value);
			continue;
		}

		// Convert values where the key is defined in typeMap
		if (typeMap[key]) {
			switch (typeMap[key]) {
				case 'number':
					env[key] = toNumber(value);
					break;
				case 'string':
					env[key] = toString(value);
					break;
				case 'array':
					env[key] = toArray(value);
					break;
				case 'json':
					env[key] = tryJSON(value);
					break;
				case 'boolean':
					env[key] = toBoolean(value);
			}

			continue;
		}

		// Try to convert remaining values:
		// - boolean values to boolean
		// - 'null' to null
		// - number values (> 0 <= Number.MAX_SAFE_INTEGER) to number
		if (value === 'true') {
			env[key] = true;
			continue;
		}

		if (value === 'false') {
			env[key] = false;
			continue;
		}

		if (value === 'null') {
			env[key] = null;
			continue;
		}

		if (
			String(value).startsWith('0') === false &&
			isNaN(value) === false &&
			value.length > 0 &&
			value <= Number.MAX_SAFE_INTEGER
		) {
			env[key] = Number(value);
			continue;
		}

		if (String(value).includes(',')) {
			env[key] = toArray(value);
			continue;
		}

		// Try converting the value to a JS object. This allows JSON objects to be passed for nested
		// config flags, or custom param names (that aren't camelCased)
		env[key] = tryJSON(value);

		// If '_FILE' variable hasn't been processed yet, store it as it is (string)
		if (newKey) {
			env[key] = value;
		}
	}

	return env;
}

function tryJSON(value: any) {
	try {
		return parseJSON(value);
	} catch {
		return value;
	}
}
