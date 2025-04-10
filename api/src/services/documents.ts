import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item, MutationOptions, PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
// import { useLogger } from '../logger.js';
import { RagsService } from './rags.js'
// import { useEnv } from '../env.js';

// const env = useEnv();

// const logger = useLogger();
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

		const RAGDoc  = await this.knex.select('doc_id').from('nb_documents').where('id', key).first();

		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})

		// const ragKey = await this.knex.select(rag_id).from('nb_documents').join('nb_rags', 'nb_rags.tag')

		const ragTag ='all';

		ragsService.deleteRAGDoc(ragTag, RAGDoc.doc_id);

		return await super.deleteOne(key,opts)
	}


}
