import { userByEvent, researchByPlace } from './guide-content.js'
import walk from './assets/spots/pose-walk.png'
import back from './assets/spots/pose-back.png'
import sit from './assets/spots/pose-sit.png'
import read from './assets/spots/pose-read.png'

export const poses = {
  walk: {src:walk, title:'自然走动', tip:'身体侧向镜头，慢走两步，手臂自然摆动；连拍选一张。'},
  back: {src:back, title:'背影看风景', tip:'背向镜头，肩膀放松，身体略偏向一侧；为风景留出空间。'},
  sit: {src:sit, title:'侧坐看远处', tip:'坐在可使用的长椅上，双腿自然错开，看向镜头旁边。'},
  read: {src:read, title:'低头翻书', tip:'轻拿书本，身体微侧，低头翻一页；拍摄安静的侧面。'}
}
const guide=(locations,poseIds,photos=[])=>({locations,poseIds,photos})
export const spotGuides = {
  'St Kilda Pier Melbourne':guide(['码头步道：用栏杆与步道作为引导线，人物放在画面侧边。','原攻略建议提前抵达，并留意日落后的蓝调时刻。'],['back','walk']),
  'State Library Victoria':guide(['6 楼俯拍阅览室全景，利用放射状书桌构图。','5 楼拍 4 楼的人物；3 楼拍阅读近景。按现场开放与拍摄规定选择位置。'],['read','back']),
  'Royal Arcade Melbourne':guide(['皇家拱廊：利用长廊纵深和两侧店铺做对称构图。','本段路过唐人街，可将牌楼作为街景背景。'],['walk','back']),
  'Flinders Street Station Melbourne':guide(['圣保罗大教堂对角的长椅：人物在前景，福林德车站作背景。','教堂对面台阶视角：把车站与红绿灯一起纳入画面。'],['sit','walk']),
  'National Gallery of Victoria':guide(['原攻略记录 2 楼作品及雕塑花园；实际展陈以现场为准。','人物放在作品旁侧，保留完整画框或雕塑轮廓。'],['back','walk']),
  'Twelve Apostles Victoria':guide(['在开放观景平台，以海蚀柱为背景，人物放在画面下方或侧边。','Gibson Steps 是原攻略备选；随团时间紧时优先主观景台，不为拍照赶往返。'],['back','walk']),
  'Loch Ard Gorge Victoria':guide(['原攻略列出沉船湾观景台、The Razorback 及回停车场途中的草地。','选开放步道内的宽阔位置，把海岸线留在人物身侧。'],['back','walk']),
  'Great Ocean Road Memorial Arch':guide(['在开放的人行停留区，把纪念门牌完整纳入背景。'],['walk','back']),
  'Gertrude Street Fitzroy Melbourne':guide(['沿 Brunswick St／Gertrude St 漫游，选择喜欢的店面与街角背景。'],['walk','sit']),
  'Monash University Caulfield Campus':guide(['校园散步时选有回忆的建筑入口或步道，拍一张环境合影。'],['walk','back']),
  'Sydney Opera House':guide(["Opera Bar 一侧的步行道与长椅：坐姿或侧身拍建筑。","Man O’War Steps 一侧：把歌剧院的帆形轮廓放在人物身后。",'Harbour View Lawn；体力与时间允许时延伸至 Mrs Macquarie’s Chair。入场日优先保证演出时间。'],['sit','back']),
  'Joan Sutherland Theatre Sydney Opera House':guide(['入场前在歌剧院外观处留影；演出期间按剧场规定，不安排拍照动作。'],['back','walk']),
  'Bald Hill Lookout':guide(['在观景台开放区域，面向海岸取景，人物不遮挡远处海岸线。'],['back','walk']),
  'Sea Cliff Bridge':guide(['优先在开放的人行步道取景，以桥身弧线引导画面；不采用原攻略的非正式山路机位。'],['back','walk']),
  'Kiama Blowhole':guide(['灯塔附近以白色塔身为背景；喷水洞在开放观景区域拍环境。'],['walk','back']),
  'Gerringong Whale Watching Platform':guide(['原攻略以 Whale Watching Platform 为起点，沿 Tasman Drive 漫步。','从人行道拍起伏街景，不站到车道上；保持安静。'],['walk','back']),
  'Bendeela Recreation Area':guide(['若当天确认前往，从开放区域远拍草地环境与野生动物，不靠近摆拍。'],['back']),
  'Minnamurra Lookout':guide(['原攻略记录观景点下方草坡，可将沙滩完整形状纳入背景；以现场开放范围为准。'],['sit','back']),
  'Royal Botanic Garden Sydney':guide(['Harbour View Lawn 拍草地与海港；Mrs Macquarie’s Chair 仅在体力允许时延伸。'],['walk','back']),
  'Art Gallery of New South Wales':guide(['建筑外部拍入口与柱廊，人站在一侧，保留建筑线条。'],['walk','back']),
  "St Mary's Cathedral Sydney":guide(['教堂外部拍立面与广场；原攻略提醒弥撒期间不走动拍照。'],['walk','back']),
  'Bondi Beach Sydney':guide(['按现有行程在海滩与 Icebergs 附近短走，选择开放步道或沙滩取景。'],['walk','back'])
}

export function spotGuideFor(event) {
  if(event?.type!=='spot') return null
  if(event.title.includes('企鹅')) return guide(['本项以观察企鹅为主，不安排靠近动物的人像摆拍；遵守现场拍摄要求。'],[])
  if(!event.place) return guide(['具体停留点以当天安排为准；以下只提供通用姿势示意，不代表已确认当地机位。'],['back','walk'])
  const base = spotGuides[event.place] || guide(['攻略暂无具体机位；在现场开放区域选择宽阔背景，以下为通用拍摄建议。'],['back','walk'])
  const personal = userByEvent[event.id]
  const extra = researchByPlace[event.place]
  if (personal) return {...base, ...personal}
  if (!extra) return base
  const posePhotos=extra.photos.filter(p=>p.kind==='pose')
  return {...base, sourceLabel:'攻略与实拍参考',
    locations:extra.suggestion?[...base.locations,extra.suggestion]:base.locations,
    photos:extra.photos.filter(p=>p.kind!=='pose'), posePhotos,
    poseIds:posePhotos.length?[]:base.poseIds}

}
