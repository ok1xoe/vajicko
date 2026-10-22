// Test v Node bez prohlížeče: stavy hry, žádné NaN, bot dohraje celou hru (skutečné vstupy do hry), screenshoty.
// Použití: node tools/test.js [adresář pro PNG]
const path = require('path');
const fs = require('fs');
const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const nav = require('./nav.js');
const base = path.join(__dirname, '..');
const outDir = process.argv[2] || '/tmp';
fs.mkdirSync(outDir, { recursive: true });
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('CHYBA: ' + msg); } else { console.log('ok: ' + msg); } };

const g = H.load([base + '/js/speccy.js', base + '/js/world.js', base + '/js/game.js']);
const Z = g.Z, GAME = g.sandbox.GAME;
ok(!!GAME, 'GAME je zpřístupněno');

// ---- title -> play
g.step(60);
ok(GAME.mode === 'title', 'start na titulní obrazovce');
g.png(outDir + '/title.png', 3);
g.press('fire'); g.step(2); g.release('fire');
ok(GAME.mode === 'play', 'title -> play');
g.step(30);
g.png(outDir + '/play_ves1.png', 3);

const KEYS = ['left', 'right', 'up', 'down', 'fire'];
const held = {};
function setKeys(want) {
    KEYS.forEach(k => {
        if (want[k] && !held[k]) { g.press(k); held[k] = true; }
        if (!want[k] && held[k]) { g.release(k); held[k] = false; }
    });
}
function releaseAll() { setKeys({}); }
function tickInput(I) {
    setKeys({ left: I.dx < 0, right: I.dx > 0, up: I.u, down: I.d, fire: I.j });
    g.step(1);
}
let totalTicks = 0;
function waitPlay() {
    let n = 0;
    while (GAME.mode === 'dying' && n++ < 500) { g.step(1); }
}
function act() { releaseAll(); g.step(1); g.press('alt'); g.step(1); g.release('alt'); g.step(1); }

function goTo(name, goal) {
    for (let attempt = 0; attempt < 8; attempt++) {
        waitPlay();
        if (GAME.mode !== 'play') { return false; }
        releaseAll(); g.step(1);
        const S = GAME.S;
        if (goal(S.room, S.P)) { return true; }
        const r = nav.search(S.room, S.P, S.flags, goal);
        if (!r.path) { console.log('  bot: cesta k cíli "' + name + '" neexistuje (z ' + S.room + ')'); return false; }
        const t0 = S.t;
        for (const I of r.path) {
            tickInput(I); totalTicks++;
            if (GAME.mode !== 'play') { break; }
        }
        releaseAll(); g.step(1);
        waitPlay();
        if (GAME.mode === 'won') { return true; }
        if (GAME.mode === 'play' && goal(GAME.S.room, GAME.S.P)) { return true; }
        console.log('  bot: pokus ' + (attempt + 1) + ' k "' + name + '" přerušen (smrt/odchylka), nová cesta');
    }
    return false;
}
const near = (room, P, it) => room === it.room && P.m === 'g' && GAME.rectsHit(P.x - 3, P.y - 3, 14, 20, it.x, it.y, 8, 8);
function findItem(t) {
    const S = GAME.S;
    for (const id of Object.keys(S.items)) { const it = S.items[id].find(x => x.t === t); if (it) { return { room: id, x: it.x, y: it.y }; } }
    return null;
}
function pick(t) {
    const it = findItem(t);
    ok(!!it, 'předmět ' + t + ' leží ve světě (' + (it && it.room) + ')');
    if (!it) { return; }
    ok(goTo('sebrat ' + t, (room, P) => near(room, P, it)), 'bot došel k předmětu ' + t);
    act();
    ok(GAME.S.inv.indexOf(t) >= 0, 'předmět ' + t + ' je v inventáři: ' + GAME.S.inv.join(','));
}
function useAt(room, tgId, flag) {
    const tg = W().ROOMS[room].tg.find(x => x.id === tgId);
    ok(goTo('použít ' + tgId, (r, P) => r === room && P.m === 'g' && GAME.nearRect(P, tg.r)), 'bot došel k místu ' + tgId);
    const before = GAME.S.inv.length;
    act();
    ok(GAME.S.flags[flag] === true && GAME.S.inv.length === before - 1, 'předmět použit, příznak ' + flag);
}
function W() { return GAME.W; }

