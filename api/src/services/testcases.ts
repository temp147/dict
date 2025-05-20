
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';


export class TestCasesService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_testcases', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async readHardQuestion(): Promise<object[]> {
		// const primaryKeyField = this.schema.collections[this.collection]!.primary;
		// const readQuery = cloneDeep(query);
		// readQuery.fields = [primaryKeyField];

		const results =  await this.knex('nb_testcases')
		.join('nb_agents as input_agents','nb_testcases.input_flowid','input_agents.id')
		.join('nb_agents as veriy_agents','nb_testcases.verify_flowid','veriy_agents.id')
		.where('nb_testcases.catalog', '=','2')
		.select('nb_testcases.name','nb_testcases.input_question','input_agents.flowid as input_flowid','nb_testcases.verify_text','veriy_agents.flowid as verify_flowid');

		return results

	}


	async readSensitiveQuestion(): Promise<object[]> {

		const results =  await this.knex('nb_testcases')
		.join('nb_agents as input_agents','nb_testcases.input_flowid','input_agents.id')
		.join('nb_agents as veriy_agents','nb_testcases.verify_flowid','veriy_agents.id')
		.where('nb_testcases.catalog', '=','1')
		.select('nb_testcases.name','nb_testcases.input_question','input_agents.flowid as input_flowid','nb_testcases.verify_text','veriy_agents.flowid as verify_flowid');

		return results

	}

	async readPersonalQuestion(): Promise<object[]> {

		const results =  await this.knex('nb_testcases')
		.join('nb_agents as input_agents','nb_testcases.input_flowid','input_agents.id')
		.join('nb_agents as veriy_agents','nb_testcases.verify_flowid','veriy_agents.id')
		.where('nb_testcases.catalog', '=','3')
		.select('nb_testcases.name','nb_testcases.input_question','input_agents.flowid as input_flowid','nb_testcases.verify_text','veriy_agents.flowid as verify_flowid');

		return results
	}




}
