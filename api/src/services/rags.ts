
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions,PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
// import { useLogger } from '../logger.js';
import { ServersService } from './servers.js'
import { v4 as uuid } from 'uuid';

// const APIKEY ='l18D9VFiUcfESJCoLSRcUjn/l/s4ZevPhA/fFzAjplA=';
// const logger = useLogger();


interface RagRes {
	id: string,
	loaderName: string,
	status: string,
	totalChunks: number,
	totalChars: number,

};


export class RagsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_rags', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async updateRAGDoc(docKey:PrimaryKey): Promise<string> {

		// const docInfo = await this.knex.select('doc_id','doctype','doc_file','doc_tag','doc_text','name').from('nb_documents').where('id', docKey).first();


		const docInfos = await this.knex('nb_ragdocs')
		.join('nb_documents','nb_ragdocs.documents','nb_documents.id')
		.join('nb_rags','nb_ragdocs.rags','nb_rags.id')
		.where('nb_ragdocs.documents', docKey)
		.select('nb_ragdocs.doc_id','nb_documents.doc_text','nb_documents.doctype','nb_documents.doc_tag','nb_ragdocs.rags','nb_ragdocs.id','nb_documents.doc_file','nb_rags.servers','nb_rags.rag_id','nb_documents.name')


		// const doc_tag = 'all'

		//get rag basc info
		// const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		docInfos.forEach(async (key) => {

			const serversInfo = await serversService.gerateRAGUrl(key.servers);

			const url = serversInfo?.url+'save';

			const  formData = JSON.stringify({
				"loaderId":"plainText",
				"id":key.doc_id,
				"storeId":key.rag_id,
				"loaderName":key.name,
				"loaderConfig":{"text":key.doc_text,"textSplitter":"","metadata":"","omitMetadataKeys":""}
			})


			try {
				const res = await fetch(url, {
					method: 'POST',
					headers: {
						"Content-Type": "application/json",
						"Authorization": "Bearer " + serversInfo?.apikey
					},
					body: formData
				})

				if(!res.ok){
					throw new Error(`[${res.status}] ${await res.text()}`)
				}else{
					return key.doc_tag
				}
			} catch (error: any) {
				// logger.error(error);
				return 'undefined'

			}

		});

		await this.processRAGDoc(docKey);

		return 'key'


		// const serversInfo = await serversService.gerateRAGUrl(ragInfo.servers)

		// const url = serversInfo?.url+'upsert/'+ragInfo.rag_id

		// const  formData = JSON.stringify({
		// 	"docId": docInfo.doc_id,
		// 	"metadata": "{}",
		// 	"replaceExisting": true,
		// 	"createNewDocStore": false,
		// 	"loader":{
		// 		"config": {"text": docInfo.doc_text},
		// 	},
		// 	"splitter": {
		// 		"config": {"chunkSize": 20000}
		// 	}
		// })

	}

	async createRAGDoc(docKey: PrimaryKey): Promise<string> {
		//TODO create the RAG according to the the tags
		//select the rag id from the nb_rag
		//create the doc for each rag according to the doc type.
		//then store the docId

		const docInfos = await this.knex('nb_rags')
		.join('nb_documents', (join) => {
		  join.on(
				this.knex.raw('nb_documents.doc_tag::jsonb @> jsonb_build_array(nb_rags.doc_tag)')
			);
		}).where('nb_documents.id', docKey).select('nb_documents.doctype','nb_documents.doc_file','nb_documents.doc_text','nb_documents.name','nb_rags.doc_tag','nb_rags.servers','nb_rags.rag_id','nb_rags.id')


		// const docInfo = await this.knex.select('doc_id','doctype','doc_file','doc_tag','doc_text','name').from('nb_documents').where('id', docKey).first();

		// const doc_tag = 'all'

		//get rag basc info
		// const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		// const serversInfo = await serversService.gerateRAGUrl(ragInfo.servers)

		// const url = serversInfo?.url+'save'

		docInfos.forEach(async (key) => {

			const serversInfo = await serversService.gerateRAGUrl(key.servers)

			const url = serversInfo?.url+'save'

			const  formData = JSON.stringify({"loaderId":"plainText","storeId":key.rag_id,"loaderName":key.name,"loaderConfig":{"text":key.doc_text,"textSplitter":"","metadata":"","omitMetadataKeys":""}})

			try {
				const res = await fetch(url, {
					method: 'POST',
					headers: {
						"Content-Type": "application/json",
						"Authorization": "Bearer " + serversInfo?.apikey
					},
					body: formData
				})

				if(!res.ok){
					throw new Error(`[${res.status}] ${await res.text()}`)
				}else{
					const ragRes = res.json() as Promise<RagRes>

					const doc_id =  (await ragRes).id

					const ragdocs_id = uuid();

					await  this.knex('nb_ragdocs').insert({'id':ragdocs_id,'doc_id': doc_id,'rags': key.id, 'documents':docKey})


					return
				}
			} catch (error: any) {
					// logger.error(error);
					return 'undefined'

				}
		});

		return 'test'

		//todo add rag for other type documents
		//todo store the doc_id for the documents.

		// const  formData = JSON.stringify({"loaderId":"plainText","storeId":ragInfo.rag_id,"loaderName":docInfo.name,"loaderConfig":{"text":docInfo.doc_text,"textSplitter":"","metadata":"","omitMetadataKeys":""}})

		// formData.append("files",'file');
		// formData.append("docId", "c9121efa-1ce1-4708-af06-32a59abd720b");
		// formData.append("loaderId", "plainText");
		// formData.append("storeId", ragInfo.rag_id);
		// formData.append("loaderName",docInfo.name );
		// formData.append("loaderConfig",JSON.stringify({"text":docInfo.doc_text,"textSplitter":"","metadata":"","omitMetadataKeys":""}))
		// formData.append("splitterId","characterTextSplitter")
		// formData.append("splitterConfig", JSON.stringify({"config":{"chunkSize":20000,"separator":""}}));
		// formData.append("splitterName","Character Text Splitter")

		// Add additional metadata to the document chunks
		// formData.append("metadata", "{}");
		// Replace existing document with the new upserted chunks
		// formData.append("replaceExisting", "true");
		// Override existing configuration
		// formData.append("loader", "");
		// formData.append("embedding", "");
		// formData.append("vectorStore", "");
		// formData.append("recordManager", "");
		// formData.append("docStore", "");

		// try {
		// 	const res = await fetch(url, {
		// 		method: 'POST',
		// 		headers: {
		// 			"Content-Type": "application/json",
		// 			"Authorization": "Bearer " + serversInfo?.apikey
		// 		},
		// 		body: formData
		// 	})

		// 	// logger.error(res.ok)

		// 	if(!res.ok){
		// 		throw new Error(`[${res.status}] ${await res.text()}`)
		// 	}else{
		// 		const ragRes = res.json() as Promise<RagRes>

		// 		const doc_id =  (await ragRes).id

		// 		await  this.knex('nb_documents').update({'doc_id': doc_id }).where('id', '=', docKey)

		// 		return doc_tag
		// 	}
		// } catch (error: any) {
		// 	// logger.error(error);
		// 	return 'undefined'

		// }
	}

	async processRAGDoc(docKey:PrimaryKey): Promise<string> {
		//TODO create the RAG according to the the tags
		//select the rag id from the nb_rag
		//create the doc for each rag according to the doc type.
		//then store the docId

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		//get rag basc info

		// const docInfo = await this.knex.select('doc_id','doctype','doc_file','doc_tag','doc_text','name').from('nb_documents').where('id', docKey).first();

		const docInfos = await this.knex('nb_ragdocs')
		.join('nb_documents','nb_ragdocs.documents','nb_documents.id')
		.join('nb_rags','nb_ragdocs.rags','nb_rags.id')
		.where('nb_ragdocs.documents', docKey)
		.select('nb_ragdocs.doc_id','nb_documents.doc_text','nb_documents.doc_tag','nb_ragdocs.rags','nb_ragdocs.id','nb_documents.doc_file','nb_rags.servers','nb_rags.rag_id')

		// const doc_tag = 'all'

		docInfos.forEach(async (key) => {
			const serversInfo = await serversService.gerateRAGUrl(key.servers)

			const url = serversInfo?.url+'process/'+key.doc_id

			const  formData = JSON.stringify({
				"loaderId":"plainText",
				"id":key.doc_id,
				"storeId":key.rag_id,
				"loaderName":"test",
				"loaderConfig":{
					"text":key.doc_text,
					"textSplitter":"","metadata":"","omitMetadataKeys":""
				}
			})

			try {
				const res = await fetch(url, {
					method: 'POST',
					headers: {
						"Content-Type": "application/json",
						"Authorization": "Bearer " + serversInfo?.apikey
					},
					body: formData
				})

				if(!res.ok){
					throw new Error(`[${res.status}] ${await res.text()}`)
				}else{
					return key.doc_tag
				}
			} catch (error: any) {
				// logger.error(error);
				return 'undefined'

			}

		})

		return 'done';

		// const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		// const serversInfo = await serversService.gerateRAGUrl(ragInfo.servers)

		// const url = serversInfo?.url+'process/'+docInfo.doc_id
		// const url = new  URL("http://localhost:3000/api/v1/document-store/loader/process/4cccaa89-0fff-42c7-b791-6de84934ae96/,);

		// const  formData = JSON.stringify({
		// 	"loaderId":"plainText",
		// 	"id":docInfo.doc_id,
		// 	"storeId":ragInfo.rag_id,
		// 	"loaderName":"test",
		// 	"loaderConfig":{
		// 		"text":docInfo.doc_text,
		// 		"textSplitter":"","metadata":"","omitMetadataKeys":""
		// 	}
		// })

		// try {
		// 	const res = await fetch(url, {
		// 		method: 'POST',
		// 		headers: {
		// 			"Content-Type": "application/json",
		// 			"Authorization": "Bearer " + serversInfo?.apikey
		// 		},
		// 		body: formData
		// 	})

		// 	// logger.error(res.ok)

		// 	if(!res.ok){
		// 		throw new Error(`[${res.status}] ${await res.text()}`)
		// 	}else{
		// 		// return res.json()
		// 		return doc_tag
		// 	}
		// } catch (error: any) {
		// 	// logger.error(error);
		// 	return 'undefined'

		// }
	}

	async deleteRAGDoc(doc_tag:string,docId:string, servers:string, rag_id:string): Promise<string> {

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		//get rag basc info
		// const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		//get the rag server address and appkey
		const serversInfo = await serversService.gerateRAGUrl(servers)

		const url = serversInfo?.url+rag_id+'/'+docId
		// const url = new  URL("http://localhost:3000/api/v1/document-store/loader/4cccaa89-0fff-42c7-b791-6de84934ae96/"+docId,);

		try {
			const res = await fetch(url, {
				method: 'DELETE',
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer " + serversInfo?.apikey
				},
			})

			// logger.error(res.ok)

			if(!res.ok){
				throw new Error(`[${res.status}] ${await res.text()}`)
			}else{
				// return res.json()
				return doc_tag
			}
		} catch (error: any) {
			// logger.error(error);
			return 'undefined'

		}
	}

	// async getRAGId(tags: JSON): Promise<[string]>{
	// 	return ['1']
	// }
}
