import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item, MutationOptions, PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
// import { useLogger } from '../logger.js';
import { RagsService } from './rags.js'
// import { useEnv } from '../env.js';
import type { Query } from '@directus/types';
import { cloneDeep } from 'lodash-es';

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

		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})

		await ragsService.createRAGDoc(result[0]!);//update the document info
		await ragsService.processRAGDoc(result[0]!);//process the rag

		return result[0]!;
	}

	override async updateOne(key: PrimaryKey, data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey> {
		await this.updateMany([key], data, opts);

		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})

		await ragsService.updateRAGDoc(key);//update the document info
		await ragsService.processRAGDoc(key);//process the rag

		return key;
	}

	override async createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]> {
		return await super.createMany(data, opts);
	}

	override async deleteOne(key: PrimaryKey, opts?: MutationOptions): Promise<PrimaryKey> {

		const ragDoc  = await this.knex.select('doc_id').from('nb_documents').where('id', key).first();

		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})

		// const ragKey = await this.knex.select(rag_id).from('nb_documents').join('nb_rags', 'nb_rags.tag')

		const ragTag ='all';

		ragsService.deleteRAGDoc(ragTag, ragDoc.doc_id);

		return await super.deleteOne(key,opts)
	}

	/**
	 * Delete multiple documents by primary key
	 */
	override async deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]> {

		const ragDoc  = await this.knex.select('doc_id','doc_tag').from('nb_documents').whereIn('id', keys)

		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})

		// todo delete the rag doc by ragTag
		const ragTag ='all';

		ragDoc.forEach((key) => {
			// ragsService.deleteRAGDoc(key.doc_tag, key.doc_id);
			ragsService.deleteRAGDoc(ragTag, key.doc_id);
		});

		await super.deleteMany(keys, opts);
		return keys;
	}

	override async deleteByQuery(query: Query, opts?: MutationOptions): Promise<PrimaryKey[]> {
		const primaryKeyField = this.schema.collections[this.collection]!.primary;
		const readQuery = cloneDeep(query);
		readQuery.fields = [primaryKeyField];

		// Not authenticated:
		const itemsService = new ItemsService(this.collection, {
			knex: this.knex,
			schema: this.schema,
		});

		const itemsToDelete = await itemsService.readByQuery(readQuery);
		const keys: PrimaryKey[] = itemsToDelete.map((item: Item) => item[primaryKeyField]);

		if (keys.length === 0) return [];

		return await this.deleteMany(keys, opts);
	}


}
