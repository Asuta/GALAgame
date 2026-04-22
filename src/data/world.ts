import type { WorldData } from './types';

export const worldData: WorldData = {
  regions: [
    { id: 'school', name: '学校', sceneIds: ['classroom', 'hallway', 'playground', 'rooftop'] },
    { id: 'hospital', name: '医院', sceneIds: ['lobby', 'ward', 'hospital-hallway', 'vending-zone'] },
    { id: 'mall', name: '商场', sceneIds: ['atrium', 'cafe', 'cinema-gate', 'accessory-shop'] },
    { id: 'home', name: '主角家', sceneIds: ['living-room', 'bedroom', 'balcony', 'entryway'] }
  ],
  scenes: [
    { id: 'classroom', regionId: 'school', name: '教室', description: '放学后的教室被夕阳染成暖金色。', eventIds: ['after-school-classroom'] },
    { id: 'hallway', regionId: 'school', name: '走廊', description: '窗边的风吹动着张贴的社团海报。', eventIds: [] },
    { id: 'playground', regionId: 'school', name: '操场', description: '远处还能听见篮球落地的回响。', eventIds: [] },
    { id: 'rooftop', regionId: 'school', name: '天台', description: '城市的风从高处掠过。', eventIds: [] },
    { id: 'lobby', regionId: 'hospital', name: '大厅', description: '消毒水味混着轻微脚步声。', eventIds: [] },
    { id: 'ward', regionId: 'hospital', name: '病房', description: '白色帘子随着空调轻轻晃动。', eventIds: ['quiet-visit'] },
    { id: 'hospital-hallway', regionId: 'hospital', name: '走廊', description: '夜班灯光把地面照得发白。', eventIds: [] },
    { id: 'vending-zone', regionId: 'hospital', name: '自动贩卖机区', description: '饮料机发出轻微的电流声。', eventIds: [] },
    { id: 'atrium', regionId: 'mall', name: '一层中庭', description: '商场广播正播着轻快的歌。', eventIds: [] },
    { id: 'cafe', regionId: 'mall', name: '咖啡店', description: '咖啡香把气氛变得柔软。', eventIds: ['rainy-cafe-meet'] },
    { id: 'cinema-gate', regionId: 'mall', name: '电影院门口', description: '海报灯箱映着来往的人群。', eventIds: [] },
    { id: 'accessory-shop', regionId: 'mall', name: '饰品店', description: '玻璃展柜里闪着细小反光。', eventIds: [] },
    { id: 'living-room', regionId: 'home', name: '客厅', description: '傍晚的客厅有一点安静过头。', eventIds: [] },
    { id: 'bedroom', regionId: 'home', name: '卧室', description: '桌面上摊着没看完的习题册。', eventIds: [] },
    { id: 'balcony', regionId: 'home', name: '阳台', description: '夜风吹起窗帘的边角。', eventIds: ['late-night-call'] },
    { id: 'entryway', regionId: 'home', name: '门口', description: '鞋柜上还放着今天出门时忘记带走的钥匙。', eventIds: [] }
  ],
  events: [
    { id: 'after-school-classroom', title: '放学后的空教室', sceneId: 'classroom', cast: ['林澄'], intro: '她一个人坐在窗边，像是在等什么。', repeatable: false },
    { id: 'quiet-visit', title: '安静探望', sceneId: 'ward', cast: ['林澄'], intro: '你没想到会在病房门口看见她。', repeatable: true },
    { id: 'rainy-cafe-meet', title: '雨天咖啡店', sceneId: 'cafe', cast: ['林澄'], intro: '她抖了抖雨伞上的水珠，抬眼看向你。', repeatable: true },
    { id: 'late-night-call', title: '深夜来电', sceneId: 'balcony', cast: ['周然'], intro: '手机震动打破了夜里的安静。', repeatable: true }
  ],
  characters: [
    {
      id: '林澄',
      name: '林澄',
      gender: '女',
      identity: '女高中生，学校里的核心女主',
      age: '17岁左右',
      personality: '安静、克制、敏感，内心有心事，不会轻易把真实想法全部说出口',
      speakingStyle: '说话偏轻、偏短句，情绪起伏含蓄，不会突然变成夸张搞笑或油滑语气',
      relationshipToPlayer: '与玩家处于暧昧建立初期，正在从陌生转向信任',
      hardRules: ['绝不能改成男性', '不改变既定身份', '不突然自称与设定矛盾的内容']
    },
    {
      id: '周然',
      name: '周然',
      gender: '男',
      identity: '主角生活圈中的辅助角色',
      age: '17岁左右',
      personality: '外表轻松，观察力强，偶尔会用玩笑掩饰认真',
      speakingStyle: '语气自然，带一点调侃，但不会抢主线戏份',
      relationshipToPlayer: '辅助角色，不是当前主要恋爱对象',
      hardRules: ['不抢走林澄的主线定位', '不擅自改变性别与身份']
    }
  ]
};
