import type { WorldData } from './types';

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ORIGINAL_WORLD_DATA: WorldData = {
  mapImageUrl: '/assets/map/city-overview-main.png',
  regions: [
    {
      id: 'school',
      name: '学校',
      sceneIds: ['classroom', 'hallway', 'playground', 'rooftop'],
      imageUrl: '/assets/backgrounds/region-school-main.png'
    },
    {
      id: 'hospital',
      name: '医院',
      sceneIds: ['lobby', 'ward', 'hospital-hallway', 'vending-zone'],
      imageUrl: '/assets/backgrounds/region-hospital-main.png'
    },
    {
      id: 'mall',
      name: '商场',
      sceneIds: ['atrium', 'cafe', 'cinema-gate', 'accessory-shop'],
      imageUrl: '/assets/backgrounds/region-mall-main.png'
    },
    {
      id: 'home',
      name: '主角家',
      sceneIds: ['living-room', 'bedroom', 'balcony', 'entryway'],
      imageUrl: '/assets/backgrounds/region-home-main.png'
    }
  ],
  scenes: [
    {
      id: 'classroom',
      regionId: 'school',
      name: '教室',
      description: '放学后的教室被夕阳染成暖金色。',
      imageUrl: '/assets/backgrounds/scene-classroom-main.png',
      eventSeed: {
        baseTitle: '放学后的空教室',
        castIds: ['林澄'],
        tones: ['克制', '暧昧', '欲言又止'],
        buildUpGoals: ['让玩家察觉林澄今天有话想单独说', '让气氛先慢慢靠近，再露出暧昧的心跳感'],
        triggerHints: ['两个人同时伸手去拿同一本练习册，手指短暂碰到一起', '夕阳太低，林澄站近一步替玩家挡住刺眼的光'],
        resolutionDirections: ['把这一幕收在脸红和没说出口的邀请里', '让玩家带着未说完的话和一点心动离开教室'],
        premiseTemplates: ['她一个人坐在窗边，像是专门把放学后的时间留给你。', '她留在空教室里，翻着练习册，却总忍不住看向门口。'],
        suspenseSeeds: ['她想单独和玩家说什么', '两个人的距离为什么突然变得这么近'],
        preferredTimeSlots: ['afternoon', 'evening']
      },
      fallbackEventSeed: {
        baseTitle: '空教室里的余温',
        castIds: [],
        tones: ['安静', '留白'],
        buildUpGoals: ['让玩家在空教室里想起刚才错过的相处机会'],
        triggerHints: ['桌面上留着一张写到一半的便签，字迹像是在犹豫要不要给你'],
        resolutionDirections: ['把这一幕收在一张便签和放学后的余温里'],
        premiseTemplates: ['教室里只剩下一排被夕阳照亮的空座位，空气里还留着淡淡的洗发水香气。'],
        suspenseSeeds: ['那张便签是不是本来要给玩家', '玩家想不想主动追上去'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'hallway',
      regionId: 'school',
      name: '走廊',
      description: '窗边的风吹动着张贴的社团海报。',
      imageUrl: '/assets/backgrounds/scene-hallway-main.png',
      eventSeed: {
        baseTitle: '风吹过的走廊',
        castIds: [],
        tones: ['轻缓', '短暂停留'],
        buildUpGoals: ['让玩家在路过中遇到一段轻松又暧昧的校园插曲'],
        triggerHints: ['风把社团海报吹落，玩家和路过的人一起弯腰去捡，肩膀轻轻碰到'],
        resolutionDirections: ['把这一幕收在短暂对视和想多聊一句的迟疑里'],
        premiseTemplates: ['风把走廊上的社团海报吹得猎猎作响，放学后的喧闹正慢慢退远。'],
        suspenseSeeds: ['这次短暂相遇会不会变成新的熟人', '玩家要不要顺势多聊两句'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'playground',
      regionId: 'school',
      name: '操场',
      description: '远处还能听见篮球落地的回响。',
      imageUrl: '/assets/backgrounds/scene-playground-main.png',
      eventSeed: {
        baseTitle: '操场边的回声',
        castIds: [],
        tones: ['开阔', '松弛', '青春感'],
        buildUpGoals: ['让玩家在运动后的热气里感到青春校园的亲近感'],
        triggerHints: ['飞来的篮球差点砸到玩家，有人拉住玩家手腕把人带到一旁'],
        resolutionDirections: ['把这一幕停在掌心余温和远处笑声里'],
        premiseTemplates: ['操场上还留着篮球落地的回声，夕阳把跑道照得很亮。'],
        suspenseSeeds: ['那次拉住手腕是不是太自然了', '玩家会不会被邀请一起留下来练习'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'rooftop',
      regionId: 'school',
      name: '天台',
      description: '城市的风从高处掠过。',
      imageUrl: '/assets/backgrounds/scene-rooftop-main.png',
      eventSeed: {
        baseTitle: '风大的天台',
        castIds: [],
        tones: ['疏离', '高处的空旷', '心事'],
        buildUpGoals: ['让玩家在空旷的高处遇到一段更坦白的青春心事'],
        triggerHints: ['风太大，身边的人下意识靠近玩家，声音也压得更低'],
        resolutionDirections: ['把这一幕收在风声、近距离和没说完的心事里'],
        premiseTemplates: ['天台上没有别人，只有风从高处一阵阵掠过。'],
        suspenseSeeds: ['对方为什么愿意在这里说真心话', '玩家会不会回应这份靠近'],
        preferredTimeSlots: ['evening', 'night']
      }
    },
    {
      id: 'lobby',
      regionId: 'hospital',
      name: '大厅',
      description: '消毒水味混着轻微脚步声。',
      imageUrl: '/assets/backgrounds/scene-lobby-main.png',
      eventSeed: {
        baseTitle: '医院大厅的擦肩',
        castIds: [],
        tones: ['克制', '疲惫', '被照顾'],
        buildUpGoals: ['让玩家在医院大厅里经历一段被关心或主动关心的亲密瞬间'],
        triggerHints: ['玩家买水时差点拿错，对方自然接过瓶盖替玩家拧开'],
        resolutionDirections: ['留下被照顾后的微妙心动和不好意思'],
        premiseTemplates: ['大厅里的人各自来去，消毒水味让人的声音都放轻了一点。'],
        suspenseSeeds: ['这份关心是不是超过了普通朋友', '玩家要不要把谢谢说得更认真一点'],
        preferredTimeSlots: ['morning', 'afternoon', 'night']
      }
    },
    {
      id: 'ward',
      regionId: 'hospital',
      name: '病房',
      description: '白色帘子随着空调轻轻晃动。',
      imageUrl: '/assets/backgrounds/scene-ward-main.png',
      eventSeed: {
        baseTitle: '安静探望',
        castIds: ['林澄'],
        tones: ['压低声音', '敏感'],
        buildUpGoals: ['让玩家察觉病房里的人和她关系不浅'],
        triggerHints: ['她低声提醒玩家靠近一点说话，两个人的肩膀几乎贴在一起'],
        resolutionDirections: ['把这一幕收在未说出的担心里'],
        premiseTemplates: ['你没想到会在病房门口看见她。'],
        suspenseSeeds: ['她愿意把脆弱的一面给玩家看吗', '玩家能不能用更温柔的方式陪着她'],
        preferredTimeSlots: ['afternoon', 'night', 'late_night']
      },
      fallbackEventSeed: {
        baseTitle: '帘子后的病房',
        castIds: [],
        tones: ['安静', '温柔'],
        buildUpGoals: ['让玩家在病房里感到一种不便大声说话的亲近'],
        triggerHints: ['帘子轻轻晃动，玩家和身边的人同时压低声音，距离靠得更近'],
        resolutionDirections: ['把这一幕收在帘子轻晃和低声关心里'],
        premiseTemplates: ['病房里安静得只剩空调声和帘子的轻响。'],
        suspenseSeeds: ['玩家会不会主动照顾身边的人', '这份安静会不会让人更容易说真话'],
        preferredTimeSlots: ['afternoon', 'night', 'late_night']
      }
    },
    {
      id: 'hospital-hallway',
      regionId: 'hospital',
      name: '走廊',
      description: '夜班灯光把地面照得发白。',
      imageUrl: '/assets/backgrounds/scene-hospital-hallway-main.png',
      eventSeed: {
        baseTitle: '发白的走廊',
        castIds: [],
        tones: ['安静', '克制', '近距离'],
        buildUpGoals: ['把气氛推到一种不方便大声说话的暧昧距离'],
        triggerHints: ['护士推车经过，两个人不得不一起退到墙边，距离一下子缩短'],
        resolutionDirections: ['让离开时的沉默带着一点心跳加速'],
        premiseTemplates: ['走廊里只有发白的灯光和零散脚步声。'],
        suspenseSeeds: ['刚才的靠近有没有让两个人都乱了节奏', '玩家要不要假装没注意到那点脸红'],
        preferredTimeSlots: ['night', 'late_night']
      }
    },
    {
      id: 'vending-zone',
      regionId: 'hospital',
      name: '自动贩卖机区',
      description: '饮料机发出轻微的电流声。',
      imageUrl: '/assets/backgrounds/scene-vending-zone-main.png',
      eventSeed: {
        baseTitle: '自动贩卖机前',
        castIds: [],
        tones: ['短暂停顿', '不自然的轻松', '日常暧昧'],
        buildUpGoals: ['让玩家在买饮料的小事里感到关系被悄悄拉近'],
        triggerHints: ['对方买到和玩家一样的饮料，笑着说这算不算默契'],
        resolutionDirections: ['让事件停在一瓶饮料和一句玩笑带来的心动上'],
        premiseTemplates: ['饮料机前亮着柔和的屏幕光，适合把一句关心说得很随意。'],
        suspenseSeeds: ['这份默契是不是只有玩家注意到了', '玩家要不要顺势请对方喝一瓶'],
        preferredTimeSlots: ['afternoon', 'night']
      }
    },
    {
      id: 'atrium',
      regionId: 'mall',
      name: '一层中庭',
      description: '商场广播正播着轻快的歌。',
      imageUrl: '/assets/backgrounds/scene-atrium-main.png',
      eventSeed: {
        baseTitle: '商场中庭的停顿',
        castIds: [],
        tones: ['明亮', '约会感', '有点心动'],
        buildUpGoals: ['让热闹环境反衬两个人之间越来越明显的在意'],
        triggerHints: ['扶梯口人潮涌过，对方下意识牵住玩家的手腕不让人走散'],
        resolutionDirections: ['把这一幕收在热闹人群中的短暂牵手里'],
        premiseTemplates: ['人来人往的中庭里，商场广播正播着轻快的歌。'],
        suspenseSeeds: ['那次牵手是不是太自然了', '玩家要不要主动放慢脚步等对方'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'cafe',
      regionId: 'mall',
      name: '咖啡店',
      description: '咖啡香把气氛变得柔软。',
      imageUrl: '/assets/backgrounds/scene-cafe-main.png',
      eventSeed: {
        baseTitle: '雨天咖啡店',
        castIds: ['林澄'],
        tones: ['柔软', '亲近', '藏着说不出口的喜欢'],
        buildUpGoals: ['先让气氛柔和，再露出她迟迟不开口的心动'],
        triggerHints: ['她抬手替玩家擦掉杯沿沾到的奶泡，动作轻得让人不好意思'],
        resolutionDirections: ['让气氛升温，却把真正的告白留到下一次'],
        premiseTemplates: ['她抖了抖雨伞上的水珠，抬眼看向你。'],
        suspenseSeeds: ['她刚才是不是故意靠近了一点', '玩家会不会把这当成约会'],
        preferredTimeSlots: ['afternoon', 'evening', 'night']
      },
      fallbackEventSeed: {
        baseTitle: '咖啡店里的空位',
        castIds: [],
        tones: ['柔软', '留白'],
        buildUpGoals: ['让玩家感到这里很适合一场临时约会'],
        triggerHints: ['店员把两杯饮料误会成情侣套餐，笑着放在同一个托盘上'],
        resolutionDirections: ['把这一幕收在杯口余温和被误会后的不好意思里'],
        premiseTemplates: ['靠窗的位置能看见雨线，桌面灯光把热饮照得很柔软。'],
        suspenseSeeds: ['玩家要不要顺势接受情侣套餐的玩笑', '这场偶遇会不会变成约会'],
        preferredTimeSlots: ['afternoon', 'evening', 'night']
      }
    },
    {
      id: 'cinema-gate',
      regionId: 'mall',
      name: '电影院门口',
      description: '海报灯箱映着来往的人群。',
      imageUrl: '/assets/backgrounds/scene-cinema-gate-main.png',
      eventSeed: {
        baseTitle: '灯箱前的迟到',
        castIds: [],
        tones: ['轻松', '约会前的紧张'],
        buildUpGoals: ['让玩家感觉这里像一场还没说出口的约会'],
        triggerHints: ['检票口排队时两个人被人群挤近，肩膀贴在一起好几秒'],
        resolutionDirections: ['留下一种电影还没开始、心跳已经先开始的感觉'],
        premiseTemplates: ['灯箱前人来人往，海报的光把等待变得像约会前奏。'],
        suspenseSeeds: ['这场电影会不会被当成约会', '玩家要不要主动买同一桶爆米花'],
        preferredTimeSlots: ['evening', 'night']
      }
    },
    {
      id: 'accessory-shop',
      regionId: 'mall',
      name: '饰品店',
      description: '玻璃展柜里闪着细小反光。',
      imageUrl: '/assets/backgrounds/scene-accessory-shop-main.png',
      eventSeed: {
        baseTitle: '饰品店的镜面反光',
        castIds: [],
        tones: ['细腻', '欲说还休'],
        buildUpGoals: ['借小物件拉出一种不便直说的情绪'],
        triggerHints: ['店员笑着推荐情侣款饰品，气氛一下子变得暧昧'],
        resolutionDirections: ['把剧情收在镜面里两个人短暂对视的脸红上'],
        premiseTemplates: ['玻璃展柜里闪着细小反光，像在替谁留住一个没说出口的念头。'],
        suspenseSeeds: ['玩家会不会把饰品当成礼物送出去', '对方会不会接受情侣款的玩笑'],
        preferredTimeSlots: ['afternoon', 'evening']
      }
    },
    {
      id: 'living-room',
      regionId: 'home',
      name: '客厅',
      description: '傍晚的客厅有一点安静过头。',
      imageUrl: '/assets/backgrounds/scene-living-room-main.png',
      eventSeed: {
        baseTitle: '安静过头的客厅',
        castIds: [],
        tones: ['平静', '藏着试探', '私密日常'],
        buildUpGoals: ['让玩家在熟悉空间里经历一点更私密的恋爱试探'],
        triggerHints: ['沙发太窄，两个人坐下时膝盖轻轻碰到，谁都没有立刻挪开'],
        resolutionDirections: ['把信息留在玩家心里，而不是当场解释完'],
        premiseTemplates: ['客厅里安静得有点过头，电视声被调得很低。'],
        suspenseSeeds: ['玩家会不会主动坐近一点', '这份安静会不会让暧昧变得更明显'],
        preferredTimeSlots: ['evening', 'night']
      }
    },
    {
      id: 'bedroom',
      regionId: 'home',
      name: '卧室',
      description: '桌面上摊着没看完的习题册。',
      imageUrl: '/assets/backgrounds/scene-bedroom-main.png',
      eventSeed: {
        baseTitle: '桌灯下的消息',
        castIds: [],
        tones: ['私密', '夜里的清醒', '暧昧消息'],
        buildUpGoals: ['让玩家在独处环境里收到更直接的心动信号'],
        triggerHints: ['手机上弹出一句“你睡了吗”，语气像随口问，又像等了很久'],
        resolutionDirections: ['让夜晚留下更强的暧昧感'],
        premiseTemplates: ['桌灯把房间照得很静，手机屏幕亮起时，心跳也跟着快了一点。'],
        suspenseSeeds: ['玩家要不要立刻回复', '这条深夜消息是不是意味着更亲近'],
        preferredTimeSlots: ['night', 'late_night']
      }
    },
    {
      id: 'balcony',
      regionId: 'home',
      name: '阳台',
      description: '夜风吹起窗帘的边角。',
      imageUrl: '/assets/backgrounds/scene-balcony-main.png',
      eventSeed: {
        baseTitle: '深夜来电',
        castIds: ['周然'],
        tones: ['夜里的不确定', '半真半假', '玩笑里的认真'],
        buildUpGoals: ['让来电逐渐暴露出对方其实很在意玩家'],
        triggerHints: ['电话另一头忽然安静几秒，对方用玩笑遮掩一句太认真的关心'],
        resolutionDirections: ['把夜里的余波保留下来，进入下一次更亲近的见面'],
        premiseTemplates: ['手机震动打破了夜里的安静，屏幕上的名字亮得有点暧昧。'],
        suspenseSeeds: ['玩笑后面是不是藏着认真', '玩家会不会听出对方的在意'],
        preferredTimeSlots: ['night', 'late_night']
      },
      fallbackEventSeed: {
        baseTitle: '阳台上的风声',
        castIds: [],
        tones: ['夜里的空白', '想念', '暧昧未接'],
        buildUpGoals: ['让玩家在一个没有接通的夜里感到想念正在变得明确'],
        triggerHints: ['聊天框里那句没发出去的话停了很久，玩家的手指悬在发送键上'],
        resolutionDirections: ['把这一幕收在夜风和未发出的问候之间'],
        premiseTemplates: ['阳台上只有风声，适合把一句想念藏在手机屏幕里。'],
        suspenseSeeds: ['玩家会不会把那句想你发出去', '这份想念会不会改变关系'],
        preferredTimeSlots: ['night', 'late_night']
      }
    },
    {
      id: 'entryway',
      regionId: 'home',
      name: '门口',
      description: '鞋柜上还放着今天出门时忘记带走的钥匙。',
      imageUrl: '/assets/backgrounds/scene-entryway-main.png',
      eventSeed: {
        baseTitle: '门口的停顿',
        castIds: [],
        tones: ['即将离开前的迟疑'],
        buildUpGoals: ['把一件普通的小事慢慢推成值得记住的瞬间'],
        triggerHints: ['两个人同时伸手去拿钥匙，指尖在鞋柜边轻轻碰到'],
        resolutionDirections: ['让离开和留下都带一点心动的犹豫'],
        premiseTemplates: ['你准备出门时，门外刚好传来轻轻的一声响。'],
        suspenseSeeds: ['玩家会不会因为这次碰手多停留一会儿', '这次出门会不会变成临时同行'],
        preferredTimeSlots: ['morning', 'evening', 'night']
      }
    }
  ],
  characters: [
    {
      id: '主角',
      name: '主角（玩家角色）',
      aliases: ['主角', '玩家', '玩家角色', '你'],
      gender: '男',
      identity: '玩家扮演的高中男生，故事视角的核心人物',
      age: '17岁左右',
      personality: '温和、敏感、容易被细节触动，会在关系推进时显得有些笨拙但真诚',
      speakingStyle: '第一反应偏克制，表达直接但不过分夸张，常用短句确认对方的情绪',
      relationshipToPlayer: '玩家本人',
      hardRules: ['这是玩家自己的角色', '不要在人物收集弹窗里当作新人物生成', '外貌和性别默认保持稳定，除非玩家明确修改'],
      appearance: '黑色短发，普通高中男生校服，身形清瘦，神情温和，带一点少年感。',
      currentLook: '穿深色校服外套和白衬衫的半身立绘，黑色短发，表情温和。',
      knownFacts: ['主角是玩家扮演的角色', '主角默认是高中男生', '主角是故事视角的核心人物'],
      firstMetAt: '原版初始数据',
      lastSeenAt: '原版初始数据',
      firstMetLocation: '主角家',
      encounterCount: 1,
      source: 'baseline',
      imageUrl: '/assets/characters/player-protagonist-half-body.png'
    },
    {
      id: '林澄',
      name: '林澄',
      gender: '女',
      identity: '女高中生，学校里的核心女主',
      age: '17岁左右',
      personality: '安静、克制、敏感，内心有心事，不会轻易把真实想法全部说出口',
      speakingStyle: '说话偏轻、偏短句，情绪起伏含蓄，不会突然变成夸张搞笑或油滑语气',
      relationshipToPlayer: '与玩家处于暧昧建立初期，正在从陌生转向信任',
      hardRules: ['绝不能改成男性', '不改变既定身份', '不突然自称与设定矛盾的内容'],
      appearance: '黑色长发，校服或简洁日常穿搭，神情安静而敏感。',
      currentLook: '放学后的校服半身立绘，眼神克制，带着没有说出口的心事。',
      knownFacts: ['她是学校里的核心女主', '她不会轻易把真实想法全部说出口'],
      firstMetAt: '原版初始数据',
      lastSeenAt: '原版初始数据',
      firstMetLocation: '学校',
      encounterCount: 1,
      source: 'baseline',
      imageUrl: '/assets/characters/lin-cheng-half-body.png'
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
      hardRules: ['不抢走林澄的主线定位', '不擅自改变性别与身份'],
      appearance: '短发，普通高中生日常穿搭，表情轻松但观察力强。',
      currentLook: '轻松站姿的半身立绘，带一点调侃的笑意。',
      knownFacts: ['他是主角生活圈中的辅助角色', '他有时会用玩笑掩饰认真'],
      firstMetAt: '原版初始数据',
      lastSeenAt: '原版初始数据',
      firstMetLocation: '城市',
      encounterCount: 1,
      source: 'baseline',
      imageUrl: '/assets/characters/zhou-ran-half-body.png'
    }
  ]
};

export const createInitialWorldData = (): WorldData => cloneJson(ORIGINAL_WORLD_DATA);

export const worldData: WorldData = createInitialWorldData();
