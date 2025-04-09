import getDatabase from '../database/index.js';
import type { AbstractServiceOptions, Item, MutationOptions, PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
import { useLogger } from '../logger.js';

import { useEnv } from '../env.js';

const env = useEnv();

const logger = useLogger();

const APIKEY ='l18D9VFiUcfESJCoLSRcUjn/l/s4ZevPhA/fFzAjplA='

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
		// const emails = data['map']((payload) => payload['email']).filter((email) => email);
		// const passwords = data['map']((payload) => payload['password']).filter((password) => password);

		// try {
		// 	if (emails.length) {
		// 		this.validateEmail(emails);
		// 		await this.checkUniqueEmails(emails);
		// 	}

		// 	if (passwords.length) {
		// 		await this.checkPasswordPolicy(passwords);
		// 	}
		// } catch (err: any) {
		// 	(opts || (opts = {})).preMutationError = err;
		// }

		return await super.createMany(data, opts);
	}

	override async deleteOne(key: PrimaryKey, opts?: MutationOptions): Promise<PrimaryKey> {
		const RAGDocId = await this.knex.select('docId').from('nb_documents').where('id', key);

		this.deleteRAGDoc(key, RAGDocId);



		return await super.deleteOne(key,opts)
	}



	async updateRAGDoc(data:Partial<Item>[]): Promise<string> {

		const file = data['map']((payload) => payload['email']).filter((email) => email);

		// use FormData to upload files
		const  formData = new FormData();
		formData.append("files",'file');
		formData.append("docId", "c9121efa-1ce1-4708-af06-32a59abd720b");
		formData.append("splitter", JSON.stringify({"config":{"chunkSize":20000}}));
		// Add additional metadata to the document chunks
		formData.append("metadata", "{}");
		// Replace existing document with the new upserted chunks
		formData.append("replaceExisting", "true");
		// Override existing configuration
		// formData.append("loader", "");
		// formData.append("embedding", "");
		// formData.append("vectorStore", "");
		// formData.append("recordManager", "");
		// formData.append("docStore", "");

		async function query(formData:FormData) {
		const response = await fetch(
		"http://localhost:3000/api/v1/document-store/upsert/4cccaa89-0fff-42c7-b791-6de84934ae96",
		{
			method: "POST",
			headers: {
				"Authorization": "Bearer <your_api_key_here>"
			},
			body: formData
		}
		);

		const result = await response.json();
		return result;
		}

		query(formData).then((response) => {
			// useLogger.toString(response);
		});



		// const persons = await this.readMany([], { fields: ['name', 'phone', 'userid', 'companycode', 'school', 'role'] });
		// const persons = await this.knex.select('name', 'phone', 'users', 'companycode', 'school', 'role').from('nb_personinfos').where('companycode', companyCode);
		// const healthLevels = await this.knex.select('users', 'healthtext','finalscore').from('nb_userhealth').where('companycode', companyCode).orderBy('writedate','desc');
		// logger.info(persons);

		// logger.info(list);
		// logger.info(healthLevels);
		return 'this.groupByFirstLetter(persons,healthLevels)';
		// return persons;
	}

	async createRAGDoc(companyCode:string): Promise<string> {
		//TODO create the RAG according to the the tags
		//select the rag id from the nb_rag
		//create the doc for each rag according to the doc type.
		//then store the docId

		// const persons = await this.knex.select('name', 'phone', 'users', 'companycode', 'school', 'role').from('nb_personinfos').where('companycode', companyCode);
		// const healthLevels = await this.knex.select('users', 'healthtext','finalscore').from('nb_userhealth').where('companycode', companyCode).orderBy('writedate','desc');

		return 'this.groupByFirstLetter(persons,healthLevels)';
		// return persons;
	}

	// tobe delete
	async updateRAG(ragCode: string): Promise<string>{

		//TODO create the RAG according to the the tags
		//select the rag id from the nb_rag
		//create the doc for each rag according to the doc type.
		//then store the docId
		const url = new  URL('https://api.weixin.qq.com/sns/jscode2session?');

		try {
			const res = await fetch(url, {
				method: 'GET'
			})

			if(!res.ok){
				throw new Error(`[${res.status}] ${await res.text()}`)
			}else{
				return res.json()
			}
		} catch (error: any) {
			// logger.error(error);
			return 'undefined'

		}

	}


	async deleteRAGDoc(key:PrimaryKey,docId:any): Promise<PrimaryKey> {

		const url = new  URL("http://localhost:3000/api/v1/document-store/loader/4cccaa89-0fff-42c7-b791-6de84934ae96/"+docId,);

		try {
			const res = await fetch(url, {
				method: 'DELETE',
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer " + APIKEY
				},
			})

			logger.error(res.ok)

			if(!res.ok){
				throw new Error(`[${res.status}] ${await res.text()}`)
			}else{
				// return res.json()
				return key
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
