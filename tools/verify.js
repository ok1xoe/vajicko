// Ověření světa: konzistence dat a dosažitelnost obrazovek, předmětů, mincí a cílů se skutečnou fyzikou.
const { W, search, grid, clone } = require('./nav.js');
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('CHYBA: ' + msg); } };
const ids = Object.keys(W.ROOMS);
console.log('Počet místností:', ids.length);
ok(ids.length >= 24, 'málo místností');

// 1) konzistence odkazů
const opp = { L: 'R', R: 'L', U: 'D', D: 'U' };
ids.forEach(id => {
    const R = W.ROOMS[id];
    ['L', 'R', 'U', 'D'].forEach(d => {
        if (!R[d]) { return; }
        ok(W.ROOMS[R[d]], id + ' odkazuje na neexistující ' + R[d]);
        ok(W.ROOMS[R[d]] && W.ROOMS[R[d]][opp[d]] === id, id + '.' + d + ' není vzájemný odkaz');
    });
    (R.co || []).forEach(q => ok(q[0] >= 0 && q[0] < 32 && q[1] >= 0 && q[1] < 22, id + ' mince mimo'));
    (R.it || []).forEach(q => ok(q.c >= 0 && q.c < 32 && q.r >= 0 && q.r < 22, id + ' předmět mimo'));
});

// 2) předměty/mince nesmí ležet v pevné buňce, předměty musí mít oporu
ids.forEach(id => {
    const G = grid(id, { ferry: 1, gate: 1, zebrik: 1, klic: 1 });
    const G0 = grid(id, {});
    const R = W.ROOMS[id];
    (R.it || []).forEach(q => {
        ok(G0.g[q.r][q.c] === '.', id + ' předmět ' + q.t + ' v buňce ' + G0.g[q.r][q.c]);
        ok(G0.g[q.r + 1][q.c] === '#', id + ' předmět ' + q.t + ' nemá oporu');
    });
    (R.co || []).forEach(q => ok(G.g[q[1]][q[0]] === '.', id + ' mince (' + q + ') v pevné buňce'));
});

// 3) dosažitelnost: BFS od startu s různými příznaky
const start = { x: W.START.x, y: W.START.y, m: 'g', p: 0, d: 0, f: 1, sa: false };
function reach(flags, from) {
    const r = search(from ? from.room : W.START.room, from ? from.P : start, flags, null);
    const rooms = new Set(); r.nodes.forEach(n => rooms.add(n.room));
    const touched = {}; r.seen.forEach(s => { (touched[s[0]] = touched[s[0]] || new Set()).add(s[1] + ',' + s[2]); });
    return { rooms, nodes: r.nodes, touched };
}
const hit = (R, touched, rx, ry, rw, rh) => {
    for (const s of (touched[R] || [])) {
        const [x, y] = s.split(',').map(Number);
        if (x < rx + rw && x + W.PW > rx && y < ry + rh && y + W.PH > ry) { return true; }
    }
    return false;
};
const stages = [
    ['bez příznaků', {}],
    ['po otevření mříže', { gate: true }],
    ['po přívozu', { gate: true, ferry: true }],
    ['po žebříku', { gate: true, ferry: true, zebrik: true }],
    ['po otevření dveří', { gate: true, ferry: true, zebrik: true, klic: true }]
];
let prev = new Set();
const full = reach(stages[4][1]);
stages.forEach(([name, fl]) => {
    const r = reach(fl);
    const list = [...r.rooms];
    console.log(name + ': ' + list.length + ' místností');
    prev.forEach(x => ok(r.rooms.has(x), 'ztráta dosažitelnosti ' + x));
    prev = r.rooms;
});
console.log('Nedosažitelné při všech příznacích:', ids.filter(i => !full.rooms.has(i)).join(',') || 'žádné');
ids.forEach(i => ok(full.rooms.has(i), 'nedosažitelná místnost ' + i));

// bez příznaků nesmí jít za řeku / mříž apod.
const r0 = reach({});
['ves4', 'hrad1', 'hrad3', 'hrad4', 'jes4', 'jes5', 'hrad6'].forEach(i => ok(!r0.rooms.has(i), i + ' by měla být bez příznaků nedosažitelná'));
['ves1', 'ves2', 'ves3', 'ves5', 'les1', 'les2', 'les3', 'les4', 'les5', 'les6', 'jes1', 'jes2', 'jes3', 'jes6'].forEach(i => ok(r0.rooms.has(i), i + ' měla být bez příznaků dosažitelná'));
const rF = reach({ gate: true, ferry: true });
ok(rF.rooms.has('hrad2') && !rF.rooms.has('hrad3'), 'za přívozem má být zeď (hrad3 nedosažitelná bez žebříku)');
const rZ = reach({ gate: true, ferry: true, zebrik: true });
ok(rZ.rooms.has('hrad3') && !rZ.rooms.has('hrad4'), 'za zdí mají být zamčené dveře');

// předměty, mince, příznaky: všechno dosažitelné z plného stavu; předměty i bez příznaků (kámen, žebřík)
ids.forEach(id => {
    const R = W.ROOMS[id];
    (R.co || []).forEach((q, k) => ok(hit(id, full.touched, q[0] * 8, 16 + q[1] * 8, 8, 8), id + ' mince #' + k + ' ' + q + ' nedosažitelná'));
    (R.it || []).forEach(q => ok(hit(id, full.touched, q.c * 8 - 3, 16 + q.r * 8 - 3, 14, 14), id + ' předmět ' + q.t + ' nedosažitelný'));
});
// přímé předměty bez příznaků
[['les2', 'kamen'], ['les3', 'zebrik']].forEach(([id, t]) => {
    const q = W.ROOMS[id].it.find(x => x.t === t);
    ok(hit(id, r0.touched, q.c * 8 - 3, 16 + q.r * 8 - 3, 14, 14), t + ' by měl jít sebrat bez příznaků');
});
// cílová místnost a návrat
const f6 = [...full.nodes.values()].find(n => n.room === 'hrad6');
ok(!!f6, 'hrad6 nedosažitelná');
const back = search('hrad6', f6.P, stages[4][1], (room) => room === 'ves1');
ok(!!back.path, 'zpáteční cesta z věže na náves neexistuje');
console.log('Zpáteční cesta z věže: ' + (back.path ? back.path.length + ' ticků' : 'NENÍ'));
console.log(fails ? 'SELHÁNÍ: ' + fails : 'VŠE V POŘÁDKU');
process.exit(fails ? 1 : 0);
