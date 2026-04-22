import type { WorldData } from './types';

export const worldData: WorldData = {
  regions: [
    { id: 'school', name: '学校', sceneIds: ['classroom', 'hallway', 'playground', 'rooftop'] },
    { id: 'hospital', name: '医院', sceneIds: ['lobby', 'ward', 'hospital-hallway', 'vending-zone'] },
    { id: 'mall', name: '商场', sceneIds: ['atrium', 'cafe', 'cinema-gate', 'accessory-shop'] },
    { id: 'home', name: '主角家', sceneIds: ['living-room', 'bedroom', 'balcony', 'entryway'] }
  ],
  scenes: [
    {
      id: 'classroom',
      regionId: 'school',
      name: '教室',
      description: '放学后的教室被夕阳染成暖金色。',
      eventSeed: {
        baseTitle: '放学后的空教室',
        castIds: ['林澄'],
        tones: ['克制', '暧昧', '欲言又止'],
        buildUpGoals: ['让玩家察觉林澄今晚在等人', '让气氛先慢慢靠近，再露出不安'],
        triggerHints: ['门外忽然传来不合时宜的脚步声', '有人站在教室门口短暂停留'],
        resolutionDirections: ['把这一幕先收在心事被打断的悬念里', '让玩家带着未说完的话离开教室'],
        premiseTemplates: ['她一个人坐在窗边，像是在等什么。', '她留在空教室里，似乎不想太早回家。'],
        suspenseSeeds: ['她到底在等谁', '她今晚为什么不想离开教室'],
        preferredTimeSlots: ['afternoon', 'evening']
      },
      fallbackEventSeed: {
        baseTitle: '空教室里的余温',
        castIds: [],
        tones: ['安静', '留白'],
        buildUpGoals: ['让玩家感到这里刚刚有人待过，但现在只剩余温'],
        triggerHints: ['教室外忽然传来一阵急促脚步，像是有人匆匆经过'],
        resolutionDirections: ['把这一幕收在空位和回音留下的悬念里'],
        premiseTemplates: ['教室里只剩下一排被夕阳照亮的空座位，像是有人刚离开不久。'],
        suspenseSeeds: ['刚才离开的人是谁', '那阵脚步声是不是和这里有关'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'hallway',
      regionId: 'school',
      name: '走廊',
      description: '窗边的风吹动着张贴的社团海报。',
      eventSeed: {
        baseTitle: '风吹过的走廊',
        castIds: [],
        tones: ['轻缓', '短暂停留'],
        buildUpGoals: ['让玩家在路过中感到这里藏着一点不对劲'],
        triggerHints: ['走廊尽头忽然传来一阵脚步声，又很快安静下去'],
        resolutionDirections: ['把这一幕收在你停下脚步后的短暂迟疑里'],
        premiseTemplates: ['风把走廊上的海报吹得猎猎作响，空气里像留着谁刚离开的痕迹。'],
        suspenseSeeds: ['刚才经过的人是谁', '风里夹着的纸页声是不是某种暗示'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'playground',
      regionId: 'school',
      name: '操场',
      description: '远处还能听见篮球落地的回响。',
      eventSeed: {
        baseTitle: '操场边的回声',
        castIds: [],
        tones: ['开阔', '松弛', '像在等待什么'],
        buildUpGoals: ['让玩家注意到热闹散去后留下的空白感'],
        triggerHints: ['看台那边突然传来一阵骚动，又很快平息'],
        resolutionDirections: ['把这一幕停在远处回声未散的时候'],
        premiseTemplates: ['操场上只剩零散回声，你站在边缘，像是闯进了一段还没彻底结束的余波。'],
        suspenseSeeds: ['刚才这里发生过什么', '看台那边的骚动是不是还会回来'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'rooftop',
      regionId: 'school',
      name: '天台',
      description: '城市的风从高处掠过。',
      eventSeed: {
        baseTitle: '风大的天台',
        castIds: [],
        tones: ['疏离', '高处的空旷'],
        buildUpGoals: ['让玩家在空无一人的高处感到一种迟来的不安'],
        triggerHints: ['天台门忽然轻轻响了一下，像是有人在门外停过'],
        resolutionDirections: ['把这一幕先收在风声和门锁声交叠的余韵里'],
        premiseTemplates: ['天台上没有别人，只有风从高处一阵阵掠过。'],
        suspenseSeeds: ['刚才门外是谁', '这里是不是本来有人来过'],
        preferredTimeSlots: ['evening', 'night']
      }
    },
    {
      id: 'lobby',
      regionId: 'hospital',
      name: '大厅',
      description: '消毒水味混着轻微脚步声。',
      eventSeed: {
        baseTitle: '医院大厅的擦肩',
        castIds: [],
        tones: ['克制', '疲惫'],
        buildUpGoals: ['让玩家感到大厅里每个人都像在隐瞒什么'],
        triggerHints: ['广播里突然念到一个让周围人同时抬头的名字'],
        resolutionDirections: ['留下比答案更多的问题'],
        premiseTemplates: ['大厅里的人各自来去，气氛却有种说不出的压抑。'],
        suspenseSeeds: ['广播里提到的人是谁', '为什么这一刻所有人都安静了一下'],
        preferredTimeSlots: ['morning', 'afternoon', 'night']
      }
    },
    {
      id: 'ward',
      regionId: 'hospital',
      name: '病房',
      description: '白色帘子随着空调轻轻晃动。',
      eventSeed: {
        baseTitle: '安静探望',
        castIds: ['林澄'],
        tones: ['压低声音', '敏感'],
        buildUpGoals: ['让玩家察觉病房里的人和她关系不浅'],
        triggerHints: ['病房外突然有人停下脚步，像是在确认门牌'],
        resolutionDirections: ['把这一幕收在未说出的担心里'],
        premiseTemplates: ['你没想到会在病房门口看见她。'],
        suspenseSeeds: ['她在探望谁', '门外的人是不是冲着她来的'],
        preferredTimeSlots: ['afternoon', 'night', 'late_night']
      },
      fallbackEventSeed: {
        baseTitle: '帘子后的病房',
        castIds: [],
        tones: ['安静', '压抑'],
        buildUpGoals: ['让玩家在病房里感觉到一种不便久留的沉默'],
        triggerHints: ['病房外忽然有人停步，像在犹豫要不要推门'],
        resolutionDirections: ['把这一幕收在帘子轻晃和脚步远去的余波里'],
        premiseTemplates: ['病房里安静得只剩空调声和帘子的轻响。'],
        suspenseSeeds: ['门外的人是谁', '这里刚刚是不是有人来过'],
        preferredTimeSlots: ['afternoon', 'night', 'late_night']
      }
    },
    {
      id: 'hospital-hallway',
      regionId: 'hospital',
      name: '走廊',
      description: '夜班灯光把地面照得发白。',
      eventSeed: {
        baseTitle: '发白的走廊',
        castIds: [],
        tones: ['安静', '紧绷'],
        buildUpGoals: ['把气氛推到一种不方便大声说话的压迫感'],
        triggerHints: ['拐角处有人突然停下，像在观察这边'],
        resolutionDirections: ['让离开时的沉默比对白更重'],
        premiseTemplates: ['走廊里只有发白的灯光和零散脚步声。'],
        suspenseSeeds: ['拐角后面的人是谁', '这里是不是正发生着什么'],
        preferredTimeSlots: ['night', 'late_night']
      }
    },
    {
      id: 'vending-zone',
      regionId: 'hospital',
      name: '自动贩卖机区',
      description: '饮料机发出轻微的电流声。',
      eventSeed: {
        baseTitle: '自动贩卖机前',
        castIds: [],
        tones: ['短暂停顿', '不自然的轻松'],
        buildUpGoals: ['让玩家感到这里像是别人临时躲进来的地方'],
        triggerHints: ['旁边忽然有人低声说了句你没听清的话'],
        resolutionDirections: ['让事件停在一句没来得及确认的话上'],
        premiseTemplates: ['饮料机前空无一人，但屏幕的亮光让这里像刚有人停留过。'],
        suspenseSeeds: ['刚才是谁站在这里', '那句没听清的话是说给谁听的'],
        preferredTimeSlots: ['afternoon', 'night']
      }
    },
    {
      id: 'atrium',
      regionId: 'mall',
      name: '一层中庭',
      description: '商场广播正播着轻快的歌。',
      eventSeed: {
        baseTitle: '商场中庭的停顿',
        castIds: [],
        tones: ['明亮外表下的犹豫'],
        buildUpGoals: ['让热闹环境反衬某种说不出的空缺感'],
        triggerHints: ['扶梯口忽然有人急匆匆跑过，打断你的停留'],
        resolutionDirections: ['把这一幕收在热闹人群中的短暂失神里'],
        premiseTemplates: ['人来人往的中庭里，你忽然觉得某个角落刚错过了什么。'],
        suspenseSeeds: ['刚才跑过去的人在追谁', '这里是不是有人刚离开不久'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'cafe',
      regionId: 'mall',
      name: '咖啡店',
      description: '咖啡香把气氛变得柔软。',
      eventSeed: {
        baseTitle: '雨天咖啡店',
        castIds: ['林澄'],
        tones: ['柔软', '亲近', '藏着避不开的话题'],
        buildUpGoals: ['先让气氛柔和，再露出她迟迟不开口的原因'],
        triggerHints: ['窗外突然出现一个让她明显紧张的人影'],
        resolutionDirections: ['让气氛升温，却把真正的问题留到下一次'],
        premiseTemplates: ['她抖了抖雨伞上的水珠，抬眼看向你。'],
        suspenseSeeds: ['她是在躲谁', '窗外的人是不是冲着她来的'],
        preferredTimeSlots: ['afternoon', 'evening', 'night']
      },
      fallbackEventSeed: {
        baseTitle: '咖啡店里的空位',
        castIds: [],
        tones: ['柔软', '留白'],
        buildUpGoals: ['让玩家感到这里像是本该有人赴约却暂时落空了'],
        triggerHints: ['窗边忽然有人放下一把湿伞，却又很快离开'],
        resolutionDirections: ['把这一幕收在杯口余温和窗外雨声里'],
        premiseTemplates: ['靠窗的位置还留着一杯没怎么动过的热饮，像是谁刚刚离席。'],
        suspenseSeeds: ['离开的人是谁', '这杯饮料原本在等谁'],
        preferredTimeSlots: ['afternoon', 'evening', 'night']
      }
    },
    {
      id: 'cinema-gate',
      regionId: 'mall',
      name: '电影院门口',
      description: '海报灯箱映着来往的人群。',
      eventSeed: {
        baseTitle: '灯箱前的迟到',
        castIds: [],
        tones: ['轻松外壳', '不安内里'],
        buildUpGoals: ['让玩家感觉这里像有一场约被拖延了太久'],
        triggerHints: ['检票口那边忽然有人高声叫了句名字'],
        resolutionDirections: ['留下一种事情还没真正开始就被打断的感觉'],
        premiseTemplates: ['灯箱前人来人往，你却总觉得这里刚错过了一场见面。'],
        suspenseSeeds: ['被喊住的人是谁', '迟到的到底是谁'],
        preferredTimeSlots: ['evening', 'night']
      }
    },
    {
      id: 'accessory-shop',
      regionId: 'mall',
      name: '饰品店',
      description: '玻璃展柜里闪着细小反光。',
      eventSeed: {
        baseTitle: '饰品店的镜面反光',
        castIds: [],
        tones: ['细腻', '欲说还休'],
        buildUpGoals: ['借小物件拉出一种不便直说的情绪'],
        triggerHints: ['店外忽然有人停下脚步朝里看了一眼'],
        resolutionDirections: ['把剧情收在镜面里短暂掠过的身影上'],
        premiseTemplates: ['玻璃展柜里闪着细小反光，像在替谁留住一个没说出口的念头。'],
        suspenseSeeds: ['店外驻足的人是谁', '刚才被看中的东西会属于谁'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'living-room',
      regionId: 'home',
      name: '客厅',
      description: '傍晚的客厅有一点安静过头。',
      eventSeed: {
        baseTitle: '安静过头的客厅',
        castIds: [],
        tones: ['平静', '藏着试探'],
        buildUpGoals: ['让玩家察觉客厅里像刚有人谈完一件不想留下痕迹的事'],
        triggerHints: ['门外突然传来敲门声，打断这点安静'],
        resolutionDirections: ['把信息留在玩家心里，而不是当场解释完'],
        premiseTemplates: ['客厅里安静得有点过头，像一段对话刚刚被匆忙结束。'],
        suspenseSeeds: ['门外是谁', '刚刚结束的对话和谁有关'],
        preferredTimeSlots: ['evening', 'night']
      }
    },
    {
      id: 'bedroom',
      regionId: 'home',
      name: '卧室',
      description: '桌面上摊着没看完的习题册。',
      eventSeed: {
        baseTitle: '桌灯下的消息',
        castIds: [],
        tones: ['私密', '夜里的清醒'],
        buildUpGoals: ['让玩家在独处环境里收到更直接的外部刺激'],
        triggerHints: ['手机上忽然弹出一条不该在这个时间出现的消息'],
        resolutionDirections: ['让夜晚留下更强的悬念感'],
        premiseTemplates: ['桌灯把房间照得很静，突然震动的手机打破了一切。'],
        suspenseSeeds: ['是谁在深夜联系你', '这条消息和谁有关'],
        preferredTimeSlots: ['night', 'late_night']
      }
    },
    {
      id: 'balcony',
      regionId: 'home',
      name: '阳台',
      description: '夜风吹起窗帘的边角。',
      eventSeed: {
        baseTitle: '深夜来电',
        castIds: ['周然'],
        tones: ['夜里的不确定', '半真半假'],
        buildUpGoals: ['让来电逐渐暴露出真正来意'],
        triggerHints: ['电话另一头突然出现第三个人的声音'],
        resolutionDirections: ['把夜里的余波保留下来，进入下一次见面'],
        premiseTemplates: ['手机震动打破了夜里的安静。'],
        suspenseSeeds: ['电话另一头到底发生了什么', '周然为什么选择这个时间联系你'],
        preferredTimeSlots: ['night', 'late_night']
      },
      fallbackEventSeed: {
        baseTitle: '阳台上的风声',
        castIds: [],
        tones: ['夜里的空白', '未接来意'],
        buildUpGoals: ['让玩家在一个没有接通的夜里感到某种缺席'],
        triggerHints: ['远处忽然传来一阵模糊铃声，又很快被风盖过去'],
        resolutionDirections: ['把这一幕收在夜风和未接通的话之间'],
        premiseTemplates: ['阳台上只有风声，像是本该有人说话，却迟迟没有响起。'],
        suspenseSeeds: ['那阵铃声是谁的', '今晚原本会联系你的人去了哪里'],
        preferredTimeSlots: ['night', 'late_night']
      }
    },
    {
      id: 'entryway',
      regionId: 'home',
      name: '门口',
      description: '鞋柜上还放着今天出门时忘记带走的钥匙。',
      eventSeed: {
        baseTitle: '门口的停顿',
        castIds: [],
        tones: ['即将离开前的迟疑'],
        buildUpGoals: ['把一件普通的小事慢慢推成值得记住的瞬间'],
        triggerHints: ['门外忽然有人比你更先碰到了门把手'],
        resolutionDirections: ['让离开和留下都带一点代价'],
        premiseTemplates: ['你准备出门时，门外刚好传来轻轻的一声响。'],
        suspenseSeeds: ['门外是谁', '他为什么会选这个时机过来'],
        preferredTimeSlots: ['morning', 'evening', 'night']
      }
    }
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
