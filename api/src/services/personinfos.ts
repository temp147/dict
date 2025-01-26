
import getDatabase from '../database/index.js';
import type { AbstractServiceOptions } from '../types/index.js';
import { ItemsService } from './items.js';
import pinyin from 'pinyin'
import { WechatService } from './wechatapp/index.js';
import { useLogger } from '../logger.js';
import { v4 as uuidv4 } from 'uuid';

const logger = useLogger();


interface Person {
	name: string;
	phone: string;
	users: string;
	companycode: string;
	school: string;
	role: string;
  }

interface InfoData{
	age: string;
	gender: string;
	height: string;
	weight: string;
	constellation: string;
	birthdate: string;
	color: string;
	hobby: string;
	personality: string;
	hobbies: string;
	habits: string;
	selfintroduction: string;
	healthdemands: string;
	recommendhabits: string;
	updatedfield: string;
}

interface UpdateProfileData{
	name: string;
	height: string;
	weight: string;
	selfintroduction: string;
	birthdate: string;
	hobbies: string;
	habits: string;
}

interface UpdateActivityData{
	physical_activity: string;
	physical_activity_title: string;
	mental_activity: string;
	mental_activity_title: string;
	nutrition_activity: string;
	nutrition_activity_title: string;
	physical_activity_bonus: BigInteger;
	mental_activity_bonus: BigInteger;
	nutrition_activity_bonus: BigInteger;
	// physical_activity2: string;
	// physical_activity_title2: string;
	// mental_activity2: string;
	// mental_activity_title2: string;
	// nutrition_activity2: string;
	// nutrition_activity_title2: string;
	// physical_activity_bonus2: BigInteger;
	// mental_activity_bonus2: BigInteger;
	// nutrition_activity_bonus2: BigInteger;
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
			const healthtext = healthInfo ? healthInfo.healthtext : "NA"; // 默认健康等级为M

			// 如果分组中没有该字母组，创建一个
			if (!groupedMap[letter]) {
			groupedMap[letter] = {
				letter,
				data: []
			};
			}

			logger.info(person)

			logger.info(healthInfo)

