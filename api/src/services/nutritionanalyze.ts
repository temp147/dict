
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
// import pinyin from 'pinyin'
import { useLogger } from '../logger.js';
import { v4 as uuidv4 } from 'uuid';

const logger = useLogger();

interface Ingredient {
	name: string;
	quantity: string;
  }

  interface Step {
	step: string;
	detail: string;
  }

  interface FoodReport {
	title: string;
	summary: string;
	ingredients: Ingredient[];
	heat: string;
	protein: string;
	fat: string;
	carbohydrate: string;
	steps: Step[];
	suitable_population: string[];
	nutrtion: string;
	type: string;
	img: string;
  }
// interface Person {
// 	name: string;
// 	phone: string;
// 	users: string;
// 	companycode: string;
// 	school: string;
// 	role: string;
//   }

// // interface Candidate {
// //     name: string;
// //     phone: string;
// //     userid: string;
// //     companycode: string;
// //     school: string;
// //     role: string;
// // }

// interface HealthData {
// 	users: string;
// 	healthtext: string;
// 	healthscore: string;
//   }

// interface GroupedData {
//     letter: string;
//     data: Array<{
//         name: string;
//         phone: string;
//         healthtext: string;
//         school: string;
//     }>;
// }

export class NutritionanalyzeService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('nb_nutritionanalyze', options);

		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async completeReport(userid: string,username: string,phone: string,foodname: string,operatedate: string): Promise<any> {
		const result = await this.getJson(foodname);

		const foodReport: FoodReport = {
			title: result.title,
			summary: result.summary,
			ingredients: this.parseIngredients(result.ingredients),
			heat: result.heat,
			protein: result.protein,
			fat: result.fat,
			carbohydrate: result.carbohydrate,
			steps: this.parseSteps(result.steps),
			suitable_population: this.parseSuitablePopulation(result.suitable_population),
			nutrtion: result.nutrtion,
			type: result.type,
			img: result.img
		  };

		logger.info(foodReport);

		let operateDate =new Date();
		// logger.info(result);

		if(operatedate !== ''){
			operateDate = new Date(operatedate);
		}

		// const operateDate = new Date();
		const timestamp = operateDate.getTime();
		const dataid = uuidv4();

		const insertData = {
			"id":dataid,
			"name": foodname,
			"phone": phone,
			"users": userid,
			"body":foodReport,
			"operatedate":operateDate
		}

		const insertResult = await this.knex('nb_nutritionanalyze').insert(insertData);

		logger.info(insertResult);

		return dataid;
	}

	parseIngredients(ingredientsStr: string): Ingredient[] {
		return ingredientsStr.split(';').map(item => {
		  const [name = '', quantity = ''] = item.split(':');
		  return { name, quantity };
		});
	  }

	parseSuitablePopulation(suitableStr: string): string[] {
		return suitableStr.split(';');
	  }

	parseSteps(stepsStr: string): Step[] {
		return stepsStr.split(';').map(item => {
		  const [step = '', detail = ''] = item.split(':');
		  return { step, detail };
		});
	  }

	// async completeTest(testlist: any,userid: string,username: string,phone: string,companycode: string): Promise<any> {
	// 	const resultarray: Array<{ score: string; totalscore: number; type: string }> = [];
	// 	let resultscore = 0;
	// 	let testresult=''

	// 	for (const item of testlist) {
	// 		const testname = item;

	// 		const result = await this.knex
	// 			.select('score', 'totalscore', 'type','level')
	// 			.from('nb_mentaltest')
	// 			.where('type', '=', testname)
	// 			.andWhere('users', '=', userid)
	// 			.orderBy('timestamp', 'desc')
	// 			.limit(1);

	// 		if (result.length > 0) {
	// 			resultarray.push(result[0]);
	// 			resultscore += Math.round((parseInt(result[0].score) * 100) / result[0].totalscore);
	// 			testresult += result[0].level + ','
	// 		}

	// 	}

	// 	logger.info(resultscore);

	// 	let finalscore = Math.round(resultscore / resultarray.length);

	// 	let healthtext = '';

	// 	if(finalscore >= 80){
	// 		finalscore = 20;
	// 		healthtext = '有待观察'
	// 	}else if(finalscore >= 60){
	// 		finalscore = 40;
	// 		healthtext = '中等偏下'
	// 	}else if(finalscore >= 40){
	// 		finalscore = 60;
	// 		healthtext = '中等偏上'
	// 	}else if(finalscore >= 20){
	// 		finalscore = 80;
	// 		healthtext = '内心坚强'
	// 	}else{
	// 		finalscore = 100;
	// 		healthtext = '内心强大'
	// 	}



	// 	// const testresult = '较小的压力,轻微社恐,中度焦虑,优秀心理弹性,中等情绪调节能力'

	// 	const abilityresult = await this.getJson(foodname);
	// 	// logger.info(abilityresult);

	// 	const recommendList = abilityresult.recommend.replace(" ","").split(';');
	// 	// logger.info(JSON.parse(recommendList));
	// 	const operateDate = new Date();
	// 	const timestamp = operateDate.getTime();

	// 	const insertData_health = {
	// 		// "id":uuidv4(),
	// 		"phone": phone,
	// 		"users": userid,
	// 		"writedate":operateDate,
	// 		"finalscore": finalscore,
	// 		"healthtext": healthtext,
	// 		"companycode":companycode,
	// 		"timestamp":timestamp
	// 	}

	// 	const insertData = {
	// 		"id":uuidv4(),
	// 		"name": username,
	// 		"phone": phone,
	// 		"users": userid,
	// 		"finalscore": finalscore,
	// 		"healthtext": healthtext,
	// 		"summary": abilityresult.comment,
	// 		"recommend":{"recommend":recommendList},
	// 		"detailscore":{"detailscore":resultarray},
	// 		"ability":abilityresult,
	// 		"operatedate":operateDate
	// 	}

	// 	const insertResult_health = await this.knex('nb_userhealth').insert(insertData_health);

	// 	const insertResult = await this.knex('nb_candidateresult').insert(insertData);

	// 	// logger.info(insertResult);


	// 	return 'ok';
	// }

	async getJson(foodname: string): Promise<any> {
		const url = 'https://flowise.metacause.cn/api/v1/prediction/3bc41c73-5bde-4db3-a31a-f86682bbfd50'

		const body={
			"question": foodname,
			"history":[]
		}

		const headers = {
			'Content-Type': 'application/json',
		}

		try{
			const res = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(body),
				headers,
			});

			const resClone = res.clone();
			const resText = await resClone.text();
			// logger.info(resText);

			if(res.ok){
				const result = await res.json() as any;
				// logger.info(result.json);
				// const parsedResult = JSON.parse(result.json);
				return result.json;
				// return result;
			}else{
				return 'error';
			}
		}catch(error: any){
			logger.error(error);
			return undefined;

		}
	}

	// getFirstLetter(name: string): string {
	// 	// 判断是否是中文
	// 	const isChinese = /^[\u4e00-\u9fa5]+$/.test(name.charAt(0));
	// 	const isEnglish = /^[A-Za-z]+$/.test(name.charAt(0));

	// 	if (isChinese) {
	// 		// 如果是中文，用pinyin库获取拼音首字母
	// 		const pinyinArr = pinyin(name, { style: pinyin.STYLE_FIRST_LETTER });
	// 		return pinyinArr && pinyinArr[0] && pinyinArr[0][0] ? pinyinArr[0][0].toUpperCase() : '#';
	// 	} else if (isEnglish) {
	// 		// 如果是英文，直接获取首字母
	// 		return name.charAt(0).toUpperCase();
	// 	} else {
	// 		// 如果既不是中文也不是英文，归类到 '#'
	// 		return '#';
	// 	}
	//   }

	// groupByFirstLetter(dataset: Person[],healthData: HealthData[]): GroupedData[] {
	// 	const groupedMap: { [key: string]: GroupedData } = {};

  	// 	dataset.forEach(person => {
	// 		const letter = this.getFirstLetter(person.name);

	// 		// 查找对应的健康数据
	// 		const healthInfo = healthData.find(h => h.users === person.users);
	// 		const healthtext = healthInfo ? healthInfo.healthtext : "M"; // 默认健康等级为M

	// 		// 如果分组中没有该字母组，创建一个
	// 		if (!groupedMap[letter]) {
	// 		groupedMap[letter] = {
	// 			letter,
	// 			data: []
	// 		};
	// 		}

	// 		logger.info(person)

	// 		logger.info(healthInfo)

	// 		// 添加到对应字母组的data数组中
	// 		groupedMap[letter].data.push({
	// 			name: person.name,
	// 			phone: person.phone,
	// 			healthtext,  // 使用健康数据中的 healthLevel
	// 			school: person.school
	// 			});
	// 		});

	// 	// 将结果转换为数组返回
	// 	return Object.values(groupedMap);
	//   }

	// async generateList(companyCode:string): Promise<GroupedData[]> {
	// 	// const persons = await this.readMany([], { fields: ['name', 'phone', 'userid', 'companycode', 'school', 'role'] });
	// 	const persons = await this.knex.select('name', 'phone', 'users', 'companycode', 'school', 'role').from('nb_personinfos').where('companycode', companyCode);
	// 	const healthLevels = await this.knex.select('users', 'healthtext','finalscore').from('nb_userhealth').where('companycode', companyCode);
	// 	// logger.info(persons);

	// 	// logger.info(list);
	// 	// logger.info(healthLevels);
	// 	return this.groupByFirstLetter(persons,healthLevels);
	// 	// return persons;
	// }
}
