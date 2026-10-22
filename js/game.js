// Vajíčko Dobrodruh – platformová adventura ve stylu Dizzy (ZX Spectrum). Logika, grafika a ovládání.
(function (root) {
    'use strict';

    var W = root.WORLD, ROOMS = W.ROOMS, T = W.T, TOP = W.TOP, PW = W.PW, PH = W.PH;
    var HI_KEY = 'vajicko';

    // ---------- Grafika (sprity jako pole řetězců)
    var PAL = { k: 0, w: 15, s: 7, S: 8, y: 14, Y: 6, r: 10, R: 2, g: 12, G: 4, b: 9, B: 1, c: 13, C: 5, m: 11, M: 3, n: 6, o: 14 };
    var ITEMS = {
        klic: ['..yyy...', '.y...y..', '.y...y..', '..yyy...', '...y....', '...yy...', '...y....', '...yy...'],
        kamen: ['........', '..ssss..', '.sswwss.', 'sswsssss', 'ssssssss', 'sssssSss', '.ssSSss.', '..SSSS..'],
        zebrik: ['n......n', 'nnnnnnnn', 'n......n', 'n......n', 'nnnnnnnn', 'n......n', 'n......n', 'nnnnnnnn'],
        stribrnak: ['..ssss..', '.swwwss.', 'swsssSss', 'swssSSss', 'swsSSsss', 'ssSSSsss', '.ssssss.', '..ssss..'],
        houba: ['..rrrr..', '.rwrrwr.', 'rrrrrrrr', 'rwrrrrwr', '..wwww..', '...ww...', '...ww...', '..wwww..']
    };
    var COINF = [
        ['..yyyy..', '.yYyyyy.', 'yYyyyyyy', 'yyyyyyYy', 'yyyyyyYy', 'yyyyyYyy', '.yyyyyy.', '..yyyy..'],
        ['...yy...', '..yYyy..', '..yYyy..', '..yyyy..', '..yyYy..', '..yyYy..', '..yyyy..', '...yy...']
    ];
    var ENEMY = {
        pavouk: [['m..mmmm..m', '.m.mmmm.m.', '..mmmmmm..', 'mmmwmmwmmm', '..mmmmmm..', '.m.mmmm.m.', 'm..m..m..m', 'm........m'],
                 ['.m.mmmm.m.', 'm..mmmm..m', '..mmmmmm..', 'mmmwmmwmmm', '..mmmmmm..', 'm..mmmm..m', '.m.m..m.m.', 'm........m']],
        netopyr: [['m........m', 'mm......mm', 'mmm.mm.mmm', 'mmmmmmmmmm', '.mmwmmwmm.', '..mmmmmm..', '...m..m...', '..........'].map(function (s) { return s.substr(0, 10); }),
                  ['..........', '..m....m..', '.mmmmmmmm.', 'mmmmmmmmmm', '.mmwmmwmm.', '..mmmmmm..', '...m..m...', '..........']],
        had: [['..........', '..gggg....', '.ggGGgg...', '.gwGwggg..', '..gggggggG', '...gGggggg', 'GGggggGGg.', '..GGGGG...'],
              ['..........', '..gggg....', '.ggGGgg...', '.gwGwggg..', '..ggggggg.', 'G..gGggggG', '.GgggggGg.', '..GGGGG...']],
        duch: [['..wwwwww..', '.wwwwwwww.', 'wwkwwwwkww', 'wwkwwwwkww', 'wwwwkkwwww', 'wwwwwwwwww', 'wwwwwwwwww', 'w.ww.ww.ww'],
               ['..wwwwww..', '.wwwwwwww.', 'wwkwwwwkww', 'wwkwwwwkww', 'wwwwkkwwww', 'wwwwwwwwww', 'wwwwwwwwww', '.ww.ww.ww.']]
    };
    var ENEMY_PAL = { m: 3, w: 15, k: 0, g: 12, G: 4 };
    var EW = 10, EH = 8;

    // Vejce 14x14 (vygenerované), rotace po 90° pro salto
    function makeEgg() {
        var rows = [], x, y;
        for (y = 0; y < 14; y++) {
            var s = '';
            for (x = 0; x < 14; x++) {
                var dx = (x - 6.5) / 6.4, dy = (y - 6.8) / 6.9;
                var narrow = y < 6 ? 0.78 + 0.22 * (y / 6) : 1;
                var e = dx * dx / (narrow * narrow) + dy * dy;
                var ch = '.';
                if (e <= 1.0) { ch = (e > 0.72 ? 'k' : (x > 8 && y > 3 ? 's' : 'w')); }
                s += ch;
            }
            rows.push(s.split(''));
        }
        function put(px, py, ch) { rows[py][px] = ch; }
        put(8, 4, 'k'); put(8, 5, 'k'); put(11, 4, 'k'); put(11, 5, 'k');           // oči
        put(9, 8, 'r'); put(10, 9, 'r'); put(11, 9, 'r'); put(8, 8, 'r');          // pusa
        put(3, 9, 'r'); put(3, 10, 'r'); put(12, 9, 'r');                          // rukavice
        put(4, 12, 'r'); put(5, 12, 'r'); put(8, 12, 'r'); put(9, 12, 'r'); put(4, 13, 'r'); put(5, 13, 'r'); put(8, 13, 'r'); put(9, 13, 'r');
        return rows.map(function (r) { return r.join(''); });
    }
    function rot90(rows) {
        var n = rows.length, out = [];
        for (var r = 0; r < n; r++) { var s = ''; for (var c = 0; c < n; c++) { s += rows[n - 1 - c].charAt(r); } out.push(s); }
        return out;
    }
    var EGG = [makeEgg()];
    EGG.push(rot90(EGG[0])); EGG.push(rot90(EGG[1])); EGG.push(rot90(EGG[2]));
    var EGGPAL = { w: 15, s: 7, k: 0, r: 10 };
    var HEART = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];

    // ---------- Stav hry
    var G = null;          // aktuální mřížka místnosti
    var S = null;          // stav hry
    var mode = 'title';    // title | play | dying | over | won
    var modeT = 0;
    var blink = 0;

    function copyP(P) { return { x: P.x, y: P.y, m: P.m, p: P.p, d: P.d, f: P.f, sa: P.sa }; }

    function newGame() {
        S = {
            room: W.START.room, P: { x: W.START.x, y: W.START.y, m: 'g', p: 0, d: 0, f: 1, sa: false },
            flags: {}, inv: [], sel: 0, items: {}, got: {}, coins: 0, treasure: false, rescued: false,
            energy: 3, lives: 3, invul: 0, t: 0, msg: null, msgT: 0, dt: 0, hist: [], score: 0, final: 0
        };
        Object.keys(ROOMS).forEach(function (id) {
            S.items[id] = (ROOMS[id].it || []).map(function (q) { return { t: q.t, x: q.c * T, y: TOP + q.r * T }; });
        });
        S.rp = copyP(S.P);
        G = W.buildGrid(S.room, S.flags);
        resetHist();
        mode = 'play'; modeT = 0;
        setMsg(['Najdi Kuřátko a vrať se s ním domů!'], 200);
    }

    function resetHist() { S.hist = []; for (var i = 0; i < 20; i++) { S.hist.push({ x: S.P.x, y: S.P.y }); } }
    function rebuild() { G = W.buildGrid(S.room, S.flags); }
    function setMsg(lines, t) { S.msg = lines; S.msgT = t || 120; }

    function loadRoom(id) {
        S.room = id; rebuild();
        S.rp = copyP(S.P);
        resetHist();
        if (S.rescued && id === W.START.room) { win(); }
    }

    function transition(ev) {
        var P = S.P, to = G[ev];
        if (!to) { return; }
        if (ev === 'L') { P.x = 246; } else if (ev === 'R') { P.x = 2; }
        else if (ev === 'U') { P.y = 192 - PH; P.m = 'l'; }
        else if (ev === 'D') { P.y = TOP; if (P.m !== 'a') { P.m = 'l'; } }
        loadRoom(to);
    }

    function win() {
        mode = 'won'; modeT = 0; Z.pauseOk = false;
        var secs = Math.floor(S.t / 50);
        S.final = S.coins * 100 + (S.treasure ? 500 : 0) + 1000 + Math.max(0, 900 - secs) * 5;
        S.hiv = Z.hi.submit(HI_KEY, S.final);
        Z.snd.win();
    }

    function die() {
        if (mode !== 'play') { return; }
        mode = 'dying'; modeT = 0; Z.snd.die();
    }

    function afterDeath() {
        S.lives--;
        if (S.lives <= 0) {
            mode = 'over'; modeT = 0; Z.pauseOk = false;
            S.final = S.coins * 100 + (S.treasure ? 500 : 0);
            S.hiv = Z.hi.submit(HI_KEY, S.final);
            Z.snd.over();
            return;
        }
        S.P = copyP(S.rp); S.energy = 3; S.invul = 120;
        resetHist(); mode = 'play'; modeT = 0;
    }

    // ---------- Nepřátelé
    function tri(t, a, b, sp) { var L = b - a; if (L <= 0) { return a; } var u = (t * sp) % (2 * L); return a + (u < L ? u : 2 * L - u); }
    function enemyPos(e, t) {
        var o = { x: 0, y: 0, fl: false };
        if (e.k === 'pavouk') { o.x = e.x; o.y = tri(t, e.y0, e.y1, e.sp); }
        else if (e.k === 'had') { o.x = tri(t, e.x0, e.x1, e.sp); o.y = 168; o.fl = tri(t + 1, e.x0, e.x1, e.sp) < o.x; }
        else { o.x = tri(t, e.x0, e.x1, e.sp); o.y = e.y + (e.k === 'duch' ? Math.sin(t / 14) * 8 : 0); o.fl = tri(t + 1, e.x0, e.x1, e.sp) < o.x; }
        return o;
    }

    // ---------- Pomocné
    function rectsHit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
    function nearRect(P, r, pad) {
        pad = pad === undefined ? 2 : pad;
        return rectsHit(P.x - pad, P.y - pad, PW + 2 * pad, PH + 2 * pad, r[0] * T, TOP + r[1] * T, r[2] * T, r[3] * T);
    }
    function itemNear(P) {
        var best = null, bd = 1e9;
        S.items[S.room].forEach(function (it) {
            if (rectsHit(P.x - 3, P.y - 3, PW + 6, PH + 6, it.x, it.y, 8, 8)) {
                var d = Math.abs(it.x - P.x) + Math.abs(it.y + 8 - P.y - PH);
                if (d < bd) { bd = d; best = it; }
            }
        });
        return best;
    }
    function findRest(P) {
        var cc = Math.floor((P.x + 4) / T), rr = Math.floor((P.y + PH - 1 - TOP) / T);
        for (; rr < 21; rr++) {
            var ch = W.cellAt(G, cc, rr);
            if (ch === 'W' || ch === 'S') { return null; }
            if (W.cellAt(G, cc, rr + 1) === '#' && ch !== '#') { return TOP + rr * T; }
        }
        return null;
    }

    function doAction() {
        var P = S.P, R = ROOMS[S.room], i;
        if (P.m !== 'g') { return; }
        var nearUnfinished = null;
        for (i = 0; R.tg && i < R.tg.length; i++) {
            var tg = R.tg[i];
            if (S.flags[tg.flag] || !nearRect(P, tg.r)) { continue; }
            var k = S.inv.indexOf(tg.item);
            if (k >= 0) {
                S.inv.splice(k, 1); if (S.sel >= S.inv.length) { S.sel = Math.max(0, S.inv.length - 1); }
                S.flags[tg.flag] = true; rebuild(); setMsg(tg.ok, 160); Z.snd.win(); S.score += 0; return;
            }
            nearUnfinished = tg;
        }
        var it = itemNear(P);
        if (it) {
            if (S.inv.length >= 3) { setMsg(['Máš plné ruce! (max. 3 předměty)', 'Něco polož (X).'], 120); Z.snd.hit(); return; }
            S.items[S.room].splice(S.items[S.room].indexOf(it), 1);
            S.inv.push(it.t); S.sel = S.inv.length - 1;
            setMsg(['Sebráno: ' + W.ITEM_NAMES[it.t]], 90); Z.snd.coin(); return;
        }
        if (nearUnfinished) { setMsg(nearUnfinished.hint, 120); Z.snd.hit(); return; }
        if (!S.inv.length) { setMsg(['Nic nenosíš.'], 60); return; }
        var y = findRest(P);
        if (y === null) { setMsg(['Sem to položit nejde.'], 60); Z.snd.hit(); return; }
        var t = S.inv.splice(S.sel, 1)[0];
        if (S.sel >= S.inv.length) { S.sel = Math.max(0, S.inv.length - 1); }
        S.items[S.room].push({ t: t, x: P.x, y: y });
        setMsg(['Položeno: ' + W.ITEM_NAMES[t]], 60); Z.snd.tick();
    }

    // ---------- Jeden tik hry
    function tickPlay() {
        var P = S.P, R = ROOMS[S.room], inp = Z.input, ev;
        S.t++;
        if (S.invul > 0) { S.invul--; }
        if (S.msgT > 0) { S.msgT--; }
        var dx = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
        var u = inp.down('up'), d = inp.down('down');
        var j = inp.down('fire');
        if (P.m === 'g' && u && !W.canGrab(P, G, true, false)) { j = true; }
        var prev = P.m;
        ev = W.step(P, { dx: dx, u: u, d: d, j: j }, G);
        if (prev === 'g' && P.m === 'g' && inp.hit('down')) { if (S.inv.length) { S.sel = (S.sel + 1) % S.inv.length; Z.snd.tick(); } }
        if (prev === 'g' && P.m === 'a' && j && P.p <= 1) { Z.snd.jump(); }
        if (inp.hit('alt')) { doAction(); }
        if (ev === 'dead') { die(); return; }
        if (ev) { transition(ev); if (mode !== 'play') { return; } P = S.P; R = ROOMS[S.room]; }
        S.hist.push({ x: P.x, y: P.y }); S.hist.shift();

        // tlačítko (kámen na desce)
        if (R.pl && !S.flags[R.pl.flag]) {
            var pl = R.pl;
            S.items[S.room].forEach(function (it) {
                if (!S.flags[pl.flag] && it.t === 'kamen' && it.x + 4 >= pl.c * T && it.x + 4 <= (pl.c + pl.w) * T && it.y + 8 === TOP + (pl.r + 1) * T) {
                    S.flags[pl.flag] = true; rebuild(); setMsg(['Cvak! Někde se zvedla mříž.'], 140); Z.snd.boom();
                }
            });
        }
        // mince
        (R.co || []).forEach(function (q, i) {
            var key = S.room + ':' + i;
            if (!S.got[key] && rectsHit(P.x, P.y, PW, PH, q[0] * T, TOP + q[1] * T, 8, 8)) { S.got[key] = 1; S.coins++; Z.snd.coin(); }
        });
        // kamarád a poklad
        if (R.fr && !S.rescued && rectsHit(P.x, P.y, PW, PH, R.fr.c * T - 2, TOP + R.fr.r * T, 20, 16)) {
            S.rescued = true; setMsg(['Kuřátko zachráněno! Vrať se s ním', 'domů na náves!'], 260); Z.snd.win(); resetHist();
        }
        if (R.ch && !S.treasure && rectsHit(P.x, P.y, PW, PH, R.ch.c * T, TOP + R.ch.r * T, 12, 8)) {
            S.treasure = true; setMsg(['Našel jsi poklad! +500'], 160); Z.snd.win();
        }
        // nápisy a nápovědy
        var shown = false;
        (R.sg || []).forEach(function (s) {
            if (!shown && P.y + PH >= 150 && rectsHit(P.x, P.y, PW, PH, s.c * T - 4, 0, s.w * T + 8, 200)) { setMsg(s.t, 2); shown = true; }
        });
        (R.tg || []).forEach(function (tg) {
            if (!shown && !S.flags[tg.flag] && nearRect(P, tg.r, 0)) { setMsg(tg.hint, 2); shown = true; }
        });
        // nepřátelé
        (R.en || []).forEach(function (e) {
            var o = enemyPos(e, S.t);
            if (S.invul <= 0 && rectsHit(P.x + 1, P.y + 1, PW - 2, PH - 2, o.x + 1, o.y + 1, EW - 2, EH - 2)) {
                S.energy--; S.invul = 90; Z.snd.hit();
                if (S.energy <= 0) { die(); }
            }
        });
    }

    // ---------- Kreslení
    function seedRand(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
    function idNum(id) { var h = 7; for (var i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) >>> 0; } return h; }

    function drawBackground(id, th) {
        var rnd = seedRand(idNum(id)), i, x, y;
        var bg = { v: 13, f: 13, c: 0, h: 1 }[th];
        Z.rect(0, TOP, 256, 176, bg);
        if (th === 'v' || th === 'f') {
            Z.disc(30 + (rnd() * 190 | 0), 36, 7, 14);
            for (i = 0; i < 3; i++) { x = rnd() * 220 | 0; y = 30 + rnd() * 40 | 0; Z.rect(x, y, 26, 5, 15); Z.rect(x + 5, y - 4, 14, 5, 15); }
        }
        if (th === 'v') {
            for (i = 0; i < 3; i++) {
                x = 20 + (rnd() * 190 | 0); var hh = 22 + (rnd() * 8 | 0);
                Z.rect(x, 176 - hh, 30, hh, 15); Z.rect(x + 12, 176 - 14, 7, 14, 6); Z.rect(x + 3, 176 - hh + 6, 6, 6, 5);
                for (y = 0; y < 12; y++) { Z.rect(x - 3 + (11 - y), 176 - hh - 12 + y, 36 - 2 * (11 - y), 1, 10); }
            }
        } else if (th === 'f') {
            for (i = 0; i < 4; i++) {
                x = 8 + (rnd() * 230 | 0); var th2 = 40 + (rnd() * 30 | 0);
                Z.rect(x + 8, 176 - th2, 6, th2, 2);
                Z.disc(x + 11, 176 - th2 - 6, 15, 4); Z.disc(x + 4, 176 - th2 + 2, 10, 12); Z.disc(x + 18, 176 - th2, 10, 4);
            }
        } else if (th === 'c') {
            for (i = 0; i < 9; i++) {
                x = rnd() * 250 | 0; var len = 8 + (rnd() * 26 | 0);
                for (y = 0; y < len; y++) { Z.rect(x + (y >> 2), TOP + y, Math.max(1, 9 - (y * 9 / len | 0)), 1, 1); }
            }
            for (i = 0; i < 14; i++) { Z.pix(rnd() * 256 | 0, TOP + (rnd() * 170 | 0), 9); }
        } else if (th === 'h') {
            for (y = TOP; y < 176; y += 8) { Z.rect(0, y, 256, 1, 0); for (x = (y >> 3) % 2 ? 0 : 8; x < 256; x += 16) { Z.rect(x, y, 1, 8, 0); } }
            for (i = 0; i < 3; i++) {
                x = 24 + (rnd() * 190 | 0); y = 48 + (rnd() * 40 | 0);
                Z.rect(x, y, 12, 22, 0); Z.disc(x + 6, y, 6, 0); Z.rect(x + 2, y + 2, 8, 18, 13);
                Z.rect(x + 20, y + 14, 2, 6, 6); Z.rect(x + 19, y + 11 + (S ? (S.t >> 3) % 2 : 0), 4, 3, 14); Z.pix(x + 20, y + 10, 10);
            }
        }
    }

    function drawTile(c, r, ch, sty, th) {
        var x = c * T, y = TOP + r * T, i;
        if (ch === '#') {
            var up = W.cellAt(G, c, r - 1) !== '#';
            if (sty === 'G') {
                Z.rect(x, y, 8, 8, 0); for (i = 1; i < 8; i += 3) { Z.rect(x + i, y, 2, 8, i > 3 ? 7 : 15); }
            } else if (sty === 'D') {
                Z.rect(x, y, 8, 8, 6); Z.rect(x, y, 8, 1, 2); Z.rect(x + 3, y, 1, 8, 2); Z.pix(x + 6, y + 3, 14); if (r === 16 && c === 22) { Z.rect(x + 5, y + 4, 2, 3, 0); }
            } else if (sty === 'R') {
                Z.rect(x, y, 8, 8, 6); Z.rect(x, y + 3, 8, 1, 2); Z.rect(x, y, 1, 3, 2); Z.rect(x + 4, y + 4, 1, 4, 2);
            } else if (th === 'v' || th === 'f') {
                Z.rect(x, y, 8, 8, 6);
                Z.pix(x + 2, y + 4, 2); Z.pix(x + 6, y + 6, 2); Z.pix(x + 4, y + 2, 14);
                if (up) { Z.rect(x, y, 8, 2, 12); Z.rect(x, y + 2, 8, 1, 4); Z.pix(x + ((c * 5) % 8), y + 3, 4); }
            } else if (th === 'c') {
                Z.rect(x, y, 8, 8, 1); Z.pix(x + 2, y + 2, 9); Z.pix(x + 3, y + 2, 9); Z.pix(x + 6, y + 5, 9); Z.pix(x + 1, y + 6, 3);
                if (up) { Z.rect(x, y, 8, 1, 5); }
            } else {
                Z.rect(x, y, 8, 8, 7); Z.rect(x, y + 7, 8, 1, 0); Z.rect(x + (r % 2 ? 2 : 6), y, 1, 8, 0);
                if (up) { Z.rect(x, y, 8, 1, 15); }
            }
        } else if (ch === 'S') {
            for (i = 0; i < 2; i++) { var sx = x + i * 4; Z.pix(sx + 1, y + 7, 15); Z.rect(sx, y + 6, 4, 2, 7); Z.rect(sx + 1, y + 3, 2, 3, 15); Z.pix(sx + 1, y + 2, 15); }
        } else if (ch === 'W') {
            Z.rect(x, y, 8, 8, 1);
            Z.rect(x, y + 1, 8, 2, 9);
            if (((c + (S ? S.t >> 3 : 0)) & 1) === 0) { Z.pix(x + 1, y + 1, 15); Z.pix(x + 5, y + 2, 15); } else { Z.pix(x + 3, y + 1, 15); Z.pix(x + 7, y + 2, 15); }
        } else if (ch === 'L') {
            Z.rect(x + 1, y, 1, 8, 6); Z.rect(x + 6, y, 1, 8, 6);
            Z.rect(x + 1, y + 1, 6, 1, 14); Z.rect(x + 1, y + 5, 6, 1, 14);
        }
    }

    function drawEgg(x, y, fl, frame) { Z.spriteC(x, y, EGG[frame & 3], EGGPAL, fl); }

    function drawPlayer(blinkOn) {
        var P = S.P;
        if (!blinkOn) { return; }
        var fr = 0;
        if (P.m === 'a' && P.sa) { fr = Math.floor(P.p * 4 / 22) % 4; }
        drawEgg(P.x - 3, P.y, P.f < 0, fr);
    }

    function drawEnemies(R) {
        (R.en || []).forEach(function (e) {
            var o = enemyPos(e, S.t), fr = (S.t >> 3) & 1, spr = ENEMY[e.k][fr];
            if (e.k === 'pavouk') { Z.rect(o.x + 4, TOP, 1, Math.max(0, o.y - TOP), 7); }
            Z.spriteC(o.x | 0, o.y | 0, spr, ENEMY_PAL, o.fl);
        });
    }

    function drawStuff(R, id) {
        var i, x, y;
        // tlačítko
        if (R.pl) {
            var on = S.flags[R.pl.flag];
            Z.rect(R.pl.c * T, 176 - (on ? 1 : 3), R.pl.w * T, on ? 1 : 3, 2);
            Z.rect(R.pl.c * T + 2, 176 - (on ? 1 : 4), R.pl.w * T - 4, 1, 10);
        }
        // převozník
        if (id === 'ves3') {
            x = 5 * T; Z.rect(x, 160, 10, 16, 1); Z.rect(x + 2, 154, 6, 7, 1); Z.rect(x + 3, 157, 4, 3, 15); Z.pix(x + 4, 158, 0); Z.pix(x + 6, 158, 0);
            Z.rect(x + 11, 150, 1, 26, 6); Z.rect(x + 11, 150, 3, 1, 6);
            if (!S.flags.ferry) { Z.rect(11 * T, 174, 12 * T, 2, 9); }
        }
        // klec s kamarádem
        if (R.fr) {
            var fx = R.fr.c * T, fy = TOP + R.fr.r * T;
            if (!S.rescued) {
                drawChick(fx + 2, fy + 2);
                Z.frame(fx - 1, fy - 2, 20, 18, 7); for (i = 3; i < 18; i += 4) { Z.rect(fx - 1 + i, fy - 2, 1, 18, 7); }
            }
        }
        if (R.ch && !S.treasure) {
            x = R.ch.c * T; y = TOP + R.ch.r * T;
            Z.rect(x, y + 2, 12, 6, 6); Z.rect(x, y, 12, 3, 2); Z.rect(x, y + 3, 12, 1, 14); Z.rect(x + 5, y + 3, 2, 3, 14);
        }
        // nápisy
        (R.sg || []).forEach(function (s) {
            var sx = (s.c + s.w / 2) * T - 4;
            Z.rect(sx + 3, 168, 2, 8, 6); Z.rect(sx, 162, 8, 6, 6); Z.rect(sx + 1, 164, 6, 1, 0); Z.rect(sx + 1, 166, 4, 1, 0);
        });
        // předměty na zemi
        S.items[id].forEach(function (it) { Z.spriteC(it.x, it.y + ((S.t >> 4) & 1 ? 0 : 0), ITEMS[it.t], PAL); });
        // mince
        (R.co || []).forEach(function (q, i) {
            if (S.got[id + ':' + i]) { return; }
            var fr = ((S.t >> 3) + q[0]) & 1;
            Z.spriteC(q[0] * T, TOP + q[1] * T, COINF[fr], PAL);
        });
    }

    function drawChick(x, y) {
        Z.disc(x + 6, y + 8, 6, 14); Z.disc(x + 6, y + 3, 4, 14); Z.rect(x + 8, y + 3, 4, 2, 10);
        Z.pix(x + 5, y + 2, 0); Z.pix(x + 7, y + 2, 0); Z.rect(x + 3, y + 14, 2, 2, 10); Z.rect(x + 7, y + 14, 2, 2, 10);
    }

    function drawHUD() {
        Z.rect(0, 0, 256, TOP, 0);
        for (var i = 0; i < 3; i++) {
            var x = 2 + i * 18;
            Z.frame(x, 1, 16, 14, i === S.sel && S.inv.length ? 14 : 8);
            if (S.inv[i]) { Z.spriteC(x + 4, 4, ITEMS[S.inv[i]], PAL); }
        }
        Z.text(62, 0, 'MINCE ' + Z.pad(S.coins, 3) + '  ČAS ' + Z.pad(Math.floor(S.t / 50), 3), 14);
        Z.text(62, 8, ROOMS[S.room].n.toUpperCase(), 13);
        for (i = 0; i < 3; i++) { Z.spriteC(206 + i * 9, 2, HEART.map(function (r) { return i < S.energy ? r : r.replace(/r/g, 'S'); }), { r: 10, S: 8 }); }
        for (i = 0; i < Math.max(0, S.lives); i++) { var ex = 206 + i * 9; Z.rect(ex + 1, 9, 5, 1, 15); Z.rect(ex, 10, 7, 4, 15); Z.rect(ex + 1, 14, 5, 1, 15); Z.pix(ex + 4, 11, 0); Z.rect(ex + 1, 14, 2, 1, 10); }
        if (S.rescued) { drawChick(236, 1); }
    }

    function drawMsg() {
        if (S.msgT > 0 && S.msg) {
            var h = S.msg.length * 8 + 4;
            Z.rect(0, 192 - h, 256, h, 0);
            S.msg.forEach(function (ln, i) { Z.text(128, 192 - h + 2 + i * 8, ln.toUpperCase(), 15, { align: 'center' }); });
        }
    }

    function drawRoom() {
        var R = ROOMS[S.room], th = R.th;
        Z.cls(0, 7);
        drawBackground(S.room, th);
        for (var r = 0; r < W.ROWS; r++) { for (var c = 0; c < W.COLS; c++) { var ch = G.g[r][c]; if (ch !== '.') { drawTile(c, r, ch, G.sty[r][c], th); } } }
        drawStuff(R, S.room);
        drawEnemies(R);
        if (S.rescued) { var h = S.hist[0]; drawChick(h.x - 2, h.y + 1); }
        if (mode === 'dying') {
            var P = S.P, k = modeT;
            if (k < 30) { drawEgg(P.x - 3, P.y - (k < 12 ? k : 24 - k), (k >> 2) & 1, k >> 2); }
            else { for (var q = 0; q < 6; q++) { Z.rect(P.x + 3 + (q - 3) * (k - 30) / 2, P.y + 8 + (k - 30) * (q % 2 ? 1 : 0.3), 3, 3, q % 2 ? 15 : 7); } }
        } else {
            drawPlayer(S.invul <= 0 || (S.t >> 2) % 2 === 0);
        }
        drawHUD();
        drawMsg();
        Z.border = { v: 5, f: 4, c: 1, h: 3 }[th];
    }

    function drawTitle() {
        Z.cls(1, 7); Z.border = 1;
        Z.rect(0, 0, 256, 192, 1);
        Z.disc(214, 30, 8, 14);
        Z.rect(0, 120, 256, 72, 4); Z.rect(0, 120, 256, 2, 12);
        for (var i = 0; i < 5; i++) { Z.rect(176 + i * 15, 74, 11, 46, 7); Z.rect(176 + i * 15, 69, 4, 5, 7); Z.rect(183 + i * 15, 69, 4, 5, 7); }
        Z.rect(176, 74, 71, 3, 15); Z.rect(204, 98, 14, 22, 0);
        Z.text(128, 6, 'VAJÍČKO', 14, { scale: 3, align: 'center' });
        Z.text(128, 36, 'DOBRODRUH', 10, { scale: 2, align: 'center' });
        Z.spriteCS(50, 78, EGG[0], EGGPAL, 3);
        drawChick(110, 104);
        Z.rect(0, 128, 256, 64, 0);
        var lines = ['Vyzvedni Kuřátko z věže, najdi poklad', 'a vrať se s ním domů na náves.',
            'Šipky/WASD chůze   Mezerník skok', 'X sebrat/použít/položit  Dolů výběr', 'P pauza   M zvuk'];
        lines.forEach(function (l, k) { Z.text(128, 128 + k * 8, l, k < 2 ? 15 : 13, { align: 'center' }); });
        Z.text(128, 128 + 40, 'REKORD ' + Z.pad(Z.hi.get(HI_KEY) || 0, 5), 14, { align: 'center' });
        if ((blink >> 4) % 2 === 0) { Z.text(128, 128 + 52, 'STISKNI MEZERNÍK', 10, { align: 'center' }); }
    }

    function drawOver(won) {
        drawRoom();
        Z.rect(24, 40, 208, 96, 0); Z.frame(24, 40, 208, 96, won ? 14 : 10); Z.frame(26, 42, 204, 92, won ? 6 : 2);
        Z.text(128, 50, won ? 'DOMA! HOTOVO!' : 'KONEC HRY', won ? 14 : 10, { scale: 2, align: 'center' });
        var secs = Math.floor(S.t / 50);
        Z.text(128, 74, won ? 'Kuřátko je doma i s pokladem!' : 'Kuřátko zůstalo v hradní věži.', 15, { align: 'center' });
        Z.text(128, 86, 'MINCE ' + S.coins + '   ČAS ' + secs + ' S', 13, { align: 'center' });
        Z.text(128, 98, 'SKÓRE ' + S.final, 14, { align: 'center' });
        Z.text(128, 110, 'REKORD ' + (S.hiv || 0), 15, { align: 'center' });
        if (modeT > 100 && (blink >> 4) % 2 === 0) { Z.text(128, 122, 'STISKNI MEZERNÍK', 7, { align: 'center' }); }
    }

    // ---------- Hlavní smyčka
    function tick() {
        blink++; modeT++;
        if (mode === 'title') { Z.pauseOk = false; if (Z.input.hit('fire') || Z.input.hit('alt')) { newGame(); Z.pauseOk = true; } return; }
        if (mode === 'play') { Z.pauseOk = true; tickPlay(); return; }
        if (mode === 'dying') { S.t++; if (modeT > 70) { afterDeath(); } return; }
        if ((mode === 'over' || mode === 'won') && modeT > 100 && (Z.input.hit('fire') || Z.input.hit('alt'))) { mode = 'title'; modeT = 0; }
    }
    function draw() {
        if (mode === 'title') { drawTitle(); }
        else if (mode === 'over') { drawOver(false); }
        else if (mode === 'won') { drawOver(true); }
        else { drawRoom(); }
    }

    root.GAME = {
        W: W, get S() { return S; }, get G() { return G; }, get mode() { return mode; },
        newGame: newGame, rebuild: rebuild, enemyPos: enemyPos, itemNear: itemNear, nearRect: nearRect, setMode: function (m) { mode = m; modeT = 0; },
        EGG: EGG, rectsHit: rectsHit
    };

    Z.init({
        title: 'Vajíčko Dobrodruh',
        touch: [{ act: 'left', label: '◀' }, { act: 'right', label: '▶' }, { act: 'up', label: '▲' }, { act: 'down', label: '▼' },
            { act: 'alt', label: 'X' }, { act: 'fire', label: 'SKOK', cls: 'big' }]
    });
    Z.run({ tick: tick, draw: draw });
})(typeof window !== 'undefined' ? window : globalThis);
