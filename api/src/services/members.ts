
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';


export class MembersService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_members', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}
}
