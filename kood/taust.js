// Taustamahud: lihtsad suletud majad kauguse varjamiseks, ilma sisemuseta.
// Peahooneid on kaks: H1 ja H2.
import { plaanikast, cyl, rng } from './abifunktsioonid.js';

// [X0, X1, Y0, Y1, kõrgus, materjal]
const BOXES = [
  [-45.5, -31.9, 6.2, 20.0, 13, 'bg'],      // 10 cm N1 lääneseinast, et aknaraamide pinnad ei kattuks.
  [-60, -46.5, 3.8, 18, 10, 'tumeTaust'],
  [-76, -63, -2, 14, 15, 'bg'],
  [-24.6, -16, 32.3, 44, 22, 'bg'],
  [-31.5, -25.2, 8, 29.5, 13, 'tumeTaust'],
  [-15, 0.2, 24.3, 32, 16, 'heleTaust'],   // Pargist põhjas; park ulatub piki H1 sügavusse.
  [-8, 3, 30.5, 44, 12, 'tumeTaust'],
  [-24, -9, 30.5, 46, 9, 'tumeTaust'],
  [-44, -28.8, -18, -4.8, 11, 'bg'],
  [-58, -45, -20, -8.2, 9, 'tumeTaust'],
  [-64.5, -58.6, -22, -10.3, 10, 'bg'],
  [-76, -65, -26, -14.2, 12, 'bg'],
  [-28, -6, -32, -23, 18, 'bg'],          // Pööratud H2 taga.
  [-4.0, 2.0, -27, -22.5, 14, 'heleTaust'],
  [-5.5, 3.4, -36, -24.4, 12, 'bg'],
  [-20, -6.5, -44, -31.6, 15, 'tumeTaust'],
];
// Kauged kõrghooned on udus vaevu nähtavad.
// Idapoolsed kõrghooned asuvad puudesalust kaugemal, et aknad ei kumaks tüvede vahelt liiga eredalt.
const TOWERS = [[104, 122, -30, -10, 64], [60, 74, 52, 66, 52], [-70, -54, 40, 56, 58], [-40, -26, -70, -56, 46], [110, 126, 22, 38, 80]];

export function looTaust(B, ctx) {
  const R = rng(4242);
  for (const [X0, X1, Y0, Y1, H, mat] of BOXES) {
    ctx.col.box(X0, X1, Y0, Y1, H, 'background');
    B.add(mat, plaanikast(X0, X1, Y0, Y1, 0, H, { faces: 'NSEW' }));
    B.add('tumeBetoon', plaanikast(X0, X1, Y0, Y1, H - 0.02, H, { faces: 'T' }));
    const t = 0.2, p = 0.9;
    B.add('betoon', plaanikast(X0, X1, Y0, Y0 + t, H, H + p, { faces: 'NSEWT' }));
    B.add('betoon', plaanikast(X0, X1, Y1 - t, Y1, H, H + p, { faces: 'NSEWT' }));
    B.add('betoon', plaanikast(X0, X0 + t, Y0 + t, Y1 - t, H, H + p, { faces: 'EWT' }));
    B.add('betoon', plaanikast(X1 - t, X1, Y0 + t, Y1 - t, H, H + p, { faces: 'EWT' }));
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const w = 1.6 + R() * 3, d = 1.6 + R() * 3, hh = 1.2 + R() * 2.2;
      const x = X0 + 1 + R() * Math.max(0.1, X1 - X0 - 2 - w), y = Y0 + 1 + R() * Math.max(0.1, Y1 - Y0 - 2 - d);
      B.add('betoon', plaanikast(x, x + w, y, y + d, H, H + hh, { faces: 'NSEWT' }));
    }
    if (R() < 0.45) {
      const x = X0 + 2 + R() * Math.max(0.1, X1 - X0 - 4), y = Y0 + 2 + R() * Math.max(0.1, Y1 - Y0 - 4);
      B.add('hallMetall', cyl(x, y, H + 0.6, 0.9, 0.9, 1.6, 12));
      B.add('hallMetall', plaanikast(x - 0.8, x + 0.8, y - 0.8, y + 0.8, H, H + 0.6, { faces: 'NSEW' }));
    }
  }
  for (const [X0, X1, Y0, Y1, H] of TOWERS) {
    B.add('tumeTaust', plaanikast(X0, X1, Y0, Y1, 0, H, { faces: 'NSEW' }));
    B.add('tumeBetoon', plaanikast(X0, X1, Y0, Y1, H - 0.02, H, { faces: 'T' }));
  }
}
