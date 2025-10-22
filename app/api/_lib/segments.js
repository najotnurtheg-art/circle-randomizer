// app/api/_lib/segments.js
import { prisma } from '@/app/lib/prisma';

const TIER = {
  50: 'T50',
  100: 'T100',
  200: 'T200',
  500: 'T500',
};

function pickN(arr, n) {
  if (!arr.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  return out;
}

export async function buildSegmentsForWager(wager) {
  const [t50, t100, t200, t500] = await Promise.all([
    prisma.item.findMany({ where: { tier: 'T50',  isActive: true }, orderBy:{createdAt:'asc'} }),
    prisma.item.findMany({ where: { tier: 'T100', isActive: true }, orderBy:{createdAt:'asc'} }),
    prisma.item.findMany({ where: { tier: 'T200', isActive: true }, orderBy:{createdAt:'asc'} }),
    prisma.item.findMany({ where: { tier: 'T500', isActive: true }, orderBy:{createdAt:'asc'} }),
  ]);

  const segments = [];

  const pushItem = (item, weight) => {
    segments.push({
      type: 'item',
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl || null,
      tier: item.tier,
      weight
    });
  };
  const pushCoins = (amount, weight) => {
    segments.push({ type:'coins', amount, weight });
  };
  const pushRespin = (weight) => {
    segments.push({ type:'respin', weight });
  };

  // weights
  const W = { normal:10, x2:5, x3:3, x5:2 };

  if (wager === 50) {
    t50.forEach(it => pushItem(it, W.normal));
    pickN(t100, 2).forEach(it => pushItem(it, W.x3)); // 3x harder
    pushCoins(75, W.x2);  // 2x harder
    pushRespin(W.normal);
  } else if (wager === 100) {
    t100.forEach(it => pushItem(it, W.normal));
    pickN(t200, 2).forEach(it => pushItem(it, W.x3)); // 3x harder
    pickN(t50,  2).forEach(it => pushItem(it, W.x3)); // 3x harder
    pushCoins(150, W.x2); // 2x harder
    pushRespin(W.normal);
  } else if (wager === 200) {
    t200.forEach(it => pushItem(it, W.normal));
    pickN(t500, 2).forEach(it => pushItem(it, W.x5)); // 5x harder
    pickN(t100, 2).forEach(it => pushItem(it, W.x2)); // 2x harder
    pushCoins(300, W.x3); // 3x harder
    pushRespin(W.normal);
  } else {
    // default to 50 if something odd is sent
    t50.forEach(it => pushItem(it, W.normal));
    pushRespin(W.normal);
  }

  // make a deterministic label array for drawing the wheel
  const drawSegments = segments.map(s => {
    if (s.type === 'item') return { type:'item', name:s.name, imageUrl:s.imageUrl };
    if (s.type === 'coins') return { type:'coins', amount:s.amount };
    return { type:'respin' };
  });

  return { weighted: segments, drawSegments };
}

export function chooseWeightedIndex(weighted) {
  const total = weighted.reduce((a,s)=>a + (s.weight||0), 0);
  let r = Math.random() * total;
  for (let i=0;i<weighted.length;i++) {
    r -= weighted[i].weight || 0;
    if (r <= 0) return i;
  }
  return weighted.length - 1;
}

export function prizeText(seg) {
  if (seg.type === 'item')  return seg.name;
  if (seg.type === 'coins') return `+${seg.amount} coins`;
  return 'Another spin';
}
