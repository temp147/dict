
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import pinyin from 'pinyin'
import { useLogger } from '../logger.js';

const logger = useLogger();


interface Person {
	name: string;
	phone: string;
	users: string;
	companycode: string;
	school: string;
	role: string;
  }

// interface Candidate {
//     name: string;
//     phone: string;
//     userid: string;
//     companycode: string;
//     school: string;
//     role: string;
// }

interface HealthData {
	users: string;
	healthtext: string;
	healthscore: string;
  }

interface GroupedData {
    letter: string;
    data: Array<{
        name: string;
        phone: string;
        healthtext: string;
        school: string;
    }>;
}

export class PersoninfosService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_personinfos', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	getFirstLetter(name: string): string {
		// 判断是否是中文
		const isChinese = /^[\u4e00-\u9fa5]+$/.test(name.charAt(0));
		const isEnglish = /^[A-Za-z]+$/.test(name.charAt(0));

		if (isChinese) {
			// 如果是中文，用pinyin库获取拼音首字母
			const pinyinArr = pinyin(name, { style: pinyin.STYLE_FIRST_LETTER });
			return pinyinArr && pinyinArr[0] && pinyinArr[0][0] ? pinyinArr[0][0].toUpperCase() : '#';
		} else if (isEnglish) {
			// 如果是英文，直接获取首字母
			return name.charAt(0).toUpperCase();
		} else {
			// 如果既不是中文也不是英文，归类到 '#'
			return '#';
		}
	  }

	groupByFirstLetter(dataset: Person[],healthData: HealthData[]): GroupedData[] {
		const groupedMap: { [key: string]: GroupedData } = {};

  		dataset.forEach(person => {
			const letter = this.getFirstLetter(person.name);

			// 查找对应的健康数据
			const healthInfo = healthData.find(h => h.users === person.users);
			const healthtext = healthInfo ? healthInfo.healthtext : "M"; // 默认健康等级为M

			// 如果分组中没有该字母组，创建一个
			if (!groupedMap[letter]) {
			groupedMap[letter] = {
				letter,
				data: []
			};
			}

			logger.info(person)

			logger.info(healthInfo)

			// 添加到对应字母组的data数组中
			groupedMap[letter].data.push({
				name: person.name,
				phone: person.phone,
				healthtext,  // 使用健康数据中的 healthLevel
				school: person.school
				});
			});

		// 将结果转换为数组返回
		return Object.values(groupedMap);
	  }

	async generateList(companyCode:string): Promise<GroupedData[]> {
		// const persons = await this.readMany([], { fields: ['name', 'phone', 'userid', 'companycode', 'school', 'role'] });
		const persons = await this.knex.select('name', 'phone', 'users', 'companycode', 'school', 'role').from('nb_personinfos').where('companycode', companyCode);
		const healthLevels = await this.knex.select('users', 'healthtext','finalscore').from('nb_userhealth').where('companycode', companyCode).orderBy('writedate','desc');
		// logger.info(persons);

		// logger.info(list);
		// logger.info(healthLevels);
		return this.groupByFirstLetter(persons,healthLevels);
		// return persons;
	}
}
