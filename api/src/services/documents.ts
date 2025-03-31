import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import { useLogger } from '../logger.js';


export class DocumentsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_documents', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async updateRAG(companyCode:string): Promise<string> {
		// const persons = await this.readMany([], { fields: ['name', 'phone', 'userid', 'companycode', 'school', 'role'] });
		const persons = await this.knex.select('name', 'phone', 'users', 'companycode', 'school', 'role').from('nb_personinfos').where('companycode', companyCode);
		const healthLevels = await this.knex.select('users', 'healthtext','finalscore').from('nb_userhealth').where('companycode', companyCode).orderBy('writedate','desc');
		// logger.info(persons);

		// logger.info(list);
		// logger.info(healthLevels);
		return 'this.groupByFirstLetter(persons,healthLevels)';
		// return persons;
	}

	async createRAG(companyCode:string): Promise<string> {
		// const persons = await this.readMany([], { fields: ['name', 'phone', 'userid', 'companycode', 'school', 'role'] });
		const persons = await this.knex.select('name', 'phone', 'users', 'companycode', 'school', 'role').from('nb_personinfos').where('companycode', companyCode);
		const healthLevels = await this.knex.select('users', 'healthtext','finalscore').from('nb_userhealth').where('companycode', companyCode).orderBy('writedate','desc');
		// logger.info(persons);

		// logger.info(list);
		// logger.info(healthLevels);
		return 'this.groupByFirstLetter(persons,healthLevels)';
		// return persons;
	}

	async updateFlowiseRAG(ragCode: string): Promise<string>{
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
}
