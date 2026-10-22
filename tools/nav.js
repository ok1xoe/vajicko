// Hledání cest ve světě hry se skutečnou fyzikou (js/world.js): BFS přes stavy (místnost, x, y, režim).
// Hrana = posloupnost vstupů po jednotlivých ticích. Nepřátelé se zde nezohledňují (jen terén a pasti).
const path = require('path');
require(path.join(__dirname, '..', 'js', 'world.js'));
const W = globalThis.WORLD;

const gridCache = new Map();
function grid(room, flags) {
    const k = room + '|' + Object.keys(flags).filter(f => flags[f]).sort().join(',');
    if (!gridCache.has(k)) { gridCache.set(k, W.buildGrid(room, flags)); }
    return gridCache.get(k);
}
const clone = P => ({ x: P.x, y: P.y, m: P.m, p: P.p, d: P.d, f: P.f, sa: P.sa });
const key = (room, P) => room + '|' + P.x + '|' + P.y + '|' + P.m;

// stejné přechody jako ve hře (transition v game.js)
function transit(room, P, ev, flags) {
    const G = grid(room, flags), to = G[ev];
    if (!to) { return null; }
    if (ev === 'L') { P.x = 246; } else if (ev === 'R') { P.x = 2; }
    else if (ev === 'U') { P.y = 192 - W.PH; P.m = 'l'; }
    else if (ev === 'D') { P.y = W.TOP; if (P.m !== 'a') { P.m = 'l'; } }
    return to;
}

// Provede jeden vstup a dosimuluje vzduch do přistání. Vrací {room, P, inputs, seen} nebo null (smrt).
// extra = pole vstupů po prvním ticku (např. držení směru), seen = pole {room,x,y} navštívených poloh.
function run(room, P0, firstInputs, flags, seen, hold) {
    let P = clone(P0), inputs = [], r = room;
    const pushSeen = () => { if (seen) { seen.push([r, P.x, P.y]); } };
    function tick(I) {
        const G = grid(r, flags);
        inputs.push(I);
        const ev = W.step(P, I, G);
        pushSeen();
        if (ev === 'dead') { return 'dead'; }
        if (ev) { const to = transit(r, P, ev, flags); if (!to) { return 'dead'; } r = to; pushSeen(); }
        return null;
    }
    for (const I of firstInputs) { if (tick(I) === 'dead') { return null; } }
    let guard = 0;
    while (P.m === 'a' && guard++ < 300) {
        if (tick({ dx: hold, u: 0, d: 0, j: 0 }) === 'dead') { return null; }
    }
    if (P.m === 'a') { return null; }
    return { room: r, P, inputs };
}

function neighbors(room, P, flags, seen) {
    const G = grid(room, flags), out = [];
    const add = res => { if (res) { out.push(res); } };
    const I0 = (dx, u, d, j) => ({ dx, u: u ? 1 : 0, d: d ? 1 : 0, j: j ? 1 : 0 });
    if (P.m === 'g') {
        for (const dx of [-1, 1]) { add(run(room, P, [I0(dx, 0, 0, 0)], flags, seen, dx)); }
        if (W.canGrab(P, G, true, false)) { add(run(room, P, [I0(0, 1, 0, 0)], flags, seen, 0)); }
        if (W.canGrab(P, G, false, true)) { add(run(room, P, [I0(0, 0, 1, 0)], flags, seen, 0)); }
    } else {
        for (const dx of [-1, 1]) { add(run(room, P, [I0(dx, 0, 0, 0)], flags, seen, dx)); }
        add(run(room, P, [I0(0, 1, 0, 0)], flags, seen, 0));
        add(run(room, P, [I0(0, 0, 1, 0)], flags, seen, 0));
    }
    // skoky (z podlahy nebo ze žebříku) a chycení žebříku za letu
    for (const dx of [-1, 0, 1]) {
        let Q = clone(P), r = room, inputs = [I0(dx, 0, 0, 1)];
        let ev = W.step(Q, inputs[0], grid(r, flags));
        if (seen) { seen.push([r, Q.x, Q.y]); }
        let dead = ev === 'dead';
        if (ev && !dead) { const to = transit(r, Q, ev, flags); if (!to) { dead = true; } else { r = to; } }
        let n = 0;
        while (!dead && Q.m === 'a' && n++ < 300) {
            const Gc = grid(r, flags);
            if (W.canGrab(Q, Gc, true, false)) {
                const res = run(r, Q, [I0(dx, 1, 0, 0)], flags, seen, 0);
                if (res) { res.inputs = inputs.concat(res.inputs); out.push(res); }
            }
            const I = I0(dx, 0, 0, 0); inputs.push(I);
            ev = W.step(Q, I, Gc);
            if (seen) { seen.push([r, Q.x, Q.y]); }
            if (ev === 'dead') { dead = true; break; }
            if (ev) { const to = transit(r, Q, ev, flags); if (!to) { dead = true; break; } r = to; }
        }
        if (!dead && Q.m !== 'a') { out.push({ room: r, P: Q, inputs }); }
    }
    return out;
}

// BFS od startu; goal(room,P) => true ukončí hledání a vrátí cestu (pole vstupů)
function search(startRoom, startP, flags, goal) {
    const seen = [];
    const k0 = key(startRoom, startP);
    const par = new Map([[k0, null]]);
    const nodes = new Map([[k0, { room: startRoom, P: clone(startP) }]]);
    const q = [k0];
    for (let qi = 0; qi < q.length; qi++) {
        const k = q[qi], nd = nodes.get(k);
        if (goal && goal(nd.room, nd.P)) {
            const inputs = []; let c = k;
            while (par.get(c)) { const e = par.get(c); inputs.unshift(...e.inputs); c = e.from; }
            return { path: inputs, end: nd, nodes, seen };
        }
        for (const nb of neighbors(nd.room, nd.P, flags, seen)) {
            const nk = key(nb.room, nb.P);
            if (par.has(nk)) { continue; }
            par.set(nk, { from: k, inputs: nb.inputs });
            nodes.set(nk, { room: nb.room, P: nb.P });
            q.push(nk);
        }
    }
    return { path: null, nodes, seen };
}

module.exports = { W, search, grid, clone, key };
