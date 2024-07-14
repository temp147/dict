
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';


export class TagsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_tags', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}
}