			if(healthtext != "NA"){
				// 添加到对应字母组的data数组中
				groupedMap[letter].data.push({
					name: person.name,
					phone: person.phone,
					healthtext,  // 使用健康数据中的 healthLevel
					school: person.school
					});
				}

			});

			// 对 groupedMap 的键进行排序
			const sortedKeys = Object.keys(groupedMap).sort();

			// 创建一个新的对象来存储排序后的结果
			const sortedGroupedMap: { [key: string]: GroupedData } = {};

			// 按照排序后的键顺序填充新的对象
			sortedKeys.forEach(key => {
				sortedGroupedMap[key] = groupedMap[key]!;
			});

			// 将结果转换为数组返回
			return Object.values(sortedGroupedMap);

		// // 将结果转换为数组返回
		// return Object.values(groupedMap);
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

	async getWxSignature(url: string, timestamp: any): Promise<string> {
		const wechatService = new WechatService({
			schema: this.schema,
			knex: this.knex
		});

		const signature = await wechatService.getSignature(url,timestamp);

		return signature;
	}

	async completeInfo(chathistory: any[], users: string): Promise<any> {
			const flowiseKey = '42bb1895-7be7-4f29-9802-0b4a8457b129'

			let chatHistoryString = '';

			// chathistory.forEach((chat: any) => {

			chathistory.forEach((chat: any) => {
				chatHistoryString = chatHistoryString + chat.content + ';';
			});

			const result = await this.getJson(chatHistoryString,flowiseKey);

			// logger.info(result);

			const infoData: InfoData = {
				gender: result.gender === 'male' ? '男' : '女',
				height: result.height ? parseInt(result.height, 10).toString() : '175',
				weight: result.weight ? parseInt(result.weight, 10).toString() : '65',
				constellation: result.constellation ? result.constellation : '',
				age: result.age,
				birthdate: result.birthdate,
				color: result.color,
				hobby: result.hobby,
				personality: result.personality,
				hobbies: result.hobbies ? result.hobbies : '看书;美食',
				habits: result.habits ? result.habits : '睡眠情况-每日睡眠时间不少于7小时;每日饮食-每日三餐正常摄入',
				selfintroduction: result.selfintroduction? result.selfintroduction : '你是一个神秘且注重健康的人，',
				healthdemands: result.healthdemands,
				recommendhabits: result.recommendhabits,
				updatedfield: result.updatedfield? result.updatedfield : '已更新性别，身高，体重，生日等信息'
			};

			logger.info(infoData);

			const hobbiesObj = (infoData.hobbies ?? '').split(';')

			const habitsObj = (infoData.habits ?? '').split(';').map(habit => {
				const title = habit.split('-')[0];
				const detail = habit.split('-')[1];
				return { "title": title, "detail": detail };
			});

			const recommendhabitsObj = (infoData.recommendhabits ?? '').split(';').map(habit => {
				const title = habit.split('-')[0];
				const detail = habit.split('-')[1];
				return { "title": title, "detail": detail };
			});

			const habitsData = [...habitsObj, ...recommendhabitsObj];

			const dataid = uuidv4();

			const updateData = {
				"gender": infoData.gender,
				"height": infoData.height,
				"weight": infoData.weight,
				"constellation": infoData.constellation,
				"age": infoData.age,
				"birthdate": infoData.birthdate,
				"color": infoData.color,
				"hobby": infoData.hobby,
				"personality": infoData.personality,
				"hobbies": JSON.stringify(hobbiesObj),
				"habits": JSON.stringify(habitsData),
				"selfintroduction": infoData.selfintroduction,
				"healthdemands": infoData.healthdemands
			}

			const updateResult = await this.knex('nb_personinfos').update(updateData).where('users', users);

			logger.info(updateResult);

			const returnData = {
				"selfintroduction": infoData.selfintroduction,
				"updatedfield": infoData.updatedfield
			}

			return returnData;
		}

		async updateProfile(profile: string,users: string, date: string): Promise<any> {
			const flowiseKey = 'cb442a8d-b3c9-47e5-9304-83f87e89dade'
			const result = await this.getJson(profile,flowiseKey);

			const profileData: UpdateProfileData = {
				name: result.name? result.name : '探险家',
				height: result.height ? parseInt(result.height, 10).toString() : '175',
				weight: result.weight ? parseInt(result.weight, 10).toString() : '65',
				hobbies: result.hobbies ? result.hobbies : '',
				birthdate: result.birthdate,
				habits: result.habits ? result.habits : '',
				selfintroduction: result.selfintroduction ? result.selfintroduction : '',
			};

			const hobbiesObj = profileData.hobbies.split(';')

			const habitsObj = profileData.habits.split(';').map(habit => {
				const title = habit.split('-')[0];
				const detail = habit.split('-')[1];
				return { "title":title, "detail":detail };
			});

			logger.info(habitsObj);


			const dataid = uuidv4();

			const updateData = {
				"name": profileData.name,
				"height": profileData.height,
				"weight": profileData.weight,
				"selfintroduction": profileData.selfintroduction,
				"birthdate": profileData.birthdate,
				"hobbies": JSON.stringify(hobbiesObj),
				"habits": JSON.stringify(habitsObj),
				"writedate": date
			}

			logger.info(updateData);

			const updateResult = await this.knex('nb_personinfos').update(updateData).where('users', users);



			return dataid;
		}

		async updateUserActivity(content: string,users: string, date: string): Promise<any> {
			const flowiseKey = '0b3e412c-f9ef-409c-bcb6-2383623d9bbf'
			const result = await this.getJson(content,flowiseKey);

			const ActivityData: UpdateActivityData = {
				physical_activity: result.physical_activity? result.physical_activity : '',
				mental_activity: result.mental_activity ? result.mental_activity: '',
				nutrition_activity: result.nutrition_activity ? result.nutrition_activity : '',
				physical_activity_title: result.physical_activity_title ? result.physical_activity_title : '',
				mental_activity_title: result.mental_activity_title ? result.mental_activity_title : '',
				nutrition_activity_title: result.nutrition_activity_title ? result.nutrition_activity_title : '',
				physical_activity_bonus: result.physical_activity_bonus ? result.physical_activity_bonus : 0,
				mental_activity_bonus: result.mental_activity_bonus ? result.mental_activity_bonus : 0,
				nutrition_activity_bonus: result.nutrition_activity_bonus ? result.nutrition_activity_bonus : 0,
				// physical_activity2: result.physical_activity2? result.physical_activity2 : '',
				// mental_activity2: result.mental_activity2 ? result.mental_activity2: '',
				// nutrition_activity2: result.nutrition_activity2 ? result.nutrition_activity2 : '',
				// physical_activity_title2: result.physical_activity_title2 ? result.physical_activity_title2 : '',
				// mental_activity_title2: result.mental_activity_title2 ? result.mental_activity_title2 : '',
				// nutrition_activity_title2: result.nutrition_activity_title2 ? result.nutrition_activity_title2 : '',
				// physical_activity_bonus2: result.physical_activity_bonus2 ? result.physical_activity_bonus2 : 0,
				// mental_activity_bonus2: result.mental_activity_bonus2 ? result.mental_activity_bonus2 : 0,
				// nutrition_activity_bonus2: result.nutrition_activity_bonus2 ? result.nutrition_activity_bonus2 : 0,
			};

			// const hobbiesObj = profileData.hobbies.split(';')

			// const habitsObj = profileData.habits.split(';').map(habit => {
			// 	const title = habit.split('-')[0];
			// 	const detail = habit.split('-')[1];
			// 	return { "title":title, "detail":detail };
			// });

			// logger.info(habitsObj);
			const physicalUpdateData = {
				"id":uuidv4(),
				"title":"挑战"+ActivityData.physical_activity_title,
				"type":"health",
				"character":"KUIJIEJIE",
				"characterimg":"https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/character/kuijie/kuijiejie-avatar-removebg-preview.png?sign=e4cdd17e82fb1ae433e283862c965ea6&t=1733733997",
				"desc":"健康伴我同行",
				"contenttext":JSON.stringify([ActivityData.physical_activity]),
				"isOnce":true,
				"isEveryDay":true,
				"users":users,
				"writedate": date,
				"bonus": ActivityData.physical_activity_bonus
			}

			// const physicalUpdateData2 = {
			// 	"id":uuidv4(),
			// 	"title":"挑战"+ActivityData.physical_activity_title2,
			// 	"type":"health",
			// 	"character":"KUIJIEJIE",
			// 	"characterimg":"https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/character/kuijie/kuijiejie-avatar-removebg-preview.png?sign=e4cdd17e82fb1ae433e283862c965ea6&t=1733733997",
			// 	"desc":"健康伴我同行",
			// 	"contenttext":JSON.stringify([ActivityData.physical_activity2]),
			// 	"isOnce":true,
			// 	"isEveryDay":true,
			// 	"users":users,
			// 	"writedate": date,
			// 	"bonus": ActivityData.physical_activity_bonus2
			// }

			const mentalUpdateData = {
				"id":uuidv4(),
				"title":"尝试"+ActivityData.mental_activity_title,
				"type":"mental",
				"character":"KUIJIEJIE",
				"characterimg":"https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/character/kuijie/kuijiejie-avatar-removebg-preview.png?sign=e4cdd17e82fb1ae433e283862c965ea6&t=1733733997",
				"desc":"健康伴我同行",
				"contenttext":JSON.stringify([ActivityData.mental_activity]),
				"isOnce":true,
				"isEveryDay":true,
				"users":users,
				"writedate": date,
				"bonus": ActivityData.mental_activity_bonus
			}

			// const mentalUpdateData2 = {
			// 	"id":uuidv4(),
			// 	"title":"尝试"+ActivityData.mental_activity_title2,
			// 	"type":"mental",
			// 	"character":"KUIJIEJIE",
			// 	"characterimg":"https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/character/kuijie/kuijiejie-avatar-removebg-preview.png?sign=e4cdd17e82fb1ae433e283862c965ea6&t=1733733997",
			// 	"desc":"健康伴我同行",
			// 	"contenttext":JSON.stringify([ActivityData.mental_activity2]),
			// 	"isOnce":true,
			// 	"isEveryDay":true,
			// 	"users":users,
			// 	"writedate": date,
			// 	"bonus": ActivityData.mental_activity_bonus2
			// }

			const nutritionUpdateData = {
				"id":uuidv4(),
				"title":"试试看"+ActivityData.nutrition_activity_title,
				"type":"dish",
				"character":"XIAODANGJIA",
				"characterimg":"https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/character/xiaodangjia/xiaodangjia-avatar-removebg-preview.png?sign=cd8b5c9fe93371f6a6c6f47c91380203&t=1733737145",
				"desc":"好身材伴随我",
				"contenttext":JSON.stringify([ActivityData.nutrition_activity]),
				"isOnce":true,
				"isEveryDay":true,
				"users":users,
				"writedate": date,
				"bonus": ActivityData.nutrition_activity_bonus
			}

			// const nutritionUpdateData2 = {
			// 	"id":uuidv4(),
			// 	"title":"试试看"+ActivityData.nutrition_activity_title2,
			// 	"type":"dish",
			// 	"character":"XIAODANGJIA",
			// 	"characterimg":"https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/character/xiaodangjia/xiaodangjia-avatar-removebg-preview.png?sign=cd8b5c9fe93371f6a6c6f47c91380203&t=1733737145",
			// 	"desc":"好身材伴随我",
			// 	"contenttext":JSON.stringify([ActivityData.nutrition_activity2]),
			// 	"isOnce":true,
			// 	"isEveryDay":true,
			// 	"users":users,
			// 	"writedate": date,
			// 	"bonus": ActivityData.nutrition_activity_bonus2
			// }

			// const habitUpdateData = {
			// 	"id":uuidv4(),
			// 	"title":"养成"+ActivityData.habit_activity,
			// 	"type":"health",
			// 	"character":"KUIJIEJIE",
			// 	"characterimg":"https://636c-cloud1-2gi1qn5dfd4d7f48-1322907055.tcb.qcloud.la/content/character/kuijie/kuijiejie-avatar-removebg-preview.png?sign=e4cdd17e82fb1ae433e283862c965ea6&t=1733733997",
			// 	"desc":"健康伴我同行",
			// 	"contenttext":JSON.stringify([ActivityData.habit_activity]),
			// 	"isOnce":true,
			// 	"isEveryDay":true,
			// 	"users":users,
			// 	"writedate": date
			// }

			const insertData = [physicalUpdateData,mentalUpdateData,nutritionUpdateData];


			const dataid = uuidv4();

			const deleteResult = await this.knex('nb_useractivitypool').delete().where('users', users);

			const insertResult = await this.knex('nb_useractivitypool').insert(insertData);



			// const updateResult = await this.knex('nb_personinfos').update(updateData).where('users', users);



			return dataid;
		}

	async getJson(chathistory: string,flowiseKey: string): Promise<any> {
		const url = 'https://flowise.metacause.cn/api/v1/prediction/'+flowiseKey;

		const body={
			"question": chathistory,
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
				logger.error(resText);
				return 'error';
			}
		}catch(error: any){
			logger.error(error);
			return undefined;

		}
	}
}