// ---- celá hra botem
const plan0 = Date.now();
pick('kamen');
const S = GAME.S;
ok(goTo('tlačítko', (r, P) => r === 'jes2' && P.m === 'g' && P.y + 14 === 176 && P.x + 4 >= 90 && P.x + 4 <= 102), 'bot došel na tlačítko');
g.png(outDir + '/play_jes2.png', 3);
act();
ok(S.flags.gate === true, 'kámen na tlačítku otevřel mříž');
ok(S.inv.length === 0, 'kámen vypuštěn z inventáře');
pick('stribrnak');
pick('klic');
pick('zebrik');
ok(S.inv.length === 3, 'inventář má 3 předměty (maximum)');
// plný inventář: houba se nesmí sebrat
{
    const it = findItem('houba');
    goTo('houba', (room, P) => near(room, P, it));
    act();
    ok(S.inv.indexOf('houba') < 0 && S.inv.length === 3, 'čtvrtý předmět nejde sebrat (max 3)');
}
useAt('ves3', 'prevoz', 'ferry');
g.png(outDir + '/play_ves3.png', 3);
useAt('hrad2', 'zebrik', 'zebrik');
useAt('hrad3', 'dvere', 'klic');
ok(goTo('kuřátko', (r, P) => r === 'hrad6' && P.m === 'g' && P.x >= 172 && P.x <= 190), 'bot došel ke Kuřátku');
ok(S.rescued === true, 'Kuřátko zachráněno');
g.png(outDir + '/play_hrad6.png', 3);
ok(goTo('poklad', (r, P) => r === 'hrad6' && P.m === 'g' && P.x >= 212 && P.x <= 226), 'bot došel k pokladu');
ok(S.treasure === true, 'poklad nalezen');
ok(!g.hasNaN(S), 'stav hry bez NaN');
goTo('domů', (r) => r === 'ves1');
waitPlay(); g.step(5);
ok(GAME.mode === 'won', 'návrat domů s Kuřátkem = výhra (mince ' + S.coins + ', skóre ' + S.final + ', ticků ' + S.t + ')');
console.log('Bot: ' + totalTicks + ' vstupních ticků, ' + ((Date.now() - plan0) / 1000).toFixed(1) + ' s reálně');
g.png(outDir + '/won.png', 3);
ok(Z.hi.get('vajicko') === S.final, 'rekord uložen');
g.step(120); g.press('fire'); g.step(2); g.release('fire'); g.step(2);
ok(GAME.mode === 'title', 'won -> title');

// ---- smrt a konec hry
g.press('fire'); g.step(2); g.release('fire'); g.step(2);
ok(GAME.mode === 'play', 'nová hra');
{
    const S2 = GAME.S;
    // vlezeme do trnů na návsi ves2 (teleport)
    S2.room = 'ves2'; GAME.rebuild(); S2.P.x = 12 * 8; S2.P.y = 176 - 14; S2.P.m = 'g'; S2.rp = { x: 20, y: 162, m: 'g', p: 0, d: 0, f: 1, sa: false };
    g.step(2);
    ok(GAME.mode === 'dying', 'trny zabíjejí (play -> dying)');
    g.png(outDir + '/dying.png', 3);
    g.step(80);
    ok(GAME.mode === 'play' && S2.lives === 2, 'respawn po smrti, životy 2');
    ok(S2.P.x === 20, 'respawn na místě vstupu do místnosti');
    S2.lives = 1; S2.P.x = 12 * 8; S2.P.y = 162; S2.invul = 0; g.step(2);
    g.step(100);
    ok(GAME.mode === 'over', 'poslední život -> over');
    g.png(outDir + '/over.png', 3);
    g.step(110); g.press('fire'); g.step(2); g.release('fire'); g.step(2);
    ok(GAME.mode === 'title', 'over -> title');
}
// ---- energie: nepřítel ubírá energii
g.press('fire'); g.step(2); g.release('fire'); g.step(2);
{
    const S3 = GAME.S;
    S3.room = 'les3'; GAME.rebuild();
    const e = S3.room && GAME.W.ROOMS.les3.en[0];
    S3.P.x = e.x; S3.P.y = 100; S3.P.m = 'a'; S3.P.p = 12;
    // postavíme hráče přímo do pavouka
    for (let i = 0; i < 400 && S3.energy === 3; i++) { const o = GAME.enemyPos(e, S3.t); S3.P.x = o.x; S3.P.y = o.y - 3; S3.P.m = 'g'; g.step(1); }
    ok(S3.energy < 3 || GAME.mode === 'dying', 'nepřítel ubírá energii');
}
// ---- screenshoty všech místností (vizuální kontrola)
const ids = Object.keys(GAME.W.ROOMS);
g.press('fire'); g.step(2); g.release('fire');
for (let k = 0; k < 4; k++) {
    // jen několik reprezentativních
}
['ves3', 'les3', 'jes4', 'hrad2', 'hrad6', 'hrad4'].forEach(id => {
    const S4 = GAME.S;
    if (GAME.mode !== 'play') { g.step(100); if (GAME.mode === 'title') { g.press('fire'); g.step(2); g.release('fire'); } }
    S4.room = id; GAME.rebuild(); S4.flags = { gate: true, ferry: false, zebrik: id === 'hrad2', klic: false };
    GAME.rebuild();
    S4.P.x = 100; S4.P.y = 162; S4.P.m = 'g'; S4.invul = 1000; S4.msgT = 0;
    g.step(20);
    g.png(outDir + '/room_' + id + '.png', 3);
});
ok(!g.hasNaN(GAME.S), 'stav bez NaN (konec)');
console.log(fails ? 'SELHÁNÍ: ' + fails : 'VŠE V POŘÁDKU');
process.exit(fails ? 1 : 0);
