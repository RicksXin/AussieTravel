import { userByEvent, researchByPlace } from './guide-content.js'

// Photos are verified extracts of the user's guide, not generic dish illustrations.
// A stable HTTPS URL may replace any imported photo after image hosting is configured.
export const restaurants = {
  'Operator25 Melbourne': {
    dishes: ['韩式烤牛肉塔可 · Beef Bulgogi Taco', '软壳蟹煎蛋卷 · Soft Shell Crab Omelette', '四川麻辣焗豆烤蛋 · Spicy Mala Baked Eggs', '紫薯华夫饼 · Ube Waffle'],
    sourceRows: [43]
  },
  'Overlay Coffee Melbourne': {
    dishes: ['花生奶油拿铁 · Peanut Cream Latte', '花生奶油冷萃 · Peanut Cream Cold Brew', '花生奶油抹茶 · Peanut Cream Matcha', '花生奶油黑咖啡 · Peanut Cream Long Black'], sourceRows: [51]
  },
  'Max on Hardware Melbourne': {
    dishes: ['五花肉 · Pork Belly', '海鲜烩饭 · Seafood Paella', '炭烤袋鼠肉 · Char Grill Kangaroo', '披萨 · Meat Lover / Queen Margherita', '提拉米苏 · Tiramisu'],
    earlierGuide: true, sourceRows: [71]
  },
  'Palermo Melbourne': {
    dishes: ['眼肉牛排 · Ojo de Bife', '脆土豆 · Papas', '佛卡夏面包 · Focaccia', '嫩茎西兰花 · Broccolini', '生牛肉塔塔 · Tartar', '提拉米苏 · Tiramisu', '焦糖布丁 · Flan'],
    sourceRows: [149]
  },
  'Apollo Bay Victoria': {
    dishes: ["Fishermen’s Co-operative · 海鲜拼盘 单人 35 / 双人 65 AUD · 炸鱿鱼、炸鳕鱼、煎扇贝、薯条与沙拉（原表标注偏油炸）", 'Seafood Café · 混合海鲜意面 Marinara Linguine 25 AUD · 2 扇贝、2 大虾仁、4 青口，番茄底，原表强推', "George’s · 牛肉汉堡与炸鱼薯条 共约 30 AUD（原表标注偏油炸）", 'Dooley’s · 巧克力／百香果／莓果冰淇淋 6.9 AUD 单球 / 10.5 AUD 双球 · 店员推荐口味'],
    sourceRows: [178,179,180,181]
  },
  // 原表第 68、71 行：三家备选按当日位置、排队与营业情况现场选择，均未预约。
  // 企鹅场次尚未约到；约到后晚餐再围绕场次安排。原 Max 19:00 晚餐已取消，改为 9/27 午餐。
  'St Kilda Beach Melbourne': {
    dishes: ['Republica St Kilda Beach · 海滩边餐吧', "McDonald’s · 就近快餐，排队与时间最省", 'Donovans · 海滩正餐，想坐下吃再考虑'],
    sourceLabel: '原表 St Kilda 晚餐备选 · 三家都未预约，当天现场决定',
    sourceRows: [68,71]
  },
  // 9/28 返城后原表注明「自行解决、不固定餐厅、不赶预约」；这两家只是原表记录的备选，不构成安排。
  'Melbourne CBD': {
    dishes: ['BBQ King · 韩式自助烤肉 · 午市 39.9 / 晚市 49.9 AUD，现金再 5% off · 12:00–16:00、16:30–01:00，酒店附近', 'Chickorea · 韩式炸鸡 Cheese Bling／Cream Onion（原表标注后者更好）· 半份 26 / 整份 42 AUD · 17:00–22:00，维妈附近'],
    sourceRows: [190,192]
  },
  'Hello Auntie Darling Square': {
    dishes: ['生牛肉塔塔 · Beef Tartare', '越南春卷组合 · Rice Paper Roll Kit', '鸭肉意面 · Epic Duck Ragu', '越南咖啡甜点 · Viet Coffee Trifle'],
    earlierGuide: true, sourceRows: [277]
  },
  'Kiama NSW': {
    dishes: ["Chicko’s · 炸鸡（卧龙岗午餐备选）"], sourceRows: [308]
  },
  "Bar Totti's Sydney": {
    dishes: ['柴火烤饼 · Wood Fired Bread', '布拉塔奶酪 · Burrata', '蜜瓜 · Melon', '熟成火腿 · Prosciutto', '辣味乳清奶酪 · Ricotta', '提拉米苏 · Tiramisu', '虾仁意面 · Gnocchetti, Prawn, Garlic Shoot, Prosciutto'], sourceRows: [357]
  },
  'Rockpool Bar & Grill Sydney': {
    dishes: ['干式熟成菲力 · M9+ Fillet', '西冷牛排 · M8+ Sirloin', '带骨肋眼 · Rib Eye on the Bone', '肋眼牛排 · Eye of Scotch', '炙烤无花果、奶酪与火腿 · Wood Fire Grilled Figs', '焦糖布丁 · Crème Caramel'], sourceRows: [448]
  }
}

export function restaurantFor(event) {
  if (event?.type !== 'food') return null
  const personal = userByEvent[event.id]
  if (personal) return personal
  const base = restaurants[event.place]
  const extra = researchByPlace[event.place]
  if (!base && !extra) return null
  return {...base, photos:extra?.photos||base?.photos||[], additionalDishes:extra?.additionalDishes||[], recommendationNote:extra?.recommendationNote||base?.recommendationNote}
}
