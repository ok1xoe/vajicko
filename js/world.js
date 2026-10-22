// Svět hry Vajíčko Dobrodruh: 25 obrazovek (data) + fyzika (sdílená hrou i ověřovacími skripty).
// Souřadnice místností: dlaždice 8x8, 32 sloupců x 22 řádků, řádek r má horní hranu v y = 16 + 8*r (nahoře je HUD).
// Podlaha = řádky 20-21 (povrch y=176). b = bloky [c,r,w,h,styl], l = žebříky [c,r0,r1], s = trny [c,r,w], w = voda [c,r,w,h],
// co = mince [c,r], it = předměty, en = nepřátelé, sg = nápisy, tg = místa pro použití předmětu, pl = tlačítko, when = podmíněné změny.
(function (root) {
    'use strict';

    var T = 8, TOP = 16, COLS = 32, ROWS = 22, PW = 8, PH = 14;
    // oblouk skoku: dy za tick (záporné = nahoru). P0 = index, odkud už se jen padá.
    var ARC = [-5, -4, -4, -3, -3, -3, -2, -2, -1, -1, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5];
    var P0 = 12;

    var ROOMS = {
        ves1: { n: 'Náves', th: 'v', L: 'les1', R: 'ves2', b: [[12, 17, 5, 1]], co: [[13, 16], [15, 16], [27, 19]],
            sg: [{ c: 5, w: 3, t: ['Vítej, Vajíčku! Kuřátko zmizelo!', 'Hledej ho na hradě za řekou.'] }] },
        ves2: { n: 'Kovárna', th: 'v', L: 'ves1', R: 'ves3', U: 'ves5', l: [[20, 0, 19]], s: [[12, 19, 2]], co: [[8, 19], [27, 19]],
            sg: [{ c: 3, w: 3, t: ['Na střeše se prý lesknou mince.', 'Na žebříku šipka nahoru / dolů.'] }] },
        ves3: { n: 'Přívoz', th: 'v', L: 'ves2', R: 'ves4', w: [[11, 20, 12, 2]], co: [[8, 19], [14, 17], [18, 17]],
            b: [], tg: [{ id: 'prevoz', item: 'stribrnak', flag: 'ferry', r: [2, 17, 7, 3],
                hint: ['Převozník chce stříbrňák.', 'Bez něj přes řeku nepřejdeš.'], ok: ['Převozník: Děkuji, přejdi po pramicích!'] }],
            when: [{ flag: 'ferry', add: { b: [[11, 20, 12, 1, 'R']] } }],
            sg: [{ c: 9, w: 2, t: ['Řeka je moc široká na skok.', 'Stříbrňák někde v jeskyni?'] }] },
        ves4: { n: 'Druhý břeh', th: 'v', L: 'ves3', R: 'hrad1', b: [[14, 17, 5, 1]], co: [[6, 19], [16, 16], [25, 19]],
            en: [{ k: 'had', x0: 64, x1: 150, sp: 0.5 }],
            sg: [{ c: 2, w: 2, t: ['Hrad je blízko. Brána je zamčená,', 'bude potřeba klíč.'] }] },
        ves5: { n: 'Na střeše', th: 'v', D: 'ves2', l: [[20, 20, 21]], b: [[4, 17, 5, 1], [10, 14, 4, 1], [26, 17, 4, 1], [14, 17, 3, 1]],
            co: [[5, 16], [7, 16], [11, 13], [12, 13], [27, 16], [28, 16]],
            sg: [{ c: 22, w: 2, t: ['Pěkný výhled! Poklad je ale v hradu.'] }] },

        les1: { n: 'Lesní cesta', th: 'f', L: 'les2', R: 'ves1', U: 'les5', l: [[24, 0, 19]], it: [{ t: 'houba', c: 8, r: 19 }],
            b: [[14, 17, 5, 1]], co: [[4, 19], [16, 16]],
            en: [{ k: 'had', x0: 100, x1: 180, sp: 0.5 }],
            sg: [{ c: 2, w: 2, t: ['Houba je k ničemu. Do inventáře', 'se vejdou jen 3 předměty!'] }] },
        les2: { n: 'Mýtina', th: 'f', L: 'les3', R: 'les1', D: 'jes1', l: [[16, 20, 21]], it: [{ t: 'kamen', c: 5, r: 19 }],
            en: [{ k: 'netopyr', y: 118, x0: 40, x1: 210, sp: 0.8 }], co: [[24, 19], [26, 19]],
            sg: [{ c: 19, w: 3, t: ['Pod zemí je jeskyně. Dolů vede žebřík.', 'Tlačítko tam otevírá mříž.'] }] },
        les3: { n: 'Starý dub', th: 'f', L: 'les4', R: 'les2', b: [[8, 17, 4, 1], [14, 14, 4, 1], [20, 11, 5, 1]],
            it: [{ t: 'zebrik', c: 22, r: 10 }], co: [[9, 16], [15, 13]],
            en: [{ k: 'pavouk', x: 224, y0: 40, y1: 110, sp: 0.7 }],
            sg: [{ c: 3, w: 3, t: ['Na větvi dubu leží žebřík.', 'Skákej po větvích nahoru.'] }] },
        les4: { n: 'Zarostlý kout', th: 'f', L: 'les6', R: 'les3', w: [[12, 20, 4, 2]], co: [[4, 19], [6, 19], [8, 19], [20, 19]],
            sg: [{ c: 26, w: 3, t: ['Bažina je dál vlevo. Pozor na vodu!'] }] },
        les5: { n: 'Koruna stromu', th: 'f', D: 'les1', l: [[24, 20, 21]], b: [[4, 17, 4, 1], [10, 14, 4, 1], [16, 17, 4, 1], [28, 17, 3, 1]],
            co: [[5, 16], [11, 13], [12, 13], [17, 16], [29, 16]],
            sg: [{ c: 20, w: 3, t: ['Klíč je daleko napravo v jeskyni,', 'za mříží a pavouky.'] }] },
        les6: { n: 'Bažina', th: 'f', R: 'les4', w: [[6, 20, 4, 2], [14, 20, 4, 2]], b: [[2, 17, 3, 1], [22, 17, 4, 1]],
            co: [[3, 16], [11, 19], [11, 18], [23, 16], [24, 16]],
            sg: [{ c: 26, w: 3, t: ['Tady nic není, jen žáby a poklidné', 'bahno. Vrať se.'] }] },

        jes1: { n: 'Vchod do jeskyně', th: 'c', U: 'les2', L: 'jes3', R: 'jes2', l: [[16, 0, 19]],
            en: [{ k: 'netopyr', y: 120, x0: 20, x1: 100, sp: 0.8 }], co: [[6, 19], [26, 19]],
            sg: [{ c: 22, w: 3, t: ['Vpravo je strážnice s mříží.', 'Vlevo temná síň.'] }] },
        jes2: { n: 'Strážnice', th: 'c', L: 'jes1', R: 'jes4', b: [[26, 14, 1, 6, 'G']], s: [[18, 19, 2]],
            pl: { c: 11, r: 19, w: 2, flag: 'gate' }, when: [{ flag: 'gate', rem: [[26, 14, 1, 6]] }],
            co: [[4, 19], [22, 19]],
            sg: [{ c: 3, w: 4, t: ['Mříž se otevře, když na tlačítko', 'položíš kámen (X = položit).']  }] },
        jes3: { n: 'Temná síň', th: 'c', L: 'jes6', R: 'jes1', w: [[12, 20, 4, 2]], b: [[6, 17, 4, 1], [20, 17, 3, 1]],
            en: [{ k: 'netopyr', y: 130, x0: 140, x1: 230, sp: 0.9 }], co: [[7, 16], [21, 16], [26, 19]],
            sg: [{ c: 27, w: 2, t: ['Ticho... a voda kape ze stropu.'] }] },
        jes6: { n: 'Sklípek', th: 'c', R: 'jes3', s: [[10, 19, 2], [18, 19, 2]], b: [[7, 17, 3, 1], [12, 14, 3, 1]],
            co: [[5, 19], [7, 19], [13, 13], [14, 13], [24, 19]],
            sg: [{ c: 26, w: 3, t: ['Slepá ulička. Skutečný poklad', 'je prý v hradní věži.'] }] },
        jes4: { n: 'Pavoučí doupě', th: 'c', L: 'jes2', R: 'jes5', b: [[6, 17, 4, 1], [12, 14, 4, 1], [18, 11, 4, 1]], s: [[24, 19, 3]],
            it: [{ t: 'stribrnak', c: 19, r: 10 }], co: [[7, 16], [13, 13]],
            en: [{ k: 'pavouk', x: 88, y0: 36, y1: 100, sp: 0.6 }, { k: 'pavouk', x: 200, y0: 50, y1: 120, sp: 0.8 }],
            sg: [{ c: 2, w: 3, t: ['Na římse se leskne stříbrná mince!', 'Pozor na pavouky.'] }] },
        jes5: { n: 'Klíčová komora', th: 'c', L: 'jes4', w: [[9, 20, 4, 2]], s: [[19, 19, 2]], it: [{ t: 'klic', c: 26, r: 19 }],
            en: [{ k: 'netopyr', y: 140, x0: 150, x1: 220, sp: 0.9 }], co: [[16, 19], [4, 19]],
            sg: [{ c: 2, w: 2, t: ['Hradní klíč! Teď zpátky a přes řeku.'] }] },

        hrad1: { n: 'Hradní příkop', th: 'h', L: 'ves4', R: 'hrad2', w: [[12, 20, 4, 2]],
            en: [{ k: 'netopyr', y: 110, x0: 30, x1: 220, sp: 0.8 }], co: [[5, 19], [27, 19]],
            sg: [{ c: 22, w: 3, t: ['Hradby jsou moc vysoké. Zkus je', 'obejít... nebo přelézt.'] }] },
        hrad2: { n: 'Hradby', th: 'h', L: 'hrad1', R: 'hrad3', b: [[20, 6, 3, 14, 'W']], co: [[21, 5], [4, 19], [28, 19]],
            tg: [{ id: 'zebrik', item: 'zebrik', flag: 'zebrik', r: [14, 16, 5, 4],
                hint: ['Zeď je moc vysoká.', 'Chtělo by to žebřík.'], ok: ['Žebříky přiloženy na obou stranách!'] }],
            when: [{ flag: 'zebrik', add: { l: [[19, 6, 19], [23, 6, 19]] } }],
            sg: [{ c: 4, w: 4, t: ['Zeď má jen jednu cestu: nahoru.', 'Žebřík přilož u zdi (X).']  }] },
        hrad3: { n: 'Zavřená brána', th: 'h', L: 'hrad2', R: 'hrad4', b: [[22, 13, 2, 7, 'D']], when: [{ flag: 'klic', rem: [[22, 13, 2, 7]] }],
            tg: [{ id: 'dvere', item: 'klic', flag: 'klic', r: [18, 14, 4, 6], hint: ['Dveře jsou zamčené.', 'Chce to hradní klíč.'], ok: ['Cvak! Dveře se otevřely.'] }],
            en: [{ k: 'duch', y: 140, x0: 20, x1: 120, sp: 0.6 }], co: [[6, 19], [14, 19]] },
        hrad4: { n: 'Síň rytířů', th: 'h', L: 'hrad3', R: 'hrad8', U: 'hrad5', D: 'hrad7', l: [[10, 0, 19], [24, 20, 21]],
            b: [[14, 17, 4, 1]], en: [{ k: 'duch', y: 150, x0: 60, x1: 200, sp: 0.7 }], co: [[15, 16], [4, 19], [28, 19]],
            sg: [{ c: 5, w: 3, t: ['Věž je nahoře po schodech (žebřík).', 'Vpravo zahrada, dole sklep.'] }] },
        hrad5: { n: 'Schodiště', th: 'h', D: 'hrad4', R: 'hrad6', l: [[10, 20, 21]], b: [[14, 17, 4, 1], [20, 14, 4, 1]], s: [[25, 19, 3]],
            en: [{ k: 'netopyr', y: 100, x0: 40, x1: 200, sp: 0.8 }], co: [[15, 16], [21, 13], [4, 19]] },
        hrad6: { n: 'Věž', th: 'h', L: 'hrad5', b: [], fr: { c: 22, r: 18 }, ch: { c: 27, r: 19 },
            en: [{ k: 'duch', y: 150, x0: 20, x1: 110, sp: 0.6 }], co: [[12, 19], [8, 19]],
            sg: [{ c: 14, w: 2, t: ['Kuřátko je v kleci! Dotkni se ho!'] }] },
        hrad7: { n: 'Sklep', th: 'h', U: 'hrad4', l: [[24, 0, 19]], w: [[8, 20, 3, 2], [14, 20, 3, 2]], s: [[19, 19, 2]],
            co: [[3, 19], [12, 19], [12, 18], [27, 19]],
            sg: [{ c: 26, w: 2, t: ['Vlhký sklep. Slepá ulička.'] }] },
        hrad8: { n: 'Zahrada', th: 'h', L: 'hrad4', w: [[14, 20, 4, 2]], b: [[22, 17, 4, 1]],
            en: [{ k: 'duch', y: 120, x0: 30, x1: 120, sp: 0.5 }], co: [[23, 16], [24, 16], [6, 19], [8, 19]],
            sg: [{ c: 3, w: 2, t: ['Tichá zahrada. Nic tu nehlídá.'] }] }
    };

    var START = { room: 'ves1', x: 40, y: 176 - PH };
    var ITEM_NAMES = { kamen: 'KÁMEN', klic: 'KLÍČ', zebrik: 'ŽEBŘÍK', stribrnak: 'STŘÍBRŇÁK', houba: 'HOUBA' };

    // ---------- Mřížka místnosti (podle příznaků)
    function rect(g, sty, rects, ch, st) {
        (rects || []).forEach(function (q) {
            for (var r = q[1]; r < q[1] + q[3]; r++) {
                for (var c = q[0]; c < q[0] + q[2]; c++) {
                    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) { g[r][c] = ch; sty[r][c] = q[4] || st || ''; }
                }
            }
        });
    }

    function buildGrid(id, flags) {
        var R = ROOMS[id], g = [], sty = [], r, c;
        for (r = 0; r < ROWS; r++) { g.push([]); sty.push([]); for (c = 0; c < COLS; c++) { g[r].push(r >= 20 ? '#' : '.'); sty[r].push(''); } }
        (R.s || []).forEach(function (q) { for (c = q[0]; c < q[0] + q[2]; c++) { g[q[1]][c] = 'S'; } });
        rect(g, sty, R.w, 'W');
        rect(g, sty, R.b, '#');
        (R.when || []).forEach(function (w) {
            if (!flags[w.flag]) { return; }
            if (w.add) { rect(g, sty, w.add.b, '#'); }
            rect(g, sty, w.rem, '.');
        });
        var lads = (R.l || []).slice();
        (R.when || []).forEach(function (w) { if (flags[w.flag] && w.add && w.add.l) { lads = lads.concat(w.add.l); } });
        lads.forEach(function (q) { for (r = q[1]; r <= q[2]; r++) { g[r][q[0]] = 'L'; sty[r][q[0]] = ''; } });
        return { g: g, sty: sty, L: R.L, R: R.R, U: R.U, D: R.D, id: id };
    }

    // ---------- Fyzika
    function cellAt(G, c, r) {
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) { return '.'; }
        return G.g[r][c];
    }
    function overlapsSolid(G, x, y) {
        var c0 = Math.floor(x / T), c1 = Math.floor((x + PW - 1) / T);
        var r0 = Math.floor((y - TOP) / T), r1 = Math.floor((y + PH - 1 - TOP) / T);
        for (var r = r0; r <= r1; r++) { for (var c = c0; c <= c1; c++) { if (cellAt(G, c, r) === '#') { return true; } } }
        return false;
    }
    function supported(P, G) { return overlapsSolid(G, P.x, P.y + 1); }
    function hazard(P, G) {
        var c0 = Math.floor(P.x / T), c1 = Math.floor((P.x + PW - 1) / T);
        var r0 = Math.floor((P.y - TOP) / T), r1 = Math.floor((P.y + PH - 1 - TOP) / T);
        for (var r = r0; r <= r1; r++) {
            for (var c = c0; c <= c1; c++) {
                var ch = cellAt(G, c, r), top = TOP + r * T;
                if (ch === 'W' && P.y + PH > top + 2) { return true; }
                if (ch === 'S' && P.y + PH > top + 3 && P.x + PW > c * T + 1 && P.x < c * T + T - 1) { return true; }
            }
        }
        return false;
    }
    function ladderAt(G, c, y) { return cellAt(G, c, Math.floor((y - TOP) / T)) === 'L'; }
    function colOf(P) { return Math.floor((P.x + PW / 2) / T); }
    // lze se chytit žebříku? (nahoru: žebřík v buňce nohou; dolů: žebřík pod nohama)
    function canGrab(P, G, up, down) {
        var c = colOf(P), feet = P.y + PH;
        if (up && ladderAt(G, c, feet - 1)) { return true; }
        if (down && ladderAt(G, c, feet)) { return true; }
        return false;
    }
    function moveX(P, dx, G) {
        var s = dx < 0 ? -1 : 1;
        for (var i = 0; i < Math.abs(dx); i++) {
            var nx = P.x + s;
            if (nx < (G.L ? -4 : 0) || nx > (G.R ? 252 : 256 - PW)) { return false; }
            if (overlapsSolid(G, nx, P.y)) { return false; }
            P.x = nx;
        }
        return true;
    }
    function toLadder(P, G) { P.m = 'l'; P.x = colOf(P) * T; P.p = 0; P.sa = false; }
    function endEvent(P, G) {
        if (hazard(P, G)) { return 'dead'; }
        if (P.x <= -4 && G.L) { return 'L'; }
        if (P.x >= 252 && G.R) { return 'R'; }
        if (P.y + PH - 1 >= 192) { return G.D ? 'D' : 'dead'; }
        return null;
    }
    function airStep(P, I, G) {
        if ((I.u || I.d) && canGrab(P, G, I.u, I.d) && P.p > 0) { toLadder(P, G); return endEvent(P, G); }
        var dy = ARC[Math.min(P.p, ARC.length - 1)];
        P.p++;
        if (P.d) { moveX(P, P.d * 2, G); }
        var i;
        if (dy < 0) {
            for (i = 0; i < -dy; i++) {
                if (P.y - 1 < 0 || overlapsSolid(G, P.x, P.y - 1)) { P.p = Math.max(P.p, P0); break; }
                P.y--;
            }
        } else if (dy > 0) {
            for (i = 0; i < dy; i++) {
                if (overlapsSolid(G, P.x, P.y + 1)) { P.m = 'g'; P.p = 0; P.sa = false; break; }
                P.y++;
            }
        }
        return endEvent(P, G);
    }
    // I = {dx:-1|0|1, u, d, j}; vrací null | 'dead' | 'L' | 'R' | 'U' | 'D'
    function step(P, I, G) {
        if (I.dx) { P.f = I.dx; }
        if (P.m === 'a') { return airStep(P, I, G); }
        if (I.j) { P.m = 'a'; P.p = 0; P.d = I.dx; P.sa = true; return airStep(P, I, G); }
        if (P.m === 'l') {
            if (I.dx) {
                var sx = P.x, sy = P.y;
                P.m = 'g'; moveX(P, I.dx * 2, G);
                if (!supported(P, G)) { P.m = 'l'; P.x = sx; P.y = sy; }
            } else if (I.u) {
                var ny = P.y - 2;
                if (G.U && ny < 10) { return 'U'; }
                if (ladderAt(G, colOf(P), ny + PH)) { P.y = ny; }
            } else if (I.d) {
                var ny2 = P.y + 2;
                if (ny2 + PH - 1 >= 192) { if (G.D) { return 'D'; } }
                else if (ladderAt(G, colOf(P), ny2 + PH - 1)) { P.y = ny2; }
            }
            if (P.m === 'l' && !I.u && supported(P, G)) { P.m = 'g'; }
            return endEvent(P, G);
        }
        // zem
        if (canGrab(P, G, I.u, I.d)) { toLadder(P, G); return endEvent(P, G); }
        if (I.dx) { moveX(P, I.dx * 2, G); }
        if (!supported(P, G)) { P.m = 'a'; P.p = P0; P.d = I.dx; P.sa = false; }
        return endEvent(P, G);
    }

    root.WORLD = {
        T: T, TOP: TOP, COLS: COLS, ROWS: ROWS, PW: PW, PH: PH, ARC: ARC, P0: P0, ROOMS: ROOMS, START: START, ITEM_NAMES: ITEM_NAMES,
        buildGrid: buildGrid, step: step, canGrab: canGrab, supported: supported, overlapsSolid: overlapsSolid, hazard: hazard, cellAt: cellAt
    };
})(typeof window !== 'undefined' ? window : globalThis);
