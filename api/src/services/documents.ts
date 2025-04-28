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

		// const ragDoc  = await this.knex.select('doc_id').from('nb_documents').where('id', key).first();


		const ragDocs  = await this.knex('nb_ragdocs')
		.join('nb_documents','nb_ragdocs.documents','nb_documents.id')
		.join('nb_rags','nb_ragdocs.rags','nb_rags.id')
		.where('nb_ragdocs.documents', key)
		.select('nb_ragdocs.doc_id','nb_documents.doc_tag','nb_ragdocs.rags','nb_ragdocs.id','nb_documents.doc_file','nb_rags.servers','nb_rags.rag_id')


		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})

		// delete the doc in multiple rags

		for (const key of ragDocs) {
			await ragsService.deleteRAGDoc(key.doc_tag, key.doc_id, key.servers,key.rag_id);
		}
		// ragsService.deleteRAGDoc(ragTag, ragDoc[0].doc_id);

		return await super.deleteOne(key,opts)
	}

	/**
	 * Delete multiple documents by primary key
	 */
	override async deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]> {

		//todo: verfity delete many function

		const ragDocs  = await this.knex('nb_ragdocs')
		.join('nb_documents','nb_ragdocs.documents','nb_documents.id')
		.join('nb_rags','nb_ragdocs.rags','nb_rags.id')
		.whereIn('nb_ragdocs.documents', keys)
		.select('nb_ragdocs.doc_id','nb_documents.doc_tag','nb_ragdocs.rags','nb_ragdocs.id','nb_documents.doc_file','nb_rags.servers','nb_rags.rag_id')


		const ragsService = new RagsService({
			accountability: this.accountability,
			schema: this.schema
		})


		for (const key of ragDocs) {
			await ragsService.deleteRAGDoc(key.doc_tag, key.doc_id, key.servers,key.rag_id);
		}


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
