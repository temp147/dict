import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item, MutationOptions, PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
// import { useLogger } from '../logger.js';
import { RagsService } from './rags.js'
// import { useEnv } from '../env.js';

// const env = useEnv();

// const logger = useLogger();

// const APIKEY ='l18D9VFiUcfESJCoLSRcUjn/l/s4ZevPhA/fFzAjplA='

export class DocumentsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_documents', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	override async createOne(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey> {
		const result = await this.createMany([data], opts);
		return result[0]!;
	}

	override async createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]> {
		return await super.createMany(data, opts);
	}

	override async deleteOne(key: PrimaryKey, opts?: MutationOptions): Promise<PrimaryKey> {

		const RAGDocId = await this.knex.select('docId').from('nb_documents').where('id', key);

		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})

		ragsService.deleteRAGDoc(key, RAGDocId);

		return await super.deleteOne(key,opts)
	}


}
