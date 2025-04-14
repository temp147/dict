
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions,Item,PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
import { useLogger } from '../logger.js';
import { ServersService } from './servers.js'

// const APIKEY ='l18D9VFiUcfESJCoLSRcUjn/l/s4ZevPhA/fFzAjplA=';
const logger = useLogger();

export class RagsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_rags', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async updateRAGDoc(doc_tag:string,docId:string): Promise<string> {

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		//get rag basc info
		const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		const serversInfo = await serversService.gerateRAGUrl(ragInfo.servers)

		const url = serversInfo?.url+'upsert/'+ragInfo.rag_id+'/'

		const  formData = new FormData();

		// formData.append("files",'file');
		formData.append("docId", docId);
		formData.append("loaderId", "plainText");
		formData.append("storeId", ragInfo.rag_id);
		formData.append("loaderName","Plain Text" );
		formData.append("loaderConfig",JSON.stringify({"text":"this is new text","textSplitter":"","metadata":"","omitMetadataKeys":""}))

		formData.append("splitterId","characterTextSplitter")
		formData.append("splitterConfig", JSON.stringify({"config":{"chunkSize":20000,"separator":""}}));
		formData.append("splitterName","Character Text Splitter")

		// Add additional metadata to the document chunks
		// formData.append("metadata", "{}");
		// Replace existing document with the new upserted chunks
		formData.append("replaceExisting", "true");
		// Override existing configuration
		// formData.append("loader", "");
		// formData.append("embedding", "");
		// formData.append("vectorStore", "");
		// formData.append("recordManager", "");
		// formData.append("docStore", "");


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
				// return res.json()
				return doc_tag
			}
		} catch (error: any) {
			// logger.error(error);
			return 'undefined'

		}
	}

	async createRAGDoc(docKey: PrimaryKey): Promise<string> {
		//TODO create the RAG according to the the tags
		//select the rag id from the nb_rag
		//create the doc for each rag according to the doc type.
		//then store the docId

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		const docInfo = await this.knex.select('doc_id','doctype','doc_file','doc_tag','doc_text','name').from('nb_documents').where('id', docKey).first();

		const doc_tag = 'all'

		//get rag basc info
		const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		const serversInfo = await serversService.gerateRAGUrl(ragInfo.servers)

		const url = serversInfo?.url+'save'
		const  formData = new FormData();

		// formData.append("files",'file');
		// formData.append("docId", "c9121efa-1ce1-4708-af06-32a59abd720b");
		formData.append("loaderId", "plainText");
		formData.append("storeId", ragInfo.rag_id);
		formData.append("loaderName",docInfo.name );
		formData.append("loaderConfig",JSON.stringify({"text":docInfo.doc_text,"textSplitter":"","metadata":"","omitMetadataKeys":""}))

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

// 		curl 'http://localhost:3000/api/v1/document-store/loader/save' \
//   -H 'Content-Type: application/json' \
//   -H 'Authorization: Bearer l18D9VFiUcfESJCoLSRcUjn/l/s4ZevPhA/fFzAjplA=' \
//   -b 'method=POST;' \
//   --data-raw '{"loaderId":"plainText","storeId":"4cccaa89-0fff-42c7-b791-6de84934ae96","loaderName":"test","loaderConfig":{"text":"testtesttesttesttesttesttest","textSplitter":"","metadata":"","omitMetadataKeys":""}}'


		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer " + serversInfo?.apikey
				},
				body: formData
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

	async processRAGDoc(doc_tag:string,docId:string): Promise<string> {
		//TODO create the RAG according to the the tags
		//select the rag id from the nb_rag
		//create the doc for each rag according to the doc type.
		//then store the docId

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		//get rag basc info
		const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		const serversInfo = await serversService.gerateRAGUrl(ragInfo.servers)

		const url = serversInfo?.url+'loader/process'+docId

		const  formData = new FormData();

		// formData.append("files",'file');
		// formData.append("docId", "c9121efa-1ce1-4708-af06-32a59abd720b");
		formData.append("loaderId", "plainText");
		formData.append("storeId", ragInfo.rag_id);
		formData.append("loaderName","Plain Text" );
		formData.append("loaderConfig",JSON.stringify({"text":"context","textSplitter":"","metadata":"","omitMetadataKeys":""}))
		//splitter option
		formData.append("splitterId","characterTextSplitter")
		formData.append("splitterConfig", JSON.stringify({"config":{"chunkSize":20000,"separator":""}}));
		formData.append("splitterName","Character Text Splitter")

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

		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer " + serversInfo?.apikey
				},
				body: formData
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

	async deleteRAGDoc(doc_tag:string,docId:string): Promise<string> {

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		//get rag basc info
		const ragInfo = await this.knex.select('servers','rag_id').from('nb_rags').where('doc_tag', doc_tag).first();

		//get the rag server address and appkey
		const serversInfo = await serversService.gerateRAGUrl(ragInfo.servers)

		const url = serversInfo?.url+ragInfo.rag_id+'/'+docId
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

	async getRAGId(tags: JSON): Promise<[string]>{
		return ['1']
	}
}
