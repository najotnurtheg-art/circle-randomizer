// app/api/_lib/segments.js

// Weight map as requested:
// normal = 10, 2x harder = 5, 3x harder = 3, 5x harder = 2
export const WEIGHTS = {
  NORMAL: 10,
  HARDER_2X: 5,
  HARDER_3X: 3,
  HARDER_5X: 2,
};

function pickTwoRandom(arr) {
  if (arr.length <= 2) return arr.slice(0, 2);
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * (arr.length - 1));
  if (j >= i) j++;
  return [arr[i], arr[j]];
}

// return flat array of segments and a single resultIndex chosen by weights
export function buildWheelFromItemsByTier({ t50, t100, t200, t500 }, wager) {
  const segs = [];
  const weights = [];

  const pushItem = (it, w) => {
    segs.push({ type: 'item', id: it.id, name: it.name, imageUrl: it.imageUrl || null });
    weights.push(w);
  };
  const pushCoins = (amount, w) => {
    segs.push({ type: 'coins', amount });
    weights.push(w);
  };
  const pushRespin = (w) => {
    segs.push({ type: 'respin' });
    weights.push(w);
  };

  if (wager === 50) {
    // all items that cost 50 coin - normal
    t50.forEach(it => pushItem(it, WEIGHTS.NORMAL));

    // 2 items that cost 100 coin - 3x harder
    pickTwoRandom(t100).forEach(it => pushItem(it, WEIGHTS.HARDER_3X));

    // +75 coins - 2x harder
    pushCoins(75, WEIGHTS.HARDER_2X);

    // another spin - normal
    pushRespin(WEIGHTS.NORMAL);

  } else if (wager === 100) {
    // all items that cost 100 coin - normal
    t100.forEach(it => pushItem(it, WEIGHTS.NORMAL));

    // 2 items that cost 200 coin - 3x harder
    pickTwoRandom(t200).forEach(it => pushItem(it, WEIGHTS.HARDER_3X));

    // 2 items that cost 50 coin - 3x harder
    pickTwoRandom(t50).forEach(it => pushItem(it, WEIGHTS.HARDER_3X));

    // +150 coins - 2x harder
    pushCoins(150, WEIGHTS.HARDER_2X);

    // another spin - normal
    pushRespin(WEIGHTS.NORMAL);

  } else if (wager === 200) {
    // all items that cost 200 coin - normal
    t200.forEach(it => pushItem(it, WEIGHTS.NORMAL));

    // 2 items that cost 500 coin - 5x harder
    pickTwoRandom(t500).forEach(it => pushItem(it, WEIGHTS.HARDER_5X));

    // 2 items that cost 100 coin - 2x harder
    pickTwoRandom(t100).forEach(it => pushItem(it, WEIGHTS.HARDER_2X));

    // +300 coins - 3x harder
    pushCoins(300, WEIGHTS.HARDER_3X);

    // another spin - normal
    pushRespin(WEIGHTS.NORMAL);

  } else {
    // fallback to 50-spin behavior
    return buildWheelFromItemsByTier({ t50, t100, t200, t500 }, 50);
  }

  // choose a resultIndex by weights
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let resultIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) { resultIndex = i; break; }
    r -= weights[i];
  }

  const reward = segs[resultIndex];
  return { segments: segs, resultIndex, reward };
}
