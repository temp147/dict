
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions,PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
// import { useLogger } from '../logger.js';
import { ServersService } from './servers.js'
import {AssetsService } from './assets.js'
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';

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

		//get rag basc info
		const docInfos = await this.knex('nb_ragdocs')
		.join('nb_documents','nb_ragdocs.documents','nb_documents.id')
		.join('nb_rags','nb_ragdocs.rags','nb_rags.id')
		.where('nb_ragdocs.documents', docKey)
		.select('nb_ragdocs.doc_id','nb_documents.doc_text','nb_documents.doctype','nb_documents.doc_tag','nb_ragdocs.rags','nb_ragdocs.id','nb_documents.doc_file','nb_rags.servers','nb_rags.rag_id','nb_documents.name')

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		if (docInfos[0].doctype === 'string') { //if the doc is plain text
			for (const key of docInfos) {
				const serversInfo = await serversService.gerateRAGUrl(key.servers); // get the basic server info

				const url = serversInfo?.url + 'save';

				const formData = JSON.stringify(this.buildFormData(key.doctype, key.rag_id,key.name,'',key.doc_text,'',key.doc_id));

				try {
					const res = await fetch(url, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer " + serversInfo?.apikey
						},
						body: formData
					});

					if (!res.ok) {
						throw new Error(`[${res.status}] ${await res.text()}`);
					} else {
						return key.doc_tag;
					}
				} catch (error: any) {
					// logger.error(error);
					return 'undefined';
				}
			}

		}else{  //if the doc is not  plain text , get the file from the assets service and convert it to base64
			const assetsService = new AssetsService({
				schema: this.schema,
				accountability: this.accountability,
			});

			const { stream, file } = await assetsService.getAsset(docInfos[0].doc_file); //get the file from the assets service

			const fileBase64 = await this.streamToBase64(stream, file.type || 'text/plain'); //convert the file to base64

			for (const key of docInfos) {
				const serversInfo = await serversService.gerateRAGUrl(key.servers);// get the basic server info

				const url = serversInfo?.url + 'save'; //build the save url 

				const formData = JSON.stringify(this.buildFormData(key.doctype, key.rag_id,key.name,fileBase64,'',file.filename_download,key.doc_id))

				try {
					const res = await fetch(url, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer " + serversInfo?.apikey
						},
						body: formData
					});

					if (!res.ok) {
						throw new Error(`[${res.status}] ${await res.text()}`);
					} else {
						return key.doc_tag;
					}
				} catch (error: any) {
					// logger.error(error);
					return 'undefined';
				}
			}

		}

		return 'key'

	}

	async createRAGDoc(docKey: PrimaryKey): Promise<string> {

		//select the rag id from the nb_rag
		//create the doc for each rag according to the doc type ,then store the docId.
		const docInfos = await this.knex('nb_rags')
		.join('nb_documents', (join) => {
		  join.on(
				this.knex.raw('nb_documents.doc_tag::jsonb @> jsonb_build_array(nb_rags.doc_tag)')
			);
		}).where('nb_documents.id', docKey).select('nb_documents.doctype','nb_documents.doc_file','nb_documents.doc_text','nb_documents.name','nb_rags.doc_tag','nb_rags.servers','nb_rags.rag_id','nb_rags.id')


		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})


		if (docInfos[0].doctype === 'string') {//if the doc is plain text

			for (const key of docInfos) {
				const serversInfo = await serversService.gerateRAGUrl(key.servers);// get the basic server info

				const url = serversInfo?.url + 'save';


				const formData = JSON.stringify(this.buildFormData(key.doctype, key.rag_id,key.name,'',key.doc_text,'')); // create the form data

				try {
					const res = await fetch(url, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer " + serversInfo?.apikey
						},
						body: formData
					});

					if (!res.ok) {
						throw new Error(`[${res.status}] ${await res.text()}`);
					} else {
						const ragRes = res.json() as Promise<RagRes>;

						const doc_id = (await ragRes).id;// get the doc id from the response

						const ragdocs_id = uuid();//create a new id for the ragdocs

						// insert the doc id and rag id into the nb_ragdocs table
						await this.knex('nb_ragdocs').insert({
							'id': ragdocs_id,
							'doc_id': doc_id,
							'rags': key.id,
							'documents': docKey
						});
					}
				} catch (error: any) {
					// logger.error(error);
					return 'undefined';
				}
			}
		}else{

			const assetsService = new AssetsService({
				schema: this.schema,
				accountability: this.accountability,
			});

			const { stream, file } = await assetsService.getAsset(docInfos[0].doc_file); //get the file from the assets service

			const fileBase64 = await this.streamToBase64(stream, file.type || 'text/plain');//convert the file to base64

			for (const key of docInfos) { //for each rag, create a new doc
				const serversInfo = await serversService.gerateRAGUrl(key.servers);

				const url = serversInfo?.url + 'save';
				// const formData = JSON.stringify(this.buildFormData(key.doctype, key.rag_id,key.name,'',key.doc_text,''));

				const formData = JSON.stringify(this.buildFormData(key.doctype, key.rag_id,key.name,fileBase64,'',file.filename_download)) // create the form data

				try {
					const res = await fetch(url, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer " + serversInfo?.apikey
						},
						body: formData
					});

					if (!res.ok) {
						throw new Error(`[${res.status}] ${await res.text()}`);
					} else {
						const ragRes = res.json() as Promise<RagRes>;

						const doc_id = (await ragRes).id;// get the doc id from the response

						const ragdocs_id = uuid();//create a new id for the ragdocs

						// insert the doc id and rag id into the nb_ragdocs table
						await this.knex('nb_ragdocs').insert({
							'id': ragdocs_id,
							'doc_id': doc_id,
							'rags': key.id,
							'documents': docKey
						});
					}
				} catch (error: any) {
					// logger.error(error);
					return 'undefined';
				}
			}
		}

		return 'test'
	}

	// process the rag doc according to the docKey

	async processRAGDoc(docKey:PrimaryKey): Promise<string> {

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		//get rag basc info

		const docInfos = await this.knex('nb_ragdocs')
		.join('nb_documents','nb_ragdocs.documents','nb_documents.id')
		.join('nb_rags','nb_ragdocs.rags','nb_rags.id')
		.where('nb_ragdocs.documents', docKey)
		.select('nb_ragdocs.doc_id','nb_documents.doc_text','nb_documents.doc_tag','nb_ragdocs.rags','nb_ragdocs.id','nb_documents.doc_file','nb_rags.servers','nb_rags.rag_id','nb_documents.name','nb_documents.doctype')

		if (docInfos[0].doctype === 'string') {

			// for (const key of docInfos) {
			docInfos.forEach(async (key) => {
				const serversInfo = await serversService.gerateRAGUrl(key.servers)

				const url = serversInfo?.url+'process/'+key.doc_id  //build the process url

				const formData = JSON.stringify(this.buildFormData(key.doctype, key.rag_id,key.name,'',key.doc_text,'',key.doc_id));// create the form data

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
		}else{

			const assetsService = new AssetsService({
				schema: this.schema,
				accountability: this.accountability,
			});

			const { stream, file } = await assetsService.getAsset(docInfos[0].doc_file);

			const fileBase64 = await this.streamToBase64(stream, file.type || 'text/plain');

			docInfos.forEach(async (key) => {
			// for (const key of docInfos) {
				const serversInfo = await serversService.gerateRAGUrl(key.servers)

				const url = serversInfo?.url+'process/'+key.doc_id

				const formData = JSON.stringify(this.buildFormData(key.doctype, key.rag_id,key.name,fileBase64,'',file.filename_download,key.doc_id))

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

		}

		return 'done';

	}

	async deleteRAGDoc(doc_tag:string,docId:string, servers:string, rag_id:string): Promise<string> {

		const  serversService = new ServersService({
			schema: this.schema,
			accountability: this.accountability,
		})

		//get the rag server address and appkey
		const serversInfo = await serversService.gerateRAGUrl(servers)

		const url = serversInfo?.url+rag_id+'/'+docId

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

	// Convert Readable stream to base64
	private async streamToBase64 (readable: Readable, contentType: string): Promise<string>  {
		const chunks: Uint8Array[] = [];

		for await (const chunk of readable) {
			chunks.push(Buffer.from(chunk));

		}

		const fileBlob =new Blob(chunks, { type: contentType }); //stream to blob

		const arrayBuffer = await fileBlob.arrayBuffer(); // Convert Blob to ArrayBuffer

		return Buffer.from(arrayBuffer).toString('base64'); // Convert ArrayBuffer to Base64 string

	};


	// Build the form data based on the docType.
	private buildFormData(docType: string, rag_id: string, name: string, fileBase64: string, doc_text: string ,filename_download: string, doc_id?: string ): object| undefined {


		let formData

		switch (docType) {
			case 'string':
				formData = {
				"loaderId": "plainText",
				"id": doc_id,
				"storeId": rag_id,
				"loaderName": name,
				"loaderConfig": { "text": doc_text, "textSplitter": "", "metadata": "", "omitMetadataKeys": "" }
				};

				break;
			case 'txt':
				formData = {
					"loaderId": "textFile",
					"id": doc_id,
					"storeId": rag_id,
					"loaderName": name,
					"loaderConfig": {
						"txtFile": 'data:text/plain;base64,'+ fileBase64 + ',filename:'+ filename_download, // Use Base64-encoded content
						"textSplitter": "",
						"metadata": "",
						"omitMetadataKeys": ""
					},
					"splitterId": "characterTextSplitter",
					"splitterConfig": { "chunkSize": 1000, "chunkOverlap": 200, "separator": "" },
					"splitterName": "Character Text Splitter"
				};

				break;
			case 'pdf':
				formData = {
					"loaderId": "pdfFile",
					"id": doc_id,
					"storeId": rag_id,
					"loaderName": name,
					"loaderConfig": {
						"pdfFile": 'data:application/pdf;base64,'+ fileBase64 + ',filename:'+ filename_download, // Use Base64-encoded content
						"textSplitter": "",
						"usage": "perPage",
						"legacyBuild": false,
						"metadata": "",
						"omitMetadataKeys": ""
					},
					"splitterId": "characterTextSplitter",
					"splitterConfig": { "chunkSize": 1000, "chunkOverlap": 200, "separator": "" },
					"splitterName": "Character Text Splitter"
				};

				break;
			case 'doc':
				formData = {
					"loaderId": "docxFile",
					"id": doc_id,
					"storeId": rag_id,
					"loaderName": name,
					"loaderConfig": {
						"docxFile": 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,'+ fileBase64 + ',filename:'+ filename_download, // Use Base64-encoded content
						"textSplitter": "",
						"metadata": "",
						"omitMetadataKeys": ""
					},
					"splitterId": "characterTextSplitter",
					"splitterConfig": { "chunkSize": 1000, "chunkOverlap": 200, "separator": "" },
					"splitterName": "Character Text Splitter"
				};

				break;
		}

		return formData ;
	}
}
