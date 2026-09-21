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
    dishes: ["Fishermen’s Co-operative · 海鲜拼盘（单人／双人）", 'Seafood Café · 混合海鲜意面 Marinara Linguine', 'Dooley’s · 巧克力／百香果／莓果冰淇淋'],
    sourceRows: [178,179,180]
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
  return {...base, photos:extra?.photos||base?.photos||[], additionalDishes:extra?.additionalDishes||[]}
}
