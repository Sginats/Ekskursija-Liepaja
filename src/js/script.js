(function() {
'use strict';

// Game state, anti-cheat & integrity
const GameState = (function() {
    let _score = 0;
    let _completedTasks = 0;
    let _checksum = 0;

    function _updateChecksum() {
        _checksum = (_score * 7 + _completedTasks * 13 + 42) ^ 0xA5A5;
    }

    function _verifyIntegrity() {
        return _checksum === ((_score * 7 + _completedTasks * 13 + 42) ^ 0xA5A5);
    }

    _updateChecksum();

    return {
        getScore: function() {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; _updateChecksum(); }
            return _score;
        },
        addScore: function(points) {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; }
            _score += points;
            if (_score < 0) _score = 0;
            if (_score > 120) _score = 120;
            _updateChecksum();
            return _score;
        },
        getCompleted: function() {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; _updateChecksum(); }
            return _completedTasks;
        },
        completeTask: function() {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; }
            _completedTasks++;
            _updateChecksum();
            return _completedTasks;
        },
        reset: function() {
            _score = 0;
            _completedTasks = 0;
            _updateChecksum();
        }
    };
})();

const _ac = (function() {
    let activeTask = false;
    let taskType = null;
    let violations = 0;
    let devToolsOpen = false;
    return {
        get activeTask() { return activeTask; },
        set activeTask(v) { activeTask = v; },
        get taskType() { return taskType; },
        set taskType(v) { taskType = v; },
        get violations() { return violations; },
        addViolation: function() { violations++; },
        get devToolsOpen() { return devToolsOpen; },
        set devToolsOpen(v) { devToolsOpen = v; }
    };
})();

const TOTAL_TASKS = 10;

// DevTools & context-menu protection
(function _detectDevTools() {
    const threshold = 160;
    const check = function() {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
            if (!_ac.devToolsOpen) {
                _ac.devToolsOpen = true;
                _ac.addViolation();
                if (typeof showNotification === 'function') {
                    showNotification('Izstrādātāja rīki atvērti — tas var ietekmēt spēli!', 'warning', 5000);
                }
            }
        } else {
            _ac.devToolsOpen = false;
        }
    };
    setInterval(check, 1000);
    window.addEventListener('resize', check);
})();

document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.modal-content, .map-area, .task-section, .quiz-form')) {
        e.preventDefault();
    }
});

// Console suppression & error logging
(function() {
    const _noop = function() {};
    try {
        Object.defineProperty(window, 'console', {
            get: function() {
                return { log: _noop, warn: _noop, error: _noop, info: _noop, debug: _noop, dir: _noop, table: _noop, trace: _noop, assert: _noop, clear: _noop, group: _noop, groupEnd: _noop, groupCollapsed: _noop, time: _noop, timeEnd: _noop };
            },
            set: _noop
        });
    } catch(e) { /* Browser may block property override */ }
})();

(function() {
    var _BL_SENT = 0;
    var _BL_MAX  = 15;
    var _BL_SEEN = {};
    var _BL_URL  = window.location.pathname.indexOf('/src/php/') !== -1
        ? 'log_error.php'
        : 'src/php/log_error.php';

    function _blSend(message, source, line, col, stack) {
        if (_BL_SENT >= _BL_MAX) return;
        var key = String(message).substring(0, 80) + '|' + (line || 0);
        if (_BL_SEEN[key]) return;
        _BL_SEEN[key] = 1;
        _BL_SENT++;
        try {
            fetch(_BL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page:    window.location.pathname + window.location.search,
                    message: String(message).substring(0, 400),
                    source:  String(source  || '').substring(0, 200),
                    line:    line  || 0,
                    col:     col   || 0,
                    stack:   String(stack   || '').substring(0, 800),
                }),
                keepalive: true,
            }).catch(function() {});
        } catch(e) { /* never throw inside an error handler */ }
    }
// -------------------------------
// RTU Tower Blocks game
// -------------------------------
    let rtuTowerPhaserGame = null;
    let rtuTowerActive = false;

    const MinigameFX = window.MinigameFX || {
        applyTheme: function() { return null; },
        makeParticles: function() { return null; },
        burst: function() {},
        flash: function() {},
        shake: function() {},
        textPop: function() {},
        tinySynth: function() { return { play: function() {} }; }
    };

    function getRTUTowerScene() {
        if (!rtuTowerPhaserGame) return null;
        try { return rtuTowerPhaserGame.scene.getScene('RTUTowerScene'); } catch { return null; }
    }

    function isRTUTowerModalOpen() {
        const gm = document.getElementById('game-modal');
        return !!(gm && gm.style.display === 'block' && rtuTowerActive);
    }

    function handleRTUTowerSpace(e) {
        if (e.code !== 'Space' && e.key !== ' ') return;
        if (!isRTUTowerModalOpen()) return;
        if (e.repeat) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const scene = getRTUTowerScene();
        if (scene && typeof scene._drop === 'function' && !scene.isOver && !scene.isPaused) {
            scene._drop();
        }
    }
    window.addEventListener('keydown', handleRTUTowerSpace, true);

    const RTU_TOWER_CFG = {
        timeLimit: null,
        baseWidth: 220,
        minWidth: 1,
        perfectPx: 7,
        speedStart: 210,
        speedStep: 14,
        maxSpeed: 550,
        minPoints: 7,
        maxPoints: 25,
        infoLines: [
            'RTU Liepāja • Studiju programma: Būvniecība',
            'Budžeta vietas: 55',
            'Maksa gadā: € 4 120 (pilna laika), € 3 300 (nepilna laika)',
            'Uzsākšana: neklātiene — Rīga, Rēzekne, Liepāja'
        ]
    };

    function startRTUTowerGame() {
        const mc = document.querySelector('#game-modal .modal-content');
        if (mc) mc.classList.add('rtu-card');
        const guideWrap = document.querySelector('.guide-wrapper');
        if (guideWrap) guideWrap.style.display = 'none';

        document.getElementById('game-modal').style.display = 'block';

        document.querySelector('.task-section').innerHTML = `
    <h2 class="rtu-title">RTU BŪVNIECĪBA • Tower Blocks</h2>
    <p style="margin-bottom:10px; opacity:0.8; font-size:14px;">Spēlē bez laika limita: klikšķini vai SPACE, lai nomestu bloku. Kad esi gatavs, spied Turpināt un saņem punktus.</p>
    <div id="rtu-tower-info" class="rtu-info"></div>
    <div id="rtu-tower-container"></div>
    <div class="rtu-actions">
      <button id="rtu-start-btn" class="btn btn-full" style="background:#ffb000; color:#1a1100; border:none; font-weight:700;" onclick="initRTUTowerGame()">SĀKT BŪVĒT</button>
      <button id="rtu-continue-btn" class="btn btnMini" onclick="window.finishRTUTowerNow()" disabled>Turpināt →</button>
      <button class="btn" onclick="window.finishRTUTowerNow()">Aizvērt</button>
    </div>
  `;

        const infoEl = document.getElementById('rtu-tower-info');
        if (infoEl) infoEl.innerHTML = RTU_TOWER_CFG.infoLines.map(x => `<div>• ${x}</div>`).join('');
    }

    window.finishRTUTowerNow = function() {
        const scene = getRTUTowerScene();
        if (scene && !scene.isOver) {
            scene.finish(true);
        }
    };

    function initRTUTowerGame() {
        if (rtuTowerPhaserGame) {
            try { rtuTowerPhaserGame.destroy(true); } catch {}
            rtuTowerPhaserGame = null;
        }
        rtuTowerActive = false;
        const continueBtn = document.getElementById('rtu-continue-btn');
        if (continueBtn) continueBtn.disabled = true;

        const container = document.getElementById('rtu-tower-container');
        if (!container) return;
        container.innerHTML = '';

        const ww = window.innerWidth;
        const wh = window.innerHeight;
        let gameW = Math.min(920, ww * 0.92);
        let gameH = Math.min(550, wh * 0.55);
        if (gameW / gameH > 1.6) gameW = gameH * 1.6;

        class RTUTowerScene extends Phaser.Scene {
            constructor() { super('RTUTowerScene'); }

            init() {
                this.blockH = 36;
                this.timeLeft = Number.isFinite(RTU_TOWER_CFG.timeLimit) ? RTU_TOWER_CFG.timeLimit : null;
                this.baseW = RTU_TOWER_CFG.baseWidth;
                this.minW = RTU_TOWER_CFG.minWidth;
                this.perfectPx = RTU_TOWER_CFG.perfectPx;
                this.speed = RTU_TOWER_CFG.speedStart;
                this.speedStep = RTU_TOWER_CFG.speedStep;
                this.maxSpeed = RTU_TOWER_CFG.maxSpeed;
                this.score = 0;
                this.bonus = 0;
                this.perfectStreak = 0;
                this.dir = 1;
                this.stack = [];
                this.moving = null;
                this.isOver = false;
                this.isPaused = false;
                this.milestoneShown = false;
                this.overlay = null;
                this._audio = MinigameFX.tinySynth();
            }

            create() {
                const { width, height } = this.scale;
                
                MinigameFX.applyTheme(this, 'construction');

                this.particles = MinigameFX.makeParticles(this);

                const textStyle = { fontFamily: 'Poppins, Arial', fontSize: '18px', fill: '#ffb000', fontWeight: 'bold' };
                this.uiScore = this.add.text(20, 20, 'LĪMENIS: 0', textStyle).setScrollFactor(0).setShadow(2,2,'rgba(0,0,0,0.5)',2);
                if (this.timeLeft !== null) {
                    this.uiTimer = this.add.text(20, 48, `LAIKS: ${this.timeLeft}`, { ...textStyle, fill: '#fff', fontSize: '16px' }).setScrollFactor(0);
                } else {
                    this.uiTimer = this.add.text(20, 48, 'REŽĪMS: BRĪVS', { ...textStyle, fill: '#fff', fontSize: '16px' }).setScrollFactor(0);
                }
                this.uiHint  = this.add.text(width/2, height - 40, 'SPIED VAI SPACE, LAI NOMESTU BLOKU', { ...textStyle, fontSize: '14px', fill: '#94a3b8' }).setOrigin(0.5).setScrollFactor(0);

                if (this.timeLeft !== null) {
                    this.timerEvent = this.time.addEvent({
                        delay: 1000,
                        loop: true,
                        callback: () => {
                            if (this.isOver) return;
                            this.timeLeft--;
                            this.uiTimer.setText(`LAIKS: ${this.timeLeft}`);
                            if (this.timeLeft === 10) this.uiTimer.setFill('#ff7777');
                        }
                    });
                }

                this.baseY = height - 50;
                const base = this._makeBlock(width / 2, this.baseY, this.baseW, 0x334155);
                this.stack.push({ x: base.x, y: base.y, w: base.width, rect: base });

                this._spawnMoving(this.baseW);

                this.input.on('pointerdown', () => {
                    if (this.isOver || this.isPaused) return;
                    this._drop();
                });

                this.input.keyboard.on('keydown-SPACE', (ev) => {
                    if (this.isOver || this.isPaused) return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    this._drop();
                });

                const continueBtn = document.getElementById('rtu-continue-btn');
                if (continueBtn) continueBtn.disabled = true;
            }

            update(_, dt) {
                if (this.isOver || this.isPaused || !this.moving) return;
                const step = (dt / 1000) * this.speed * this.dir;
                this.moving.rect.x += step;
                this.moving.x = this.moving.rect.x;
                const { width } = this.scale;
                const margin = 40;
                const half = this.moving.w / 2;
                if (this.moving.rect.x - half <= margin) {
                    this.moving.rect.x = margin + half;
                    this.dir = 1;
                } else if (this.moving.rect.x + half >= width - margin) {
                    this.moving.rect.x = width - margin - half;
                    this.dir = -1;
                }
            }

            _spawnMoving(w) {
                const { width } = this.scale;
                const top = this.stack[this.stack.length - 1];
                const y = top.y - this.blockH;
                this.dir *= -1;
                const startX = this.dir === 1 ? 50 + w/2 : width - 50 - w/2;
                const rect = this._makeBlock(startX, y, w, 0xffb000);
                this.moving = { x: rect.x, y, w, rect };
            }

            _drop() {
                if (!this.moving) return;
                const prev = this.stack[this.stack.length - 1];
                const cur = this.moving;
                const dx = Math.abs(cur.x - prev.x);
                const isPerfect = dx <= this.perfectPx;

                if (isPerfect) {
                    cur.rect.x = prev.x;
                    cur.x = prev.x;
                    cur.rect.width = prev.w;
                    cur.w = prev.w;
                    this.perfectStreak++;
                    const streakBonus = Math.min(3, this.perfectStreak);
                    this.bonus += streakBonus;
                    this._juicePerfect(cur.x, cur.y, streakBonus);
                    this._sound('perfect');
                } else {
                    this.perfectStreak = 0;
                    const prevL = prev.x - prev.w / 2, prevR = prev.x + prev.w / 2;
                    const curL  = cur.x - cur.w / 2,  curR  = cur.x + cur.w / 2;
                    const oL = Math.max(prevL, curL);
                    const oR = Math.min(prevR, curR);
                    const oW = oR - oL;

                    if (oW <= 0) {
                        this._sound('fail');
                        if (cur && cur.rect) cur.rect.destroy();
                        this.moving = null;
                        this._showLosePrompt();
                        return;
                    }

                    const newX = (oL + oR) / 2;
                    const newW = Math.max(this.minW, oW);
                    const overhangW = cur.w - newW;
                    if (overhangW > 1) {
                        const overhangOnRight = curR > prevR;
                        const pieceX = overhangOnRight ? (oR + overhangW / 2) : (oL - overhangW / 2);
                        const piece = this._makeBlock(pieceX, cur.y, overhangW, 0x94a3b8);
                        this.tweens.add({
                            targets: piece, y: piece.y + 400, angle: overhangOnRight ? 45 : -45,
                            alpha: 0, duration: 600, ease: 'Power2', onComplete: () => piece.destroy()
                        });
                    }
                    cur.rect.x = newX;
                    cur.x = newX;
                    cur.rect.width = newW;
                    this._juiceDrop(cur.x, cur.y);
                    this._sound('drop');
                }
                cur.rect.setFillStyle(0x64748b);
                this.stack.push({ x: cur.rect.x, y: cur.y, w: cur.rect.width, rect: cur.rect });
                this.moving = null;
                this.score++;
                this.uiScore.setText(`LĪMENIS: ${this.score}`);
                this.speed = Math.min(this.maxSpeed, this.speed + this.speedStep);
                this._cameraUp();
                if (this.score === 10 && !this.milestoneShown) {
                    this.milestoneShown = true;
                    if (typeof this._showMilestonePrompt === 'function') {
                        this._showMilestonePrompt();
                    } else {
                        // Fallback: stale cache / prototype mismatch — enable continue button silently
                        const continueBtn = document.getElementById('rtu-continue-btn');
                        if (continueBtn) continueBtn.disabled = false;
                    }
                    return;
                }
                this.time.delayedCall(100, () => this._spawnMoving(this.stack[this.stack.length - 1].w));
            }

            _cameraUp() {
                const { height } = this.scale;
                const top = this.stack[this.stack.length - 1];
                this.tweens.add({
                    targets: this.cameras.main, scrollY: top.y - height * 0.6,
                    duration: 300, ease: 'Cubic.easeOut'
                });
            }

            finish(success, opts) {
                if (this.isOver) return;
                this.isOver = true;
                if (this.timerEvent) this.timerEvent.remove(false);
                let points = success ? Math.max(RTU_TOWER_CFG.minPoints, Math.min(RTU_TOWER_CFG.maxPoints, this.score + this.bonus)) : 0;
                if (success && opts && typeof opts.multiplier === 'number') {
                    points = Math.max(1, Math.floor(points * opts.multiplier));
                }
                if (success) {
                    MinigameFX.flash(this, 200, 0xffb000);
                    this._sound('win');
                } else {
                    MinigameFX.shake(this, 200, 0.01);
                    this._sound('fail');
                }
                this.time.delayedCall(300, () => finalizeRTUTowerTask(points));
            }

            _makeBlock(x, y, w, color) {
                const r = this.add.rectangle(x, y, w, this.blockH, color, 1).setOrigin(0.5);
                r.setStrokeStyle(1, 0xffffff, 0.15);
                return r;
            }

            _juiceDrop(x, y) {
                MinigameFX.burst(this.particles, x, y, 10);
                MinigameFX.flash(this, 50, 0xffffff);
            }

            _juicePerfect(x, y, bonus) {
                MinigameFX.burst(this.particles, x, y, 20);
                MinigameFX.flash(this, 100, 0xffd700);
                MinigameFX.textPop(this, x, y - 20, `PERFEKTI +${bonus}`);
            }

            _sound(kind) {
                if (!this._audio) return;
                if (kind === 'drop')    this._audio.play(220, 0.06, 'square', 0.06);
                if (kind === 'perfect') this._audio.play(660, 0.09, 'triangle', 0.08);
                if (kind === 'win')     this._audio.play(880, 0.12, 'sine', 0.08);
                if (kind === 'fail')    this._audio.play(140, 0.18, 'sawtooth', 0.05);
            }

            _makeUIButton(x, y, label, onClick, opts) {
                const width = (opts && opts.width) || 220;
                const height = (opts && opts.height) || 44;
                const bg = this.add.rectangle(0, 0, width, height, 0x0b1020, 0.92)
                    .setStrokeStyle(2, 0xffb000, 0.9);
                const text = this.add.text(0, 0, label, {
                    fontFamily: 'Poppins, Arial',
                    fontSize: '16px',
                    fill: '#ffb000',
                    fontWeight: 'bold'
                }).setOrigin(0.5);
                const btn = this.add.container(x, y, [bg, text]);
                btn.setSize(width, height);
                btn.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
                btn.on('pointerdown', (ev) => {
                    if (ev && ev.event && ev.event.stopPropagation) ev.event.stopPropagation();
                    onClick();
                });
                return btn;
            }

            _showOverlay(title, subtitle, buttons) {
                if (this.overlay) this.overlay.destroy(true);
                this.isPaused = true;
                const { width, height } = this.scale;
                const overlay = this.add.container(0, 0);
                const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
                const panelW = Math.min(520, width * 0.9);
                const panelH = 220;
                const panel = this.add.rectangle(width / 2, height / 2, panelW, panelH, 0x0b1020, 0.92)
                    .setStrokeStyle(2, 0xffb000, 0.9);
                const titleText = this.add.text(width / 2, height / 2 - 65, title, {
                    fontFamily: 'Poppins, Arial',
                    fontSize: '22px',
                    fill: '#ffb000',
                    fontWeight: 'bold'
                }).setOrigin(0.5);
                const subtitleText = this.add.text(width / 2, height / 2 - 28, subtitle, {
                    fontFamily: 'Poppins, Arial',
                    fontSize: '14px',
                    fill: '#cbd5f5'
                }).setOrigin(0.5);
                overlay.add([dim, panel, titleText, subtitleText]);
                const btnY = height / 2 + 55;
                const gap = 16;
                const totalW = buttons.length * 200 + (buttons.length - 1) * gap;
                let startX = width / 2 - totalW / 2 + 100;
                buttons.forEach((b) => {
                    const btn = this._makeUIButton(startX, btnY, b.label, b.onClick, { width: 200, height: 44 });
                    overlay.add(btn);
                    startX += 200 + gap;
                });
                overlay.setScrollFactor(0);
                overlay.setDepth(1000);
                this.overlay = overlay;
            }

            _hideOverlay() {
                if (this.overlay) this.overlay.destroy(true);
                this.overlay = null;
                this.isPaused = false;
            }

            _showLosePrompt() {
                this._showOverlay(
                    'Oops! Nokrita',
                    'Mēģināt vēlreiz vai turpināt?',
                    [
                        { label: 'Mēģināt vēlreiz', onClick: () => this.scene.restart() },
                        { label: 'Turpināt →', onClick: () => this.finish(true, { multiplier: 0.6 }) }
                    ]
                );
            }

            _showMilestonePrompt() {
                const continueBtn = document.getElementById('rtu-continue-btn');
                if (continueBtn) continueBtn.disabled = false;
                this._showOverlay(
                    'Lieliski! 10 līmeņi!',
                    'Vai vēlies turpināt būvēt vai pabeigt uzdevumu?',
                    [
                        { label: 'Turpināt būvēt', onClick: () => { this._hideOverlay(); } },
                        { label: 'Pabeigt →', onClick: () => this.finish(true) }
                    ]
                );
            }
        }

        rtuTowerActive = true;
        rtuTowerPhaserGame = new Phaser.Game({
            type: Phaser.AUTO,
            parent: container,
            width: gameW,
            height: gameH,
            backgroundColor: '#0f172a',
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
            scene: [RTUTowerScene]
        });

        const onResize = () => {
            if (!rtuTowerPhaserGame || !rtuTowerPhaserGame.scale) return;
            const nww = window.innerWidth;
            const nwh = window.innerHeight;
            let nW = Math.min(920, nww * 0.92);
            let nH = Math.min(550, nwh * 0.55);
            if (nW / nH > 1.6) nW = nH * 1.6;
            rtuTowerPhaserGame.scale.resize(nW, nH);
        };
        window.addEventListener('resize', onResize);
        rtuTowerPhaserGame.events.once('destroy', () => {
            window.removeEventListener('resize', onResize);
        });
    }

    function finalizeRTUTowerTask(points) {
        if (!_ac.activeTask || _ac.taskType !== 'RTU') {
            _ac.addViolation();
            showNotification('Aizdomīga darbība!', 'error', 3000);
            return;
        }
        const guideWrap = document.querySelector('.guide-wrapper');
        if (guideWrap) guideWrap.style.display = '';
        rtuTowerActive = false;
        if (rtuTowerPhaserGame) {
            try { rtuTowerPhaserGame.destroy(true); } catch {}
            rtuTowerPhaserGame = null;
        }
        const mc = document.querySelector('#game-modal .modal-content');
        if (mc) mc.classList.remove('rtu-card');
        const guideHint = document.getElementById('guide-hint');
        if (guideHint) guideHint.textContent = getRandomBubble(true);
        GameState.addScore(points);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        recordMiniScore('RTU', points);
        _ac.activeTask = false;
        _ac.taskType = null;
        _taskCompletionLog.push({ task: 'RTU', time: Date.now() });

        document.getElementById('game-modal').style.display = 'none';
        GameState.completeTask();
        updateMapState();
        if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
    }

    // expose RTU Tower functions to global scope (defined in this scope)
    window.startRTUTowerGame = startRTUTowerGame;
    window.initRTUTowerGame = initRTUTowerGame;
    window.finalizeRTUTowerTask = finalizeRTUTowerTask;

    window.onerror = function(msg, src, line, col, err) {
        _blSend(msg, src, line, col, err && err.stack ? err.stack : '');
        return false;
    };

    window.addEventListener('unhandledrejection', function(e) {
        var r   = e.reason;
        var msg = r instanceof Error ? r.message : String(r);
        _blSend('UnhandledRejection: ' + msg, '', 0, 0,
                r instanceof Error && r.stack ? r.stack : '');
    });
})();

let currentTask = "";
let startTime; 
let myRole = '';
let myLobbyCode = '';
let myTeamName = '';
let globalName = "Anonīms";
let ws = null;
let quizWrongCount = 0;
let _serverGameToken = null;


// Network & multiplayer config
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_HOST = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? '127.0.0.1:8080' 
    : window.location.host;
const POLL_INTERVAL = 2000;
const WS_TIMEOUT = 3000;

const CONNECTION_MODE_PHP = 'php-polling';
const CONNECTION_MODE_WS = 'websocket';
let connectionMode = CONNECTION_MODE_PHP;

const BASE_TASK_SEQUENCE = [
    'Dzintars', 'Teatris', 'Kanals', 'Osta',
    'LSEZ', 'Mols', 'RTU', 'Cietums', 'Ezerkrasts', 'Parks'
];
const ROUTE_STORAGE_KEY = 'eksk_route_v1';

let taskSequence = [];

function shuffleArray(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

function buildRoute(lastLocation = 'Parks') {
    const pool = BASE_TASK_SEQUENCE.filter(x => x !== lastLocation);
    return [...shuffleArray(pool), lastLocation];
}

function loadRouteFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const routeParam = params.get('route');
    if (!routeParam) return null;
    const route = routeParam.split(',').map(x => x.trim()).filter(Boolean);
    if (route.length !== TOTAL_TASKS) return null;
    if (route[route.length - 1] !== 'Parks') return null;
    const uniq = new Set(route);
    if (uniq.size !== TOTAL_TASKS) return null;
    return route;
}

function initTaskSequence() {
    const fromUrl = loadRouteFromQuery();
    if (fromUrl) {
        taskSequence = fromUrl;
        sessionStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(fromUrl));
        return;
    }

    const saved = sessionStorage.getItem(ROUTE_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === TOTAL_TASKS && parsed[parsed.length - 1] === 'Parks') {
                taskSequence = parsed;
                return;
            }
        } catch {}
    }

    taskSequence = buildRoute('Parks');
    sessionStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(taskSequence));
}

initTaskSequence();

// Answer verification (hashed answers)
const _k = [76,105,101,112,196,129,106,97];
function _v(hex) {
    const b = [];
    for (let i = 0; i < hex.length; i += 2) b.push(parseInt(hex.substring(i, i + 2), 16));
    return new TextDecoder().decode(new Uint8Array(b.map((c, i) => c ^ _k[i % _k.length])));
}

// Score submission integrity token
const _sessionNonce = (function() {
    const arr = new Uint32Array(2);
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(arr);
    } else {
        arr[0] = (Math.random() * 0xFFFFFFFF) >>> 0;
        arr[1] = (Math.random() * 0xFFFFFFFF) >>> 0;
    }
    return arr[0].toString(36) + arr[1].toString(36);
})();
const _taskCompletionLog = [];
function _generateScoreToken(score, time, completedTasks) {
    const raw = `${_sessionNonce}:${score}:${time}:${completedTasks}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const chr = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return Math.abs(hash).toString(36) + '-' + _sessionNonce;
}

const questionsPool = {
    'RTU': [
        { q: "Kurā gadā dibināta Liepājas akadēmija?", _a: "7d505044", fact: "RTU Liepājas akadēmija dibināta 1954. gadā!" },
        { q: "Kāda IT studiju programma ir pieejama RTU Liepājā?", _a: "0808111fb6e80100", fact: "Datorika ir viena no populārākajām programmām RTU Liepājā!" },
        { q: "Kurā pilsētas daļā atrodas RTU Liepājas akadēmija?", _a: "2f0c0b04b645eb", fact: "RTU Liepājas akadēmija atrodas pašā pilsētas centrā!" }
    ],
    'Mols': [
        { q: "Cik metrus garš ir Ziemeļu mols?", _a: "7d515540", fact: "Ziemeļu mols ir aptuveni 1800 metrus garš!" },
        { q: "Ko cilvēki dara uz Ziemeļu mola? (makšķerē/peld)", _a: "21080eb56545dd043eadf6", fact: "Mols ir populāra makšķerēšanas vieta!" },
        { q: "Kuras ostas daļā atrodas Ziemeļu mols? (ziemeļu/dienvidu)", _a: "3600001da145d614", fact: "Mols atrodas ostas ziemeļu pusē." }
    ],
    'Cietums': [
        { q: "Kā sauc Karostas tūrisma cietumu?", _a: "0708171fb7f50b126c0a0c15b0f40712", fact: "Vienīgais militārais cietums atvērts tūristiem!" },
        { q: "Kurā gadā celts Karostas cietums?", _a: "7d505540", fact: "Cietums celts 1900. gadā cara armijas vajadzībām." },
        { q: "Kam sākotnēji bija paredzēts Karostas cietums? (armija/civīliem)", _a: "2d1b0819aee0", fact: "Cietums bija paredzēts cara armijas vajadzībām." }
    ],
    'Dzintars': [
        { q: "Kā sauc Liepājas koncertzāli?", _a: "0000001ca5e8194108130c1eb0e01812", fact: "Izskatās pēc milzīga dzintara gabala!" },
        { q: "Kurā gadā atklāta koncertzāle 'Lielais Dzintars'?", _a: "7e595445", fact: "Koncertzāle atklāta 2015. gadā." },
        { q: "Kura orķestra mājvieta ir Lielais Dzintars? (Simfoniskā/Kamermūzikas)", _a: "1f000816abef031227ade4", fact: "Liepājas Simfoniskais orķestris šeit uzstājas regulāri!" }
    ],
    'Teatris': [
        { q: "Kurā gadā dibināts Liepājas Teātris?", _a: "7d505547", fact: "Vecākais profesionālais teātris Latvijā!" },
        { q: "Kādā arhitektūras stilā celta Liepājas Teātra ēka?", _a: "26acce17a1ef0e1238000903", fact: "Teātra ēka ir skaists jūgendstila piemērs!" },
        { q: "Vai Liepājas Teātris ir vecākais profesionālais teātris Latvijā? (Jā/Nē)", _a: "06ade4", fact: "Dibināts 1907. gadā — vecākais profesionālais teātris!" }
    ],
    'Kanals': [
        { q: "Kā sauc kanālu starp ezeru un jūru?", _a: "18001714beef03042fadce12a5f2", fact: "Tirdzniecības kanāls savieno ezeru ar jūru." },
        { q: "Kopš kura gadsimta kalpo Tirdzniecības kanāls?", _a: "7d5f", fact: "Kanāls kalpo kopš 16. gadsimta!" },
        { q: "Ko Tirdzniecības kanāls savieno? (ezeru un jūru/upes)", _a: "29130002b1a11f0f6c03a0dbb6f4", fact: "Kanāls savieno Liepājas ezeru ar Baltijas jūru." }
    ],
    'Osta': [
        { q: "Kā sauc Liepājas speciālo zonu?", _a: "003a202a", fact: "Osta šeit neaizsalst!" },
        { q: "Vai Liepājas osta aizsalst ziemā? (Jā/Nē)", _a: "02adf6", fact: "Liepājas osta neaizsalst — unikāla iezīme!" },
        { q: "Kā sauc ostas speciālo ekonomisko zonu? (LSEZ/LREZ)", _a: "003a202a", fact: "Liepājas Speciālā ekonomiskā zona piesaista investorus." }
    ],
    'Parks': [
        { q: "Kā sauc parku pie jūras?", _a: "06acce02a9e006003f", fact: "Viens no lielākajiem parkiem Latvijā!" },
        { q: "Kurā gadsimtā ierīkots Jūrmalas parks?", _a: "7d50", fact: "Parks ierīkots 19. gadsimta beigās." },
        { q: "Cik koku un krūmu sugu aug Jūrmalas parkā? (170/50/300)", _a: "7d5e55", fact: "Parkā aug vairāk nekā 170 koku un krūmu sugas!" }
    ],
    'LSEZ': [
        { q: "Vai UPB ir Liepājas uzņēmums (Jā/Nē)?", _a: "06ade4", fact: "UPB būvē ēkas visā pasaulē!" },
        { q: "Kurā gadā izveidota LSEZ?", _a: "7d505c47", fact: "LSEZ izveidota 1997. gadā." },
        { q: "Cik uzņēmumi darbojas LSEZ teritorijā? (80/20/200)", _a: "7459", fact: "Vairāk nekā 80 uzņēmumi darbojas LSEZ!" }
    ],
    'Ezerkrasts': [
        { q: "Kāda ezera krastā ir taka?", _a: "00000000000000003f", fact: "Liepājas ezers ir piektais lielākais Latvijā." },
        { q: "Kurš lielākais ezers Latvijā ir Liepājas ezers? (5./3./7.)", _a: "7947", fact: "Liepājas ezers ir piektais lielākais Latvijā!" },
        { q: "Ko var vērot no Ezerkrasta takas skatu platformām? (putnus/zivis)", _a: "3c1c111eb1f2", fact: "Taka piedāvā skatu platformas putnu vērošanai!" }
    ]
};

const questions = {};
for (const loc in questionsPool) {
    const pool = questionsPool[loc];
    questions[loc] = pool[Math.floor(Math.random() * pool.length)];
}

const locationInfo = {
    'RTU': {
        name: 'RTU Liepājas akadēmija',
        desc: 'Rīgas Tehniskās universitātes Liepājas akadēmija (dibināta 1954. gadā) ir viena no nozīmīgākajām augstākās izglītības iestādēm Kurzemē. Tā piedāvā studiju programmas inženierzinātnēs, IT (Datorika), ekonomikā un humanitārajās zinātnēs. Studiju programma "Datorika" ietver programmēšanu, datoru tīklus, datu bāzes un mākslīgo intelektu.'
    },
    'Dzintars': {
        name: 'Koncertzāle "Lielais Dzintars"',
        desc: 'Liepājas koncertzāle "Lielais Dzintars" ir moderna daudzfunkcionāla koncertzāle, kas atklāta 2015. gadā. Ēkas unikālais dizains atgādina milzīgu dzintara gabalu. Šeit regulāri notiek Liepājas Simfoniskā orķestra koncerti, starptautiski festivāli un kultūras pasākumi.'
    },
    'Teatris': {
        name: 'Liepājas Teātris',
        desc: 'Liepājas Teātris, dibināts 1907. gadā, ir vecākais profesionālais teātris Latvijā. Teātris atrodas skaistā jūgendstila ēkā Liepājas centrā. Tas ir nozīmīgs kultūras centrs, kurā tiek iestudētas gan klasiskās, gan mūsdienu lugas.'
    },
    'Kanals': {
        name: 'Tirdzniecības kanāls',
        desc: 'Tirdzniecības kanāls savieno Liepājas ezeru ar Baltijas jūru. Tas ir vēsturiski nozīmīgs ūdensceļš, kas jau kopš 16. gadsimta kalpojis tirdzniecības vajadzībām. Gar kanāla krastiem ir populāra pastaigu vieta ar skaistiem skatiem.'
    },
    'Osta': {
        name: 'Liepājas Osta',
        desc: 'Liepājas osta ir viena no lielākajām un nozīmīgākajām Latvijas ostām. Tā ir unikāla, jo neaizsalst ziemā, pateicoties īpašiem strāvojumu apstākļiem. Ostā darbojas Liepājas Speciālā ekonomiskā zona (LSEZ), kas piesaista starptautiskus uzņēmumus.'
    },
    'LSEZ': {
        name: 'Liepājas Speciālā ekonomiskā zona (LSEZ)',
        desc: 'LSEZ ir izveidota 1997. gadā, lai veicinātu Liepājas reģiona ekonomisko attīstību. Zonā darbojas vairāk nekā 80 uzņēmumi, tostarp UPB — starptautisks būvniecības uzņēmums, kas realizē projektus visā pasaulē. LSEZ piedāvā nodokļu atvieglojumus investoriem.'
    },
    'Cietums': {
        name: 'Karostas cietums',
        desc: 'Karostas cietums ir unikāla tūrisma vieta — vienīgais bijušais militārais cietums Eiropā, kas atvērts apmeklētājiem. Cietums celts 1900. gadā cara armijas vajadzībām. Šobrīd tas piedāvā ekskursijas un nakšņošanas pieredzi autentiskā cietuma vidē.'
    },
    'Mols': {
        name: 'Ziemeļu mols',
        desc: 'Ziemeļu mols ir aptuveni 1800 metrus garš akmeņu mols Liepājas ostas ziemeļu daļā. Tas ir populāra pastaigu un makšķerēšanas vieta. No mola paveras brīnišķīgs skats uz Baltijas jūru un Liepājas piekrasti.'
    },
    'Ezerkrasts': {
        name: 'Ezerkrasta taka',
        desc: 'Ezerkrasta taka atrodas pie Liepājas ezera — piektā lielākā ezera Latvijā. Taka piedāvā skaistu pastaigu maršrutu gar ezera krastu ar skatu platformām un informatīviem stendiem par apkārtnes dabu un putniem.'
    },
    'Parks': {
        name: 'Jūrmalas parks',
        desc: 'Jūrmalas parks ir viens no lielākajiem un vecākajiem parkiem Latvijā, ierīkots 19. gadsimta beigās. Parks atrodas starp pilsētas centru un jūras piekrasti. Tajā aug vairāk nekā 170 koku un krūmu sugas, un parks ir iecienīta atpūtas vieta.'
    }
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    getQueryParams();
    startTime = Date.now();
    initTheme();
    initBackground();

    if (!window.location.pathname.match(/admin\.php$/)) {
        fetch('src/php/start_game.php', { method: 'POST', credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.token) _serverGameToken = d.token; })
            .catch(() => {});
    }
    
    const pathname = window.location.pathname;
    const needsConnection = (pathname.endsWith('index.html') || pathname === '/' || pathname.endsWith('/')) || 
                          (myRole && myLobbyCode);
    
    if (needsConnection) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.style.display = 'block';
        }
        
        initSmartConnection();
    }
    
    if(document.querySelector('.point')) updateMapState();

    // Before-game intro modal
    const beforeGameModal = document.getElementById('before-game-modal');
    if (beforeGameModal) {
        beforeGameModal.style.display = 'block';
        const continueBtn = document.getElementById('btn-before-game-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', function() {
                beforeGameModal.style.display = 'none';
            });
        }
    }

    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        document.querySelectorAll('.point').forEach(p => {
            p.addEventListener('mouseover', (e) => {
                tooltip.innerText = p.getAttribute('data-name');
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
            });
            p.addEventListener('mousemove', (e) => { 
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
            });
            p.addEventListener('mouseout', () => { tooltip.style.display = 'none'; });
        });
    }
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        const savedSFXVolume = localStorage.getItem('sfxVolume');
        sfx.volume = savedSFXVolume ? savedSFXVolume / 100 : 0.2;
    }

    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        const savedMusicVolume = localStorage.getItem('musicVolume');
        bgMusic.volume = savedMusicVolume ? savedMusicVolume / 100 : 0.3;
        bgMusic.muted = true;
        const startMusic = (e) => {
            const gm = document.getElementById('game-modal');
            if (gm && gm.style.display === 'block') return;
            bgMusic.muted = false;
            bgMusic.play().catch(() => {});
            document.removeEventListener('click', startMusic);
            document.removeEventListener('keydown', startMusic);
        };
        document.addEventListener('click', startMusic);
        document.addEventListener('keydown', startMusic);
    }

    document.querySelectorAll('.btn, .btnMini, .theme-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            if (sfx && sfx.volume > 0) {
                sfx.currentTime = 0;
                sfx.play().catch(() => {});
            }
        });
    });

    const musicSlider = document.querySelector('input[oninput*="setMusicVolume"]');
    if (musicSlider) {
        const savedMusicVolume = localStorage.getItem('musicVolume');
        musicSlider.value = savedMusicVolume || 30;
    }

    const sfxSlider = document.querySelector('input[oninput*="setSFXVolume"]');
    if (sfxSlider) {
        const savedSFXVolume = localStorage.getItem('sfxVolume');
        sfxSlider.value = savedSFXVolume || 50;
    }
    initAnimationToggle();
    if (animationsEnabled) {
        initCursorTrail();
    }
});

// --- Connection manager (WebSocket + PHP polling) ---

async function initSmartConnection() {
    updateConnectionStatus('reconnecting');
    
    const wsAvailable = await tryWebSocketConnection();

    if (wsAvailable) {
        connectionMode = CONNECTION_MODE_WS;
        updateConnectionStatus('connected');
        showNotification('WebSocket detected', 'success', 2000);
        if (myRole && myLobbyCode && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'rejoin', code: myLobbyCode, role: myRole }));
        }
        return;
    }

    connectionMode = CONNECTION_MODE_PHP;
    initPHPPolling();
    showNotification('Multiplayer gatavs!', 'success', 2000);
}

function tryWebSocketConnection() {
    return new Promise((resolve) => {
        let finished = false;
        const timeout = setTimeout(() => {
            if (finished) return;
            finished = true;
            if (ws) {
                ws.onopen = ws.onerror = ws.onclose = null;
                ws.close();
            }
            resolve(false);
        }, WS_TIMEOUT);
        
        try {
            const wsUrl = `${WS_PROTOCOL}://${WS_HOST}`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                setupWebSocketHandlers();
                resolve(true);
            };
            
            ws.onerror = () => {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                resolve(false);
            };
            
            ws.onclose = () => {
                if (finished) return;
                if (connectionMode === CONNECTION_MODE_WS) {
                    setTimeout(() => {
                        if (connectionMode === CONNECTION_MODE_WS) {
                            connectWebSocket();
                        }
                    }, 2000);
                }
            };
        } catch (error) {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            resolve(false);
        }
    });
}

function setupWebSocketHandlers() {
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (e) {
        }
    };
}

function handleWebSocketMessage(data) {
    if (data.type === 'created') {
        myLobbyCode = data.code;
        const lobbyCodeEl = document.getElementById('lobby-code');
        if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
        toggleModal('mode-modal');
        setTimeout(() => { toggleModal('lobby-modal'); }, 100);
    }
    else if (data.type === 'guest_joined') {
        myRole = 'host';
        const waitEl = document.getElementById('lobby-wait');
        if (waitEl) {
            waitEl.innerHTML = 'Spēlētājs pievienojās!<br><button class="btn" id="btn-host-ready" style="margin-top:15px;" onclick="sendLobbyReady()">Esmu gatavs!</button><p id="lobby-ready-status" style="color:#ccc;margin-top:10px;"></p>';
        }
    }
    else if (data.type === 'joined_lobby') {
        myRole = 'guest';
        myLobbyCode = data.code;
        toggleModal('mode-modal');
        setTimeout(() => {
            toggleModal('lobby-modal');
            const lobbyCodeEl = document.getElementById('lobby-code');
            if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
            const waitEl = document.getElementById('lobby-wait');
            if (waitEl) {
                waitEl.innerHTML = 'Pievienojies istabai!<br><button class="btn" id="btn-guest-ready" style="margin-top:15px;" onclick="sendLobbyReady()">Esmu gatavs!</button><p id="lobby-ready-status" style="color:#ccc;margin-top:10px;"></p>';
            }
        }, 100);
    }
    else if (data.type === 'player_ready') {
        const statusEl = document.getElementById('lobby-ready-status');
        if (statusEl) statusEl.innerText = 'Otrs spēlētājs ir gatavs!';
    }
    else if (data.type === 'start_game') {
        myRole = data.role;
        myTeamName = data.teamName || '';
        showNotification(`Spēle sākas! Tava loma: ${myRole}`, 'success');
        setTimeout(() => {
            const routeParam = Array.isArray(data.route) ? `&route=${encodeURIComponent(data.route.join(','))}` : '';
            location.href = `map.html?mode=multi&role=${myRole}&code=${myLobbyCode}&name=${encodeURIComponent(globalName)}${routeParam}`;
        }, 1500);
    }
    else if (data.type === 'sync_complete') {
        const statusEl = document.getElementById('partner-status');
        if (statusEl) statusEl.innerText = "Partneris gatavs!";
        setTimeout(() => { showQuiz(currentTask); }, 1000);
    }
    else if (data.type === 'error') {
        showNotification(data.msg, 'error');
    }
    else if (data.type === 'player_disconnected') {
        showNotification(data.msg, 'warning');
    }
}

let wsReconnectAttempts = 0;
const wsMaxReconnectAttempts = 5;
const wsBaseReconnectDelay = 1000;
let wsReconnectTimeout = null;

function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return;
    }

    try {
        const wsUrl = `${WS_PROTOCOL}://${WS_HOST}`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            wsReconnectAttempts = 0;
            updateConnectionStatus('connected');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch {
            }
        };
        
        ws.onerror = () => {
            updateConnectionStatus('error');
        };
        
        ws.onclose = () => {
            updateConnectionStatus('disconnected');
            if (wsReconnectAttempts < wsMaxReconnectAttempts) {
                const delay = wsBaseReconnectDelay * Math.pow(2, wsReconnectAttempts);
                wsReconnectAttempts++;
                
                updateConnectionStatus('reconnecting');
                
                wsReconnectTimeout = setTimeout(() => {
                    connectWebSocket();
                }, delay);
            } else {
                showNotification("Nav iespējams izveidot savienojumu ar serveri. Lūdzu, pārlādējiet lapu.", 'error');
            }
        };
    } catch {
        updateConnectionStatus('error');
    }
}

function updateConnectionStatus(status) {
    const indicator = document.getElementById('connection-status');
    if (!indicator) return;
    
    indicator.className = 'connection-status ' + status;
    
    const statusText = {
        'connected': '● Savienots',
        'disconnected': '○ Atvienots',
        'reconnecting': '◐ Atjauno...',
        'error': 'Kļūda'
    };
    
    indicator.textContent = statusText[status] || '';
    indicator.title = statusText[status] || '';
}

// --- PHP polling fallback ---

let pollInterval = null;
let phpPolling = false;

function initPHPPolling() {
    phpPolling = true;
    updateConnectionStatus('connected');
}

function createLobbyPHP() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    fetch(`src/php/lobby.php?action=create&code=${code}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                myLobbyCode = data.code;
                const lobbyCodeEl = document.getElementById('lobby-code');
                if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
                toggleModal('mode-modal');
                setTimeout(() => { toggleModal('lobby-modal'); }, 100);
                startLobbyPolling();
            }
        })
        .catch(error => {
            showNotification('Neizdevās izveidot lobby', 'error');
        });
}

function joinLobbyPHP(code) {
    fetch(`src/php/lobby.php?action=join&code=${code}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                myLobbyCode = code;
                myRole = 'guest';
                showNotification('Pievienojies lobby!', 'success');
                setTimeout(() => {
                    location.href = `map.html?mode=multi&role=guest&code=${code}&name=${encodeURIComponent(globalName)}`;
                }, 1500);
            } else {
                showNotification('Lobby nav atrasts vai jau pilns', 'error');
            }
        })
        .catch(error => {
            showNotification('Neizdevās pievienoties', 'error');
        });
}

function startLobbyPolling() {
    let pollCount = 0;
    const maxPolls = 60;
    
    pollInterval = setInterval(() => {
        pollCount++;
        
        if (pollCount > maxPolls) {
            clearInterval(pollInterval);
            showNotification('Laiks beidzies, lobby aizvērts', 'error');
            return;
        }
        
        fetch(`src/php/lobby.php?action=check&code=${myLobbyCode}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ready') {
                    clearInterval(pollInterval);
                    myRole = 'host';
                    showNotification('Spēlētājs pievienojās!', 'success');
                    setTimeout(() => {
                        location.href = `map.html?mode=multi&role=host&code=${myLobbyCode}&name=${encodeURIComponent(globalName)}`;
                    }, 1500);
                }
            })
    }, POLL_INTERVAL);
}

function notifyPartnerPHP(role, code) {
    fetch(`src/php/lobby.php?action=update_game&code=${code}&role=${role}`)
        .then(response => response.json())
        .then(() => {
            checkBothPlayersDonePHP(code);
        })
}

function checkBothPlayersDonePHP(code) {
    const checkInterval = setInterval(() => {
        fetch(`src/php/lobby.php?action=get_state&code=${code}`)
            .then(response => response.json())
            .then(data => {
                if (data.host_done && data.guest_done) {
                    clearInterval(checkInterval);
                    const statusEl = document.getElementById('partner-status');
                    if (statusEl) statusEl.innerText = "Partneris gatavs!";
                    fetch(`src/php/lobby.php?action=reset_task&code=${code}`)
                        .then(() => {
                            setTimeout(() => { showQuiz(currentTask); }, 1000);
                        });
                }
            })
    }, 1000);
    
    setTimeout(() => {
        clearInterval(checkInterval);
        const taskEl = document.querySelector('.task-section');
        if (taskEl && taskEl.innerHTML.includes('Gaidam')) {
            taskEl.innerHTML = '<h2>Laiks beidzās</h2><p>Partneris neatbildēja laikā.</p><button class="btn btn-full" id="btn-timeout-continue">Turpināt</button>';
            const btn = document.getElementById('btn-timeout-continue');
            if (btn) btn.addEventListener('click', function() { showQuiz(currentTask); });
        }
    }, 30000);
}

// --- Menu & navigation ---

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    myRole = params.get('role');
    myLobbyCode = params.get('code');
    const nameFromUrl = params.get('name');
    if (nameFromUrl) globalName = decodeURIComponent(nameFromUrl);
}

function validateName() {
    const nameInput = document.getElementById('start-player-name');
    if (!nameInput) return globalName;
    let name = nameInput.value.trim();
    if (!name) { showNotification("Lūdzu ievadi Vārdu!", 'warning'); return null; }
    if (name.length > 8) name = name.substring(0, 8);
    return name;
}

function startSingleGame() {
    const name = validateName();
    if (name) location.href = `map.html?name=${encodeURIComponent(name)}`;
}

function openLobby() {
    const name = validateName();
    if (!name) return;
    globalName = name;
    
    if (connectionMode === CONNECTION_MODE_PHP) {
        createLobbyPHP();
    } else if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'create', name: globalName }));
    } else {
        showNotification("Savienojums nav pieejams! Lūdzu, uzgaidiet...", 'error');
    }
}

function joinGame() {
    const name = validateName(); 
    if (!name) return;
    globalName = name;
    const codeInput = document.getElementById('join-code').value;
    
    if (!codeInput || codeInput.length !== 4) {
        showNotification("Lūdzu, ievadi derīgu 4-ciparu kodu!", 'error');
        return;
    }

    if (connectionMode === CONNECTION_MODE_PHP) {
        joinLobbyPHP(codeInput);
    } else if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        myLobbyCode = codeInput;
        ws.send(JSON.stringify({ action: 'join', code: codeInput, name: globalName }));
    } else {
        showNotification("Savienojums nav pieejams! Lūdzu, uzgaidiet...", 'error');
    }
}

// --- Map state & game flow ---

function updateMapState() {
    const points = document.querySelectorAll('.point');
    const completed = GameState.getCompleted();
    points.forEach(point => {
        const onclickAttr = point.getAttribute('onclick');
        if (!onclickAttr) return;
        
        const match = onclickAttr.match(/'([^']+)'/);
        if (!match || !match[1]) return;
        
        const type = match[1];
        const sequenceIndex = taskSequence.indexOf(type);
        
        point.className = point.className.replace(/\b(active-point|inactive-point)\b/g, "");
        if (sequenceIndex < completed) {
            point.classList.add('inactive-point'); point.style.backgroundColor = "#555"; 
        } else if (sequenceIndex === completed) {
            point.classList.add('active-point'); point.style.pointerEvents = "auto";
        } else {
            point.classList.add('inactive-point');
        }
    });
}

function startActivity(type) {
    if (type !== taskSequence[GameState.getCompleted()]) { showNotification("Lūdzu, izpildi uzdevumus pēc kārtas!", 'warning'); return; }
    currentTask = type;
    _ac.activeTask = true;
    _ac.taskType = type;

    if (type === 'Osta') showLocationThenStart(type, function() { startBoatGame(); });
    else if (type === 'RTU') showLocationThenStart(type, function () { window.startRTUTowerGame(); });
    else if (type === 'Teatris') showLocationThenStart(type, function() { startHistorySequence(); });
    else if (type === 'Mols') showLocationThenStart(type, function() { startFishingGame(); });
    else if (type === 'Dzintars') showLocationThenStart(type, function() { startSimonGame(); });
    else if (type === 'Kanals') showLocationThenStart(type, function() { startKanalGame(); });
    else if (type === 'LSEZ') showLocationThenStart(type, function() { startLSEZGame(); });
    else if (type === 'Ezerkrasts') showLocationThenStart(type, function() { startBirdGame(); });
    else if (type === 'Parks') showLocationThenStart(type, function() { startMemoryGame(); });
    else if (myRole && myLobbyCode) showLocationThenStart(type, function() { showMiniGame(type); });
    else if (type === 'Cietums') showLocationThenStart(type, function() { startEscapeGame(); });
    else showLocationThenStart(type, function() { showQuiz(type); });
}

function showLocationThenStart(type, callback) {
    const info = locationInfo[type];
    if (!info) { callback(); return; }
    
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <div class="location-info">
            <h3>${info.name}</h3>
            <p>${info.desc}</p>
        </div>
        <button class="btn btn-full" id="btn-start-task">Turpināt uz uzdevumu →</button>
    `;
    document.getElementById('btn-start-task').addEventListener('click', function() {
        document.getElementById('game-modal').style.display = 'none';
        callback();
    });
}

// --- Mini-games & quiz ---

const BOAT_RACE_CONFIG = {
    REQUIRED_PRESSES: 10,
    EXCELLENT_TIME: 3,
    GOOD_TIME: 5,
    SLOW_TIME: 10,
    EXCELLENT_POINTS: 15,
    GOOD_POINTS: 12,
    NORMAL_POINTS: 10,
    SLOW_POINTS: 5
};

let boatRaceActive = false;
let boatStartTime = 0;
let boatSpaceCount = 0;
let boatInterval = null;

function startBoatGame() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const instruction = isTouchDevice 
        ? `Spied pogu ${BOAT_RACE_CONFIG.REQUIRED_PRESSES} reizes pēc iespējas ātrāk!`
        : `Spied SPACE taustiņu ${BOAT_RACE_CONFIG.REQUIRED_PRESSES} reizes pēc iespējas ātrāk!`;
    
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Ostas Regate</h2>
        <p>${instruction}</p>
        <h3 id="boat-timer">0.00 s</h3>
        <p id="boat-progress">Spiedienu skaits: 0/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}</p>
        <button class="btn btn-full" onclick="initBoatRace()">SĀKT</button>`;
}

function initBoatRace() {
    boatRaceActive = true;
    boatStartTime = Date.now();
    boatSpaceCount = 0;
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const actionText = isTouchDevice ? 'SPIED POGU!' : 'SPIED SPACE!';
    document.removeEventListener('keydown', handleBoatKeyPress);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Ostas Regate</h2>
        <p style="color: #ffaa00; font-size: 24px; font-weight: bold;">${actionText}</p>
        <h3 id="boat-timer">0.00 s</h3>
        <p id="boat-progress" style="font-size: 20px;">Spiedienu skaits: 0/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}</p>
        <button id="boat-tap-btn" class="boat-tap-btn">SPIED!</button>`;
    
    boatInterval = setInterval(() => {
        if (boatRaceActive) {
            const elapsed = ((Date.now() - boatStartTime) / 1000).toFixed(2);
            const timerEl = document.getElementById('boat-timer');
            if (timerEl) timerEl.innerText = elapsed + ' s';
        }
    }, 50);
    document.addEventListener('keydown', handleBoatKeyPress);
    const tapBtn = document.getElementById('boat-tap-btn');
    if (tapBtn) {
        tapBtn.addEventListener('touchstart', handleBoatTap, { passive: false });
        tapBtn.addEventListener('mousedown', handleBoatTap);
    }
}

function handleBoatTap(e) {
    if (e.cancelable) e.preventDefault();
    if (!boatRaceActive) return;
    registerBoatPress();
}

function handleBoatKeyPress(e) {
    if (!boatRaceActive) return;
    
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        registerBoatPress();
    }
}

function registerBoatPress() {
    if (!boatRaceActive) return;
    boatSpaceCount++;
    
    const progressEl = document.getElementById('boat-progress');
    if (progressEl) progressEl.innerText = `Spiedienu skaits: ${boatSpaceCount}/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}`;
    const tapBtn = document.getElementById('boat-tap-btn');
    if (tapBtn) {
        tapBtn.style.transform = 'scale(0.9)';
        setTimeout(() => { if (tapBtn) tapBtn.style.transform = 'scale(1)'; }, 100);
    }
    
    if (boatSpaceCount >= BOAT_RACE_CONFIG.REQUIRED_PRESSES) {
        finishBoatRace();
    }
}

function finishBoatRace() {
    boatRaceActive = false;
    clearInterval(boatInterval);
    document.removeEventListener('keydown', handleBoatKeyPress);
    
    const finalTime = ((Date.now() - boatStartTime) / 1000).toFixed(2);
    let points = BOAT_RACE_CONFIG.NORMAL_POINTS;
    if (finalTime < BOAT_RACE_CONFIG.EXCELLENT_TIME) {
        points = BOAT_RACE_CONFIG.EXCELLENT_POINTS;
    } else if (finalTime < BOAT_RACE_CONFIG.GOOD_TIME) {
        points = BOAT_RACE_CONFIG.GOOD_POINTS;
    } else if (finalTime > BOAT_RACE_CONFIG.SLOW_TIME) {
        points = BOAT_RACE_CONFIG.SLOW_POINTS;
    }
    
    const newScore = GameState.addScore(points);
    
    document.getElementById('score-display').innerText = "Punkti: " + newScore;
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Pabeigts!</h2>
        <p>Tavs laiks: ${finalTime} sekundes</p>
        <p style="color: #ffaa00;">+${points} punkti!</p>
        <p style="color:#ffaa00;font-style:italic;">${questions['Osta'].fact}</p>
        <button class="btn btn-full" onclick="closeBoatGame()">Turpināt</button>`;
}

function closeBoatGame() { 
    if (!_ac.activeTask || _ac.taskType !== 'Osta') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    recordMiniScore('Osta', 10);
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Osta', time: Date.now() });
    boatRaceActive = false;
    if (boatInterval) clearInterval(boatInterval);
    document.removeEventListener('keydown', handleBoatKeyPress);
    document.getElementById('game-modal').style.display = 'none'; 
    GameState.completeTask(); 
    updateMapState(); 
    if(GameState.getCompleted() === TOTAL_TASKS) showFinalTest(); 
}

let antsCaught = 0;
let antGameTimer = null;
let antGameActive = false;
const ANTS_REQUIRED = 5;
const ANT_GAME_TIME = 15; 
function startAntGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>RTU Bioloģijas uzdevums</h2>
        <p>Studiju programmā "Bioloģijas" studenti mācās risināt problēmas ātri un precīzi.</p>
        <p>Noķer ${ANTS_REQUIRED} kukaiņus ${ANT_GAME_TIME} sekunžu laikā!</p>
        <button class="btn btn-full" onclick="initAntGame()">SĀKT</button>
    `;
}

function initAntGame() {
    antGameActive = true;
    antsCaught = 0;
    let timeLeft = ANT_GAME_TIME;
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Ķer kukaiņus!</h2>
        <p id="ant-timer" style="color: #ffaa00; font-size: 20px;">Laiks: ${timeLeft}s</p>
        <p id="ant-count" style="font-size: 18px;">Noķerti: 0/${ANTS_REQUIRED}</p>
        <div id="ant-field" style="position: relative; width: 100%; height: 250px; background: rgba(255,170,0,0.08); border: 2px solid rgba(255,170,0,0.4); border-radius: 10px; overflow: hidden; cursor: crosshair;"></div>
    `;
    
    antGameTimer = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('ant-timer');
        if (timerEl) timerEl.textContent = `Laiks: ${timeLeft}s`;
        if (timeLeft <= 0) finishAntGame(false);
    }, 1000);
    
    spawnAnt();
}

function spawnAnt() {
    if (!antGameActive) return;
    const field = document.getElementById('ant-field');
    if (!field) return;
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const antSize = isTouchDevice ? 44 : 28;
    const moveInterval = isTouchDevice ? 1400 : 800;
    
    const ant = document.createElement('div');
    ant.className = 'game-ant';
    ant.textContent = '🐛';
    ant.style.cssText = `position: absolute; font-size: ${antSize}px; cursor: pointer; user-select: none; transition: all 0.3s ease; z-index: 10; padding: ${isTouchDevice ? '8px' : '0'};`;
    ant.style.left = Math.random() * 85 + '%';
    ant.style.top = Math.random() * 85 + '%';
    
    ant.addEventListener('click', function(e) {
        e.preventDefault();
        if (!antGameActive) return;
        antsCaught++;
        this.textContent = '💥';
        setTimeout(() => { if (this.parentNode) this.parentNode.removeChild(this); }, 200);
        
        const countEl = document.getElementById('ant-count');
        if (countEl) countEl.textContent = `Noķerti: ${antsCaught}/${ANTS_REQUIRED}`;
        
        if (antsCaught >= ANTS_REQUIRED) { finishAntGame(true); }
        else { setTimeout(spawnAnt, 300); }
    });
    
    field.appendChild(ant);
    const moveAnt = setInterval(() => {
        if (!antGameActive || !ant.parentNode) { clearInterval(moveAnt); return; }
        ant.style.left = Math.random() * 85 + '%';
        ant.style.top = Math.random() * 85 + '%';
    }, moveInterval);
    if (antsCaught > 2 && antGameActive) setTimeout(() => { if (antGameActive) spawnAnt(); }, 2000);
}

function finishAntGame(success) {
    antGameActive = false;
    if (antGameTimer) clearInterval(antGameTimer);
    
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(success);
    
    if (success) {
        GameState.addScore(10);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Lielisks darbs!</h2>
            <p>Noķerti kukaiņi: ${antsCaught}/${ANTS_REQUIRED}</p>
            <p style="color: #ffaa00;">+10 punkti</p>
            <p style="color: #ffaa00; font-style: italic;">${questions['RTU'].fact}</p>
            <button class="btn btn-full" onclick="closeAntGame()">Turpināt</button>
        `;
    } else {
        GameState.addScore(-5);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Laiks beidzies!</h2>
            <p>Noķerti kukaiņi: ${antsCaught}/${ANTS_REQUIRED}</p>
            <p style="color: #ff7777;">-5 punkti. Mēģini vēlreiz!</p>
            <button class="btn btn-full" onclick="initAntGame()">Mēģināt vēlreiz</button>
        `;
    }
}

function closeAntGame() {
    if (!_ac.activeTask || _ac.taskType !== 'RTU') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    recordMiniScore('RTU', 10);
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'RTU', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

const historyEvents = [
    { year: 1625, text: "Liepāja iegūst pilsētas tiesības" },
    { year: 1907, text: "Dibināts Liepājas Teātris" },
    { year: 2015, text: "Atklāta koncertzāle 'Lielais Dzintars'" }
];

function startHistorySequence() {
    document.getElementById('game-modal').style.display = 'block';
    
    const shuffled = [...historyEvents].sort(() => Math.random() - 0.5);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Vēsturiskā secība</h2>
        <p>Sakārto notikumus hronoloģiskā secībā (no senākā uz jaunāko)!</p>
        <div id="history-slots" style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">
            ${shuffled.map((ev, i) => `
                <div class="history-item" draggable="true" data-year="${ev.year}" 
                     style="background: rgba(0,0,0,0.3); border: 2px solid #ffaa00; border-radius: 8px; padding: 12px; cursor: grab; user-select: none; display: flex; align-items: center; gap: 10px;">
                    <span style="color: #ffaa00; font-weight: bold; font-size: 18px;">${i + 1}.</span>
                    <span>${ev.text}</span>
                </div>
            `).join('')}
        </div>
        <p style="font-size: 12px; color: #aaa;">Spied uz notikumiem lai pārvietotu augšup</p>
        <button class="btn btn-full" onclick="checkHistorySequence()">Iesniegt secību</button>
    `;
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', function() {
            const container = document.getElementById('history-slots');
            const items = Array.from(container.querySelectorAll('.history-item'));
            const idx = items.indexOf(this);
            if (idx > 0) {
                container.insertBefore(this, items[idx - 1]);
                container.querySelectorAll('.history-item').forEach((el, i) => {
                    el.querySelector('span').textContent = (i + 1) + '.';
                });
            }
        });
    });
}

function checkHistorySequence() {
    const items = document.querySelectorAll('.history-item');
    const years = Array.from(items).map(item => parseInt(item.getAttribute('data-year')));
    const isCorrect = years.every((year, i) => i === 0 || year >= years[i - 1]);
    
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(isCorrect);
    
    if (isCorrect) {
        GameState.addScore(10);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        const correctOrder = [...historyEvents].sort((a, b) => a.year - b.year);
        document.querySelector('.task-section').innerHTML = `
            <h2>Pareizi!</h2>
            <p>Pareizā secība:</p>
            <ol style="margin: 10px 0; padding-left: 20px;">
                ${correctOrder.map(ev => `<li>${ev.year}. g. — ${ev.text}</li>`).join('')}
            </ol>
            <p style="color: #ffaa00;">+10 punkti</p>
            <p style="color: #ffaa00; font-style: italic;">${questions['Teatris'].fact}</p>
            <button class="btn btn-full" onclick="closeHistoryGame()">Turpināt</button>
        `;
    } else {
        GameState.addScore(-5);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Nepareizi!</h2>
            <p style="color: #ff7777;">Secība nav pareiza. -5 punkti. Mēģini vēlreiz!</p>
            <button class="btn btn-full" onclick="startHistorySequence()">Mēģināt vēlreiz</button>
        `;
    }
}

function closeHistoryGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Teatris') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    recordMiniScore('Teatris', 10);
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Teatris', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

function showMiniGame(type) {
    document.getElementById('game-modal').style.display = "block";
    const content = document.querySelector('.task-section');
    
    if (type === 'Cietums') {
        const code = myRole === 'host' ? "4 2 _ _" : "_ _ 9 1";
        content.innerHTML = `<h2>Cietums</h2><p>Kods: ${code}</p>
            <div class="quiz-form">
                <input id="mini-input" placeholder="Ievadi kodu...">
                <button class="btn btn-full" onclick="checkMini()">OK</button>
            </div>`;
    }else{sendReady()}
     
}

const _miniCode = '785b5c41';

function checkMini() {
    if(document.getElementById('mini-input').value === _v(_miniCode)) sendReady();
}

function sendLobbyReady() {
    if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ready', code: myLobbyCode, role: myRole }));
        const statusEl = document.getElementById('lobby-ready-status');
        if (statusEl) statusEl.innerText = 'Gaidu otru spēlētāju...';
        const readyBtn = document.getElementById('btn-host-ready') || document.getElementById('btn-guest-ready');
        if (readyBtn) readyBtn.disabled = true;
    }
}

function sendReady() {
    if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'update_task', code: myLobbyCode, role: myRole }));
        document.querySelector('.task-section').innerHTML = "<h2>Gaidam otru...</h2>";
    } else if (connectionMode === CONNECTION_MODE_PHP) {
        notifyPartnerPHP(myRole, myLobbyCode);
        document.querySelector('.task-section').innerHTML = "<h2>Gaidam otru...</h2>";
    } else {
        showNotification("Savienojums nav pieejams!", 'error');
    }
}

async function showQuiz(type) {
    document.getElementById('game-modal').style.display = "block";
    const task = questions[type];
    quizWrongCount = 0;
    
    let q = task.q;

    document.querySelector('.task-section').innerHTML = `
        <h2>${type}</h2><p>${q}</p>
        <div class="quiz-form">
            <input id="ans-in" placeholder="Tava atbilde..." maxlength="50">
            <button class="btn btn-full" onclick="checkAns('${type}')">Iesniegt</button>
        </div>
    `;
    setupQuizEnterKey(type);
}

function setupQuizEnterKey(type) {
    const input = document.getElementById('ans-in');
    if (input) {
        input.onkeydown = function(e) {
            if (e.key === 'Enter') { e.preventDefault(); checkAns(type); }
        };
        input.focus();
    }
}

function showTheory(type) {
    const info = locationInfo[type];
    if (!info) return;
    document.querySelector('.task-section').innerHTML = `
        <div class="location-info">
            <h3>${info.name}</h3>
            <p>${info.desc}</p>
        </div>
        <button class="btn" id="btn-back-to-quiz">Atpakaļ uz jautājumu →</button>
    `;
    document.getElementById('btn-back-to-quiz').addEventListener('click', function() {
        showQuizForm(type);
    });
}

function showQuizForm(type) {
    const task = questions[type];
    document.querySelector('.task-section').innerHTML = `
        <h2>${type}</h2><p>${task.q}</p>
        <div class="quiz-form">
            <input id="ans-in" placeholder="Tava atbilde..." maxlength="50">
            <button class="btn btn-full" onclick="checkAns('${type}')">Iesniegt</button>
        </div>
    `;
    setupQuizEnterKey(type);
}

function checkAns(type) {
    const val = document.getElementById('ans-in').value;
    const correct = _v(questions[type]._a);
    const isCorrect = val.toLowerCase().trim() === correct.toLowerCase();
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(isCorrect);
    
    if(isCorrect) {
        const points = quizWrongCount === 0 ? 10 : 5;
        GameState.addScore(points);
        showNotification(`Pareiza atbilde! +${points} punkti`, 'success', 2000);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>${type}</h2>
            <p style="color: #ffaa00; font-size: 18px;">Pareizi!</p>
            <p><strong>Atbilde:</strong> ${correct}</p>
            <p style="color: #ffaa00; font-style: italic;">${questions[type].fact}</p>
            <button class="btn btn-full" onclick="closeQuizAndContinue()">Turpināt</button>
        `;
    } else {
        quizWrongCount++;
        if (quizWrongCount >= 2) {
            showNotification('2 nepareizas atbildes. 0 punkti.', 'error', 3000);
            document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
            document.querySelector('.task-section').innerHTML = `
                <h2>${type}</h2>
                <p style="color: #ff7777; font-size: 18px;">Nepareizi!</p>
                <p style="color: #aaa; font-size: 14px;">2 nepareizas atbildes — 0 punkti</p>
                <p><strong>Pareizā atbilde:</strong> ${correct}</p>
                <p style="color: #ffaa00; font-style: italic;">${questions[type].fact}</p>
                <button class="btn btn-full" onclick="closeQuizAndContinue()">Turpināt</button>
            `;
        } else {
            showNotification('Nepareiza atbilde! Vēl 1 mēģinājums.', 'error', 2000);
            document.querySelector('.task-section').innerHTML = `
                <h2>${type}</h2>
                <p style="color: #ff7777; font-size: 18px;">Nepareizi! Vēl 1 mēģinājums.</p>
                <p style="color: #aaa; font-size: 14px;">(Pareiza atbilde tagad dos +5 punktus)</p>
                <div class="quiz-form">
                    <input id="ans-in" placeholder="Mēģini vēlreiz..." maxlength="50">
                    <button class="btn btn-full" onclick="checkAns('${type}')">Iesniegt atkārtoti</button>
                </div>
            `;
            setupQuizEnterKey(type);
        }
    }
}

function closeQuizAndContinue() {
    if (!_ac.activeTask) {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    quizWrongCount = 0;
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: currentTask, time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if(GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

// --- Kahoot-style final test (10 questions, shown after all tasks) ---

const _finalTestQuestions = [
    {
        q: 'Kurā gadā dibināts Liepājas Teātris?',
        options: ['1895', '1907', '1920', '1935'],
        correct: 1
    },
    {
        q: 'Kurā gadā atklāta koncertzāle "Lielais Dzintars"?',
        options: ['2010', '2012', '2015', '2018'],
        correct: 2
    },
    {
        q: 'Cik metrus garš ir Ziemeļu mols?',
        options: ['800 m', '1200 m', '1800 m', '2500 m'],
        correct: 2
    },
    {
        q: 'Kurā gadā dibināta RTU Liepājas akadēmija?',
        options: ['1944', '1954', '1964', '1974'],
        correct: 1
    },
    {
        q: 'Kurš lielākais ezers Latvijā ir Liepājas ezers?',
        options: ['3.', '5.', '7.', '10.'],
        correct: 1
    },
    {
        q: 'Kādā arhitektūras stilā celta Liepājas Teātra ēka?',
        options: ['Baroks', 'Klasicisms', 'Jūgendstils', 'Gotikas'],
        correct: 2
    },
    {
        q: 'Vai Liepājas osta aizsalst ziemā?',
        options: ['Jā, katru ziemu', 'Nē, nekad', 'Tikai bargās ziemās', 'Reizi 10 gados'],
        correct: 1
    },
    {
        q: 'Kurā gadā izveidota LSEZ (Liepājas Speciālā ekonomiskā zona)?',
        options: ['1987', '1997', '2003', '2007'],
        correct: 1
    },
    {
        q: 'Cik koku un krūmu sugu aug Jūrmalas parkā?',
        options: ['Ap 50', 'Ap 100', 'Vairāk nekā 170', 'Vairāk nekā 300'],
        correct: 2
    },
    {
        q: 'Kurā gadā celts Karostas cietums?',
        options: ['1880', '1900', '1920', '1945'],
        correct: 1
    }
];

let _finalTestScore = 0;
let _finalTestShown = false;
let _kahootCurrentQ = 0;
let _kahootScore = 0;
let _kahootAnswers = [];
let _kahootQuestions = [];

function _buildShuffledFinalQuestions() {
    const list = _finalTestQuestions.map((q) => {
        const opts = q.options.map((text, idx) => ({ text, isCorrect: idx === q.correct }));
        shuffleArray(opts);
        return {
            q: q.q,
            options: opts.map(o => o.text),
            correct: opts.findIndex(o => o.isCorrect),
        };
    });
    return shuffleArray(list);
}

function _collectGameHints() {
    const hints = [];
    for (const loc of taskSequence) {
        const info = locationInfo[loc];
        const q = questions[loc];
        if (info) {
            hints.push({ name: info.name, fact: q ? q.fact : '' });
        }
    }
    return hints;
}

function showFinalTest() {
    if (_finalTestShown || GameState.getCompleted() !== TOTAL_TASKS || _taskCompletionLog.length < TOTAL_TASKS) return;
    _finalTestShown = true;

    document.getElementById('game-modal').style.display = 'block';
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = 'Ekskursija pabeigta! Laiks noslēguma testam!';

    const hints = _collectGameHints();

    document.querySelector('.task-section').innerHTML = `
        <div class="before-final-test" style="text-align:center;">
            <h2 style="color:#ffaa00; font-size:22px;">Vai esi gatavs noslēguma testam?</h2>
            <p style="color:#ccc; font-size:14px; margin:15px 0;">Tests sastāv no <strong style="color:#ffaa00;">10 jautājumiem</strong> par Liepāju. Katra pareiza atbilde dod <strong style="color:#ffaa00;">+1 bonusa punktu</strong>.</p>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
                <button class="btn btn-full" id="btn-start-final-yes" style="background:#ffaa00; color:#2a1a1a; border:none; font-weight:bold; font-size:18px;">Jā, sākt testu</button>
                <button class="btn btn-full" id="btn-start-final-no" style="font-size:16px;">Nē, vēlos apskatīt padomus</button>
            </div>
        </div>
    `;

    document.getElementById('btn-start-final-yes').addEventListener('click', function() {
        startKahootTest();
    });
    document.getElementById('btn-start-final-no').addEventListener('click', function() {
        showHintsReview(hints);
    });
}

function showHintsReview(hints) {
    document.querySelector('.task-section').innerHTML = `
        <div style="text-align:center;">
            <h2 style="color:#ffaa00; font-size:20px;">Padomi un fakti</h2>
            <p style="color:#ccc; font-size:13px; margin-bottom:12px;">Šeit ir svarīgākā informācija no mini-spēlēm:</p>
            <div style="max-height:300px; overflow-y:auto; text-align:left; padding-right:5px;">
                ${hints.map(h => `
                    <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,170,0,0.25); border-radius:8px; padding:10px; margin:6px 0;">
                        <p style="color:#ffaa00; margin:0 0 4px; font-size:13px; font-weight:bold;">${h.name}</p>
                        <p style="color:#ccc; margin:0; font-size:12px;">${h.fact}</p>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-full" id="btn-hints-ready" style="margin-top:16px; background:#ffaa00; color:#2a1a1a; border:none; font-weight:bold; font-size:18px;">Esmu gatavs - sākt testu</button>
        </div>
    `;
    document.getElementById('btn-hints-ready').addEventListener('click', function() {
        startKahootTest();
    });
}

function startKahootTest() {
    _kahootCurrentQ = 0;
    _kahootScore = 0;
    _kahootAnswers = [];
    _kahootQuestions = _buildShuffledFinalQuestions();
    showKahootQuestion();
}

function showKahootQuestion() {
    const q = _kahootQuestions[_kahootCurrentQ];
    const total = _kahootQuestions.length;
    const progress = Math.round((_kahootCurrentQ / total) * 100);
    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
    const shapes = ['▲', '◆', '●', '■'];

    document.querySelector('.task-section').innerHTML = `
        <div class="kahoot-quiz">
            <div class="kahoot-header">
                <span class="kahoot-counter">${_kahootCurrentQ + 1}/${total}</span>
                <span class="kahoot-score">${_kahootScore} p.</span>
            </div>
            <div class="kahoot-progress-bar">
                <div class="kahoot-progress-fill" style="width:${progress}%"></div>
            </div>
            <div class="kahoot-question">
                <p>${q.q}</p>
            </div>
            <div class="kahoot-options">
                ${q.options.map((opt, j) => `
                    <button class="kahoot-option" data-index="${j}" style="background:${colors[j]};">
                        <span class="kahoot-shape">${shapes[j]}</span>
                        <span class="kahoot-option-text">${opt}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.querySelectorAll('.kahoot-option').forEach(btn => {
        btn.addEventListener('click', function() {
            handleKahootAnswer(parseInt(this.getAttribute('data-index')));
        });
    });
}

function handleKahootAnswer(selected) {
    const q = _kahootQuestions[_kahootCurrentQ];
    const isCorrect = selected === q.correct;
    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];

    if (isCorrect) {
        _kahootScore += 1;
    }
    _kahootAnswers.push({ question: _kahootCurrentQ, selected: selected, correct: q.correct, isCorrect: isCorrect });

    document.querySelectorAll('.kahoot-option').forEach(btn => {
        const idx = parseInt(btn.getAttribute('data-index'));
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        if (idx === q.correct) {
            btn.classList.add('kahoot-correct');
            btn.style.background = '#26890c';
            btn.style.border = '3px solid #fff';
            btn.style.transform = 'scale(1.05)';
        } else if (idx === selected && !isCorrect) {
            btn.classList.add('kahoot-wrong');
            btn.style.opacity = '0.6';
            btn.style.border = '3px solid #ff4444';
        } else {
            btn.style.opacity = '0.4';
        }
    });

    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'kahoot-feedback';
    feedbackEl.innerHTML = isCorrect
        ? '<span style="color:#26890c; font-size:22px; font-weight:bold;">Pareizi! +1 punkts</span>'
        : '<span style="color:#e21b3c; font-size:22px; font-weight:bold;">Nepareizi!</span>';
    const quizEl = document.querySelector('.kahoot-quiz');
    if (quizEl) quizEl.appendChild(feedbackEl);

    setTimeout(() => {
        _kahootCurrentQ++;
        if (_kahootCurrentQ < _kahootQuestions.length) {
            showKahootQuestion();
        } else {
            showKahootResults();
        }
    }, 1500);
}

function showKahootResults() {
    _finalTestScore = _kahootScore;
    const total = _kahootQuestions.length;
    const correctCount = _kahootAnswers.filter(a => a.isCorrect).length;
    const maxBonus = total;

    
    document.querySelector('.task-section').innerHTML = `
        <div class="kahoot-results" style="text-align:center;">
            <h2 style="color:#ffaa00; font-size:28px; margin-bottom:10px;">Noslēguma tests pabeigts</h2>
            <div style="background:rgba(0,0,0,0.3); border:2px solid #ffaa00; border-radius:12px; padding:20px; margin:15px 0;">
                <p style="font-size:20px; color:#ffaa00; margin:5px 0;">Pareizas atbildes: <strong>${correctCount}</strong>/${total}</p>
                <p style="font-size:22px; color:#ffaa00; margin:5px 0;">Bonusa punkti: <strong>${_kahootScore}</strong>/${maxBonus}</p>
            </div>
            <div style="text-align:left; max-height:200px; overflow-y:auto; margin:15px 0; padding-right:5px;">
                ${_kahootAnswers.map((a, i) => {
                    const q = _kahootQuestions[i];
                    return `<div style="background:rgba(0,0,0,0.2); border-left:3px solid ${a.isCorrect ? '#26890c' : '#e21b3c'}; border-radius:4px; padding:6px 10px; margin:4px 0; font-size:12px;">
                        <span style="color:${a.isCorrect ? '#26890c' : '#e21b3c'}; font-weight:bold;">${a.isCorrect ? 'Pareizi' : 'Nepareizi'} ${i+1}.</span>
                        <span style="color:#ccc;">${q.q}</span>
                        ${!a.isCorrect ? `<br><span style="color:#888; font-size:11px;">Pareizā: ${q.options[q.correct]}</span>` : ''}
                    </div>`;
                }).join('')}
            </div>
            <button class="btn btn-full" id="btn-kahoot-finish" style="background:#ffaa00; color:#2a1a1a; border:none; font-weight:bold; font-size:18px;">Turpināt</button>
        </div>
    `;

    if (_kahootScore > 0) {
        GameState.addScore(_kahootScore);
        showNotification(`Tests pabeigts! +${_kahootScore} bonusu punkti`, 'success', 2000);
    } else {
        showNotification('Tests pabeigts! Nav bonusu punktu.', 'error', 2000);
    }

    document.getElementById('btn-kahoot-finish').addEventListener('click', function() {
        showEndGame();
    });
}

function showEndGame() {
    if (GameState.getCompleted() !== TOTAL_TASKS || _taskCompletionLog.length < TOTAL_TASKS) {
        _ac.addViolation();
        showNotification('Spēle nav pabeigta!', 'error', 3000);
        return;
    }
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const finalScore = GameState.getScore();
    showEndGameScreen(finalScore, formattedTime);
}

let _endGameShown = false;
function showEndGameScreen(finalScore, formattedTime) {
    if (GameState.getCompleted() !== TOTAL_TASKS || _taskCompletionLog.length < TOTAL_TASKS || _endGameShown) {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    _endGameShown = true;
    document.getElementById('game-modal').style.display = 'block';

    const gameScore = finalScore - _finalTestScore;
    const totalScore = finalScore;
    let medal = 'Bronza';
    if (totalScore >= 96) medal = 'Zelts';
    else if (totalScore >= 60) medal = 'Sudrabs';

    const testLine = _finalTestShown
        ? `<p style="font-size:17px;color:#ffaa00;margin:4px 0;">Bonusa punkti (tests): <strong>${_finalTestScore}</strong>/10</p>
           <hr style="border-color:rgba(255,170,0,0.3);margin:10px 0;">`
        : '';
    const scoreLine = _finalTestShown
        ? `<p style="font-size:22px;color:#ffaa00;margin:5px 0;">Kopā: <strong>${totalScore}</strong>/110</p>`
        : `<p style="font-size:22px;color:#ffaa00;margin:5px 0;">Punkti: <strong>${totalScore}</strong>/100</p>`;

    document.querySelector('.task-section').innerHTML = `
        <div style="text-align: center;">
            <h2 style="color: #ffaa00; font-size: 28px;">${medal} — Apsveicam!</h2>
            <p style="font-size: 18px;">Tu esi pabeidzis ekskursiju pa Liepāju!</p>
            <div style="background: rgba(0,0,0,0.3); border: 2px solid #ffaa00; border-radius: 12px; padding: 20px; margin: 15px 0;">
                <p style="font-size:17px;color:#ffaa00;margin:4px 0;">Spēles punkti: <strong>${gameScore}</strong>/100</p>
                ${testLine}
                ${scoreLine}
                <p style="font-size: 22px; color: #ffaa00; margin: 5px 0;">Laiks: <strong>${formattedTime}</strong></p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                <button class="btn btn-full" id="btn-save-score">Saglabāt un skatīt TOP 10</button>
                <button class="btn btn-full" id="btn-back-menu">Atpakaļ uz menu</button>
                <button class="btn btn-full" id="btn-play-again">Spēlēt vēlreiz</button>
            </div>
        </div>
    `;
    document.getElementById('btn-save-score').addEventListener('click', function() {
        finishGame(globalName, finalScore, formattedTime);
    });
    document.getElementById('btn-back-menu').addEventListener('click', function() {
        location.href = 'index.html';
    });
    document.getElementById('btn-play-again').addEventListener('click', function() {
        location.href = 'map.html?name=' + encodeURIComponent(globalName);
    });
}
const guideBubbles = {
    correct: [
        "Lielisks darbs! Tu esi īsts Liepājas eksperts! ",
        "Pareizi! Tu zini Liepāju kā savu kabatu! ",
        "Bravo! Tā turpini! ",
        "Izcili! Tu esi pelnījis aplausus! ",
        "Super! Nākamais izaicinājums gaida! "
    ],
    wrong: [
        "Hmm, tā nav pareizā atbilde... Mēģini vēlreiz nākamreiz! ",
        "Nekas, arī kļūdīties ir cilvēcīgi! ",
        "Ak, gandrīz! Bet nepadodies! ",
        "Tā nebija... Bet galvenais ir mācīties! ",
        "Ups! Nākamreiz noteikti sanāks! "
    ]
};

function getRandomBubble(isCorrect) {
    const arr = isCorrect ? guideBubbles.correct : guideBubbles.wrong;
    return arr[Math.floor(Math.random() * arr.length)];
}

function setGuideHint(text) {
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = text;
}

function finishGame(name, finalScore, time) { 
    if (GameState.getCompleted() !== TOTAL_TASKS || _taskCompletionLog.length < TOTAL_TASKS) {
        showNotification('Nevar saglabāt — spēle nav pabeigta!', 'error', 3000);
        return;
    }

    const token = _generateScoreToken(finalScore, time, _taskCompletionLog.length);
    const formData = new FormData();
    const submitName = (myRole && myLobbyCode)
        ? (myTeamName || `${name} + Partneris`)
        : name;
    formData.append('name', submitName);
    formData.append('score', finalScore);
    formData.append('time', time);
    formData.append('token', token);
    formData.append('tasks', _taskCompletionLog.length);
    formData.append('violations', _ac.violations);
    formData.append('gameToken', _serverGameToken || '');
    formData.append('testScore', _finalTestScore);
    formData.append('mode', myRole && myLobbyCode ? 'multi' : 'single');
    
    fetch('src/php/save_score.php', {
        method: 'POST',
        credentials: 'include',
        body: formData
    })
    .then(response => response.text())
    .then(function() {
        location.href = 'src/php/leaderboard.php';
    })
    .catch(function() {
        location.href = 'src/php/leaderboard.php';
    });
}

function exitGame() { window.location.href = 'https://www.google.com'; }
function setMusicVolume(v) { 
    localStorage.setItem('musicVolume', v);
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.volume = v / 100;
    }
}
function setSFXVolume(v) { 
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        sfx.volume = v/100;
        localStorage.setItem('sfxVolume', v);
    }
}

// --- Visual effects (cursor trail, theme, background) ---
function getTrailColor() {
    const theme = document.body.getAttribute('data-theme') || 'default';
    const colors = {
        'default': 'rgba(255, 170, 0,',
        'dark': 'rgba(187, 134, 252,',
        'light': 'rgba(255, 68, 68,',
        'blue': 'rgba(255, 215, 0,'
    };
    return colors[theme] || colors['default'];
}

function initCursorTrail() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;
    const canvas = document.getElementById('cursor-canvas');
    if (!canvas) return;
    if (cursorTrailAnimId) {
        cancelAnimationFrame(cursorTrailAnimId);
        cursorTrailAnimId = null;
    }
    const ctx = canvas.getContext('2d');

    let mouseMoved = false;
    const pointer = {
        x: 0.5 * window.innerWidth,
        y: 0.5 * window.innerHeight,
    };
    const pointsNumber = 30;
    const params = {
        widthFactor: 0.3,
        spring: 0.4,
        friction: 0.5
    };

    const trail = new Array(pointsNumber);
    for (let i = 0; i < pointsNumber; i++) {
        trail[i] = { x: pointer.x, y: pointer.y, dx: 0, dy: 0 };
    }

    function updateMousePosition(eX, eY) {
        pointer.x = eX;
        pointer.y = eY;
    }

    window.addEventListener("click", e => { updateMousePosition(e.pageX, e.pageY); });
    window.addEventListener("mousemove", e => {
        mouseMoved = true;
        updateMousePosition(e.pageX, e.pageY);
    });
    window.addEventListener("touchmove", e => {
        mouseMoved = true;
        updateMousePosition(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
    });

    function setupCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    setupCanvas();
    window.addEventListener("resize", setupCanvas);

    function update(t) {
        if (!animationsEnabled) return;

        if (!mouseMoved) {
            pointer.x = (0.5 + 0.3 * Math.cos(0.002 * t) * Math.sin(0.005 * t)) * window.innerWidth;
            pointer.y = (0.5 + 0.2 * Math.cos(0.005 * t) + 0.1 * Math.cos(0.01 * t)) * window.innerHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        trail.forEach((p, pIdx) => {
            const prev = pIdx === 0 ? pointer : trail[pIdx - 1];
            const spring = pIdx === 0 ? 0.4 * params.spring : params.spring;
            p.dx += (prev.x - p.x) * spring;
            p.dy += (prev.y - p.y) * spring;
            p.dx *= params.friction;
            p.dy *= params.friction;
            p.x += p.dx;
            p.y += p.dy;
        });

        const colorBase = getTrailColor();
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);

        for (let i = 1; i < trail.length - 1; i++) {
            const xc = 0.5 * (trail[i].x + trail[i + 1].x);
            const yc = 0.5 * (trail[i].y + trail[i + 1].y);
            ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
            ctx.lineWidth = params.widthFactor * (pointsNumber - i);
            const alpha = 1 - (i / trail.length);
            ctx.strokeStyle = colorBase + ' ' + alpha.toFixed(2) + ')';
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xc, yc);
        }
        ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
        ctx.stroke();

        cursorTrailAnimId = window.requestAnimationFrame(update);
    }

    cursorTrailAnimId = window.requestAnimationFrame(update);
}

function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        }
    });
    
    showNotification(`Tēma mainīta: ${getThemeLabel(themeName)}`, 'success', 2000);
}

function getThemeLabel(themeName) {
    const labels = {
        'default': 'Noklusējuma',
        'dark': 'Violeta',
        'light': 'Tumši sarkana',
        'blue': 'Zila'
    };
    return labels[themeName] || themeName;
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    document.body.setAttribute('data-theme', savedTheme);
    updateActiveThemeButton(savedTheme);
}

function updateActiveThemeButton(savedTheme) {
    const buttons = document.querySelectorAll('.theme-btn');
    if (buttons.length === 0) {
        return;
    }
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        }
    });
}

let bgCanvas = null;
let bgCtx = null;
let bgAnimId = null;
let bgParticles = [];
let bgResizeHandler = null;

function getBgThemeColor() {
    const theme = document.body.getAttribute('data-theme') || 'default';
    const colors = {
        'default': { r: 255, g: 170, b: 0   },
        'dark':    { r: 187, g: 134, b: 252  },
        'light':   { r: 255, g: 68,  b: 68   },
        'blue':    { r: 255, g: 215, b: 0    },
    };
    return colors[theme] || colors['default'];
}

function initBackground() {
    const wrap = document.getElementById('bg-wrap');
    if (!wrap) return;

    wrap.innerHTML = '';

    bgCanvas = document.createElement('canvas');
    bgCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    wrap.appendChild(bgCanvas);

    if (bgAnimId) {
        cancelAnimationFrame(bgAnimId);
        bgAnimId = null;
    }
    if (bgResizeHandler) {
        window.removeEventListener('resize', bgResizeHandler);
    }

    function resize() {
        const oldW = bgCanvas.width;
        const oldH = bgCanvas.height;
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
        if (oldW > 0 && oldH > 0) {
            const sx = bgCanvas.width / oldW;
            const sy = bgCanvas.height / oldH;
            bgParticles.forEach(p => {
                p.x *= sx;
                p.y *= sy;
            });
        }
    }
    bgResizeHandler = resize;
    resize();
    window.addEventListener('resize', bgResizeHandler);

    bgCtx = bgCanvas.getContext('2d');

    const count = 70;
    bgParticles = [];
    for (let i = 0; i < count; i++) {
        bgParticles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            radius: Math.random() * 2.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: Math.random() * 0.015 + 0.005,
            baseOpacity: Math.random() * 0.4 + 0.1,
        });
    }

    function drawBg() {
        bgAnimId = requestAnimationFrame(drawBg);

        const c = getBgThemeColor();
        const w = bgCanvas.width;
        const h = bgCanvas.height;

        bgCtx.clearRect(0, 0, w, h);

        bgParticles.forEach(p => {
            if (animationsEnabled) {
                p.x += p.vx;
                p.y += p.vy;
                p.phase += p.phaseSpeed;
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;
            }

            const opacity = p.baseOpacity * (0.7 + 0.3 * Math.sin(p.phase));
            const r = p.radius * (0.9 + 0.2 * Math.sin(p.phase));

            const grd = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 8);
            grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${opacity * 0.8})`);
            grd.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
            bgCtx.fillStyle = grd;
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, r * 8, 0, Math.PI * 2);
            bgCtx.fill();

            bgCtx.fillStyle = `rgba(${c.r},${c.g},${c.b},${Math.min(opacity * 3, 1)})`;
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
            bgCtx.fill();
        });

        for (let i = 0; i < bgParticles.length; i++) {
            for (let j = i + 1; j < bgParticles.length; j++) {
                const dx = bgParticles[i].x - bgParticles[j].x;
                const dy = bgParticles[i].y - bgParticles[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 150) {
                    bgCtx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${0.06 * (1 - d / 150)})`;
                    bgCtx.lineWidth = 0.5;
                    bgCtx.beginPath();
                    bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
                    bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
                    bgCtx.stroke();
                }
            }
        }

        // Skyline silhouette & sea waves
        const skylineY = h * 0.72;
        bgCtx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.06)`;
        bgCtx.beginPath();
        bgCtx.moveTo(0, h);
        bgCtx.lineTo(0, skylineY + 60);
        bgCtx.lineTo(w * 0.05, skylineY + 60);
        bgCtx.lineTo(w * 0.06, skylineY + 40);
        bgCtx.lineTo(w * 0.065, skylineY + 20);
        bgCtx.arc(w * 0.075, skylineY + 20, w * 0.01, Math.PI, 0, false);
        bgCtx.lineTo(w * 0.09, skylineY + 40);
        bgCtx.lineTo(w * 0.10, skylineY + 60);
        bgCtx.lineTo(w * 0.15, skylineY + 60);
        bgCtx.lineTo(w * 0.15, skylineY + 30);
        bgCtx.lineTo(w * 0.22, skylineY + 30);
        bgCtx.lineTo(w * 0.22, skylineY + 60);
        bgCtx.lineTo(w * 0.28, skylineY + 60);
        bgCtx.lineTo(w * 0.28, skylineY + 10);
        bgCtx.lineTo(w * 0.285, skylineY);
        bgCtx.lineTo(w * 0.29, skylineY + 10);
        bgCtx.lineTo(w * 0.29, skylineY + 60);
        bgCtx.lineTo(w * 0.35, skylineY + 60);
        bgCtx.lineTo(w * 0.35, skylineY + 5);
        bgCtx.lineTo(w * 0.355, skylineY + 2);
        bgCtx.lineTo(w * 0.36, skylineY + 5);
        bgCtx.lineTo(w * 0.36, skylineY + 60);
        bgCtx.lineTo(w * 0.42, skylineY + 60);
        bgCtx.lineTo(w * 0.42, skylineY + 25);
        bgCtx.lineTo(w * 0.50, skylineY + 10);
        bgCtx.lineTo(w * 0.50, skylineY + 25);
        bgCtx.lineTo(w * 0.44, skylineY + 25);
        bgCtx.lineTo(w * 0.44, skylineY + 60);
        bgCtx.lineTo(w * 0.55, skylineY + 60);
        bgCtx.lineTo(w * 0.55, skylineY + 45);
        bgCtx.lineTo(w * 0.65, skylineY + 45);
        bgCtx.lineTo(w * 0.65, skylineY + 60);
        bgCtx.lineTo(w * 0.70, skylineY + 60);
        bgCtx.lineTo(w * 0.70, skylineY + 20);
        bgCtx.lineTo(w * 0.78, skylineY + 20);
        bgCtx.lineTo(w * 0.78, skylineY + 60);
        bgCtx.lineTo(w * 0.88, skylineY + 60);
        bgCtx.lineTo(w * 0.88, skylineY + 35);
        bgCtx.lineTo(w * 0.90, skylineY + 15);
        bgCtx.lineTo(w * 0.92, skylineY + 35);
        bgCtx.lineTo(w * 0.92, skylineY + 60);
        bgCtx.lineTo(w, skylineY + 60);
        bgCtx.lineTo(w, h);
        bgCtx.closePath();
        bgCtx.fill();

        const waveT = animationsEnabled ? Date.now() / 2000 : 0;
        const waveY = h * 0.88;
        bgCtx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.08)`;
        bgCtx.lineWidth = 1.5;
        for (let wave = 0; wave < 3; wave++) {
            bgCtx.beginPath();
            for (let x = 0; x <= w; x += 6) {
                const y = waveY + wave * 12 + Math.sin(x / 80 + waveT + wave * 1.2) * 6;
                if (x === 0) bgCtx.moveTo(x, y);
                else bgCtx.lineTo(x, y);
            }
            bgCtx.stroke();
        }
    }

    drawBg();
}

function toggleModal(id) {
    const modal = document.getElementById(id);
    const isOpening = modal.style.display !== "block";
    modal.style.display = isOpening ? "block" : "none";

    if (isOpening && id === 'settings-modal') {
        const savedTheme = localStorage.getItem('theme') || 'default';
        updateActiveThemeButton(savedTheme);
        const checkbox = document.getElementById('animation-toggle');
        if (checkbox) checkbox.checked = animationsEnabled;
    }
}

let animationsEnabled = true;
let cursorTrailAnimId = null;

function toggleAnimations(enabled) {
    animationsEnabled = enabled;
    localStorage.setItem('animationsEnabled', enabled ? '1' : '0');

    if (enabled) {
        document.body.classList.remove('no-animations');
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) {
            canvas.style.display = '';
            initCursorTrail();
        }
    } else {
        document.body.classList.add('no-animations');
        if (cursorTrailAnimId) {
            cancelAnimationFrame(cursorTrailAnimId);
            cursorTrailAnimId = null;
        }
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
    }
    showNotification(enabled ? 'Animācijas ieslēgtas' : 'Animācijas izslēgtas', 'info', 2000);
}

function initAnimationToggle() {
    const saved = localStorage.getItem('animationsEnabled');
    if (saved === '0') {
        animationsEnabled = false;
        document.body.classList.add('no-animations');
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) canvas.style.display = 'none';
    }
    const checkbox = document.getElementById('animation-toggle');
    if (checkbox) checkbox.checked = animationsEnabled;
}

function showNotification(message, type = 'info', duration = 3000) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.innerHTML = `<span class="notification-text">${message}</span>`;
    
    container.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// --- Fishing mini-game ---
const FISHING_CONFIG = {
    TENSION_INCREASE: 0.6,
    TENSION_DECREASE: 0.4,
    START_DISTANCE: 15.00,
    PROGRESS_DECAY: 0.005,
    DEADLINE_THRESHOLD: 80,
    FAIL_TIME_MAX: 1.5,
    FISH_PULL_CHANCE: 0.015,
    FISH_PULL_STRENGTH: 0.5,
    EXCELLENT_TIME: 10,
    GOOD_TIME: 20,
    EXCELLENT_POINTS: 15,
    GOOD_POINTS: 10,
    NORMAL_POINTS: 5
};

let fishingActive = false;
let tension = 0;
let distance = FISHING_CONFIG.START_DISTANCE;
let failTimer = 0;
let isHolding = false;
let fishingStartTime = 0;
let fishPullTimer = 0;
let waveOffset = 0;

function handleFishingKeyDown(e) {
    if (!fishingActive) return;
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        isHolding = true;
    }
}

function handleFishingKeyUp(e) {
    if (e.code === 'Space' || e.key === ' ') {
        isHolding = false;
    }
}

function handleFishingMouseUp() {
    isHolding = false;
}

function cleanupFishingListeners() {
    document.removeEventListener('keydown', handleFishingKeyDown);
    document.removeEventListener('keyup', handleFishingKeyUp);
    window.removeEventListener('mouseup', handleFishingMouseUp);
}

function startFishingGame() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const instruction = isTouchDevice
        ? 'Turi pogu nospiestu, lai pietuvinātu zivi! Nepārvelc auklu!'
        : 'Turi SPACE vai pogu nospiestu, lai pietuvinātu zivi! Nepārvelc auklu!';

    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Makšķerēšana</h2>
        <p>${instruction}</p>
        <p style="font-size: 13px; opacity: 0.7;">Sprieguma josla rāda auklas stāvokli — ja tā kļūst sarkana, aukla var pārtrūkt!</p>
        <button class="btn btn-full" onclick="initFishingLogic()">SĀKT</button>
    `;
}

function initFishingLogic() {
    fishingActive = true;
    tension = 0;
    distance = FISHING_CONFIG.START_DISTANCE;
    failTimer = 0;
    isHolding = false;
    fishPullTimer = 0;
    waveOffset = 0;
    fishingStartTime = Date.now();

    cleanupFishingListeners();

    document.querySelector('.task-section').innerHTML = `
        <div id="fishing-container">
            <canvas id="fishingCanvas" width="400" height="400"></canvas>
            <div id="fish-btn">🎣</div>
        </div>
    `;

    const btn = document.getElementById('fish-btn');
    const canvas = document.getElementById('fishingCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    btn.addEventListener('mousedown', () => isHolding = true);
    window.addEventListener('mouseup', handleFishingMouseUp);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); isHolding = true; });
    btn.addEventListener('touchend', () => isHolding = false);
    document.addEventListener('keydown', handleFishingKeyDown);
    document.addEventListener('keyup', handleFishingKeyUp);

    function gameLoop() {
        if (!fishingActive) return;

        if (Math.random() < FISHING_CONFIG.FISH_PULL_CHANCE) {
            fishPullTimer = 15;
        }
        const fishPulling = fishPullTimer > 0;
        if (fishPullTimer > 0) fishPullTimer--;

        if (isHolding) {
            tension += FISHING_CONFIG.TENSION_INCREASE + (fishPulling ? FISHING_CONFIG.FISH_PULL_STRENGTH : 0);
            distance -= 0.05;
        } else {
            tension -= FISHING_CONFIG.TENSION_DECREASE;
            distance += FISHING_CONFIG.PROGRESS_DECAY + (fishPulling ? 0.02 : 0);
        }

        tension = Math.max(0, Math.min(tension, 100));
        distance = Math.max(0, Math.min(distance, FISHING_CONFIG.START_DISTANCE));

        if (tension >= FISHING_CONFIG.DEADLINE_THRESHOLD) {
            failTimer += 0.016;
            if (failTimer >= FISHING_CONFIG.FAIL_TIME_MAX || tension >= 100) return finishFishing(false);
        } else {
            failTimer = Math.max(0, failTimer - 0.01);
        }

        if (distance <= 0) return finishFishing(true);

        waveOffset += 0.03;
        drawFishing(ctx, canvas, fishPulling);
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
}

function drawFishing(ctx, canvas, fishPulling) {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Scene rendering: water, rod, fish, HUD
    const waterY = H * 0.45;
    ctx.fillStyle = 'rgba(30, 80, 140, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    for (let x = 0; x <= W; x += 5) {
        ctx.lineTo(x, waterY + Math.sin(x * 0.02 + waveOffset) * 6 + Math.sin(x * 0.05 + waveOffset * 1.5) * 3);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(20, 60, 120, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, waterY + 15);
    for (let x = 0; x <= W; x += 5) {
        ctx.lineTo(x, waterY + 15 + Math.sin(x * 0.03 + waveOffset * 0.7 + 2) * 5);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#6b3a1f';
    ctx.lineWidth = Math.min(6, W * 0.015);
    ctx.beginPath();
    ctx.moveTo(W * 0.03, H * 0.95);
    const curveOffset = isHolding ? (tension * 0.4) : 15;
    const tipX = W * 0.45;
    const tipY = H * 0.1;
    ctx.quadraticCurveTo(W * 0.1, H * 0.5 - curveOffset, tipX, tipY);
    ctx.stroke();

    const progress = 1 - (distance / FISHING_CONFIG.START_DISTANCE);
    const bobberX = tipX + (W * 0.55 - tipX) * (0.3 + progress * 0.5);
    const bobberY = waterY + 5 + Math.sin(waveOffset * 2) * 3;

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(bobberX, tipY + (bobberY - tipY) * 0.3, bobberX, bobberY);
    ctx.stroke();

    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.arc(bobberX, bobberY - 4, Math.min(6, W * 0.015), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bobberX, bobberY + 2, Math.min(5, W * 0.012), 0, Math.PI * 2);
    ctx.fill();

    const fishDist = distance / FISHING_CONFIG.START_DISTANCE;
    const fishX = bobberX + fishDist * W * 0.3;
    const fishY = waterY + 30 + Math.sin(waveOffset * 3 + 1) * 8;
    const fishSize = Math.min(18, W * 0.04);

    ctx.fillStyle = fishPulling ? 'rgba(255, 180, 50, 0.9)' : 'rgba(180, 200, 220, 0.7)';
    ctx.beginPath();
    ctx.ellipse(fishX, fishY, fishSize, fishSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fishX + fishSize, fishY);
    ctx.lineTo(fishX + fishSize + fishSize * 0.5, fishY - fishSize * 0.4);
    ctx.lineTo(fishX + fishSize + fishSize * 0.5, fishY + fishSize * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(fishX - fishSize * 0.4, fishY - fishSize * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();

    if (fishPulling) {
        ctx.fillStyle = `rgba(255, 170, 0, ${0.5 + Math.sin(Date.now() / 80) * 0.5})`;
        ctx.font = `bold ${Math.min(14, W * 0.035)}px Poppins, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Zivs velk!', W * 0.5, waterY - 15);
        ctx.textAlign = 'start';
    }

    const barW = Math.min(200, W * 0.5);
    const barH = Math.min(18, H * 0.045);
    const barX = (W - barW) / 2;
    const barY = 15;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const tensionW = (tension / 100) * barW;
    let grd = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grd.addColorStop(0, '#44ff44');
    grd.addColorStop(0.6, '#ffaa00');
    grd.addColorStop(1, '#ff4444');
    ctx.fillStyle = grd;
    roundRect(ctx, barX, barY, tensionW, barH, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `bold ${Math.min(11, W * 0.028)}px Poppins, Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Spriegums', W * 0.5, barY + barH + 14);

    if (tension > FISHING_CONFIG.DEADLINE_THRESHOLD) {
        ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + Math.abs(Math.sin(Date.now() / 100)) * 0.5})`;
        ctx.font = `bold ${Math.min(16, W * 0.04)}px Poppins, Arial`;
        ctx.fillText('⚠ UZMANĪBU!', W * 0.5, barY + barH + 32);
    }

    const distBarW = Math.min(160, W * 0.4);
    const distBarH = Math.min(10, H * 0.025);
    const distBarX = (W - distBarW) / 2;
    const distBarY = H - 50;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, distBarX - 1, distBarY - 1, distBarW + 2, distBarH + 2, 4);
    ctx.fill();

    const distProgress = 1 - (distance / FISHING_CONFIG.START_DISTANCE);
    let distGrd = ctx.createLinearGradient(distBarX, 0, distBarX + distBarW, 0);
    distGrd.addColorStop(0, '#4488ff');
    distGrd.addColorStop(1, '#44ffaa');
    ctx.fillStyle = distGrd;
    roundRect(ctx, distBarX, distBarY, distProgress * distBarW, distBarH, 3);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.min(20, W * 0.05)}px Poppins, Arial`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillText(`${distance.toFixed(2)} m`, W * 0.5, distBarY - 10);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${Math.min(11, W * 0.028)}px Poppins, Arial`;
    ctx.fillText('Attālums līdz zivij', W * 0.5, distBarY + distBarH + 16);
    ctx.textAlign = 'start';
}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 0) w = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function finishFishing(success) {
    fishingActive = false;
    cleanupFishingListeners();
    const container = document.querySelector('.task-section');
    const elapsed = ((Date.now() - fishingStartTime) / 1000).toFixed(1);

    if (success) {
        let points = FISHING_CONFIG.NORMAL_POINTS;
        if (elapsed < FISHING_CONFIG.EXCELLENT_TIME) {
            points = FISHING_CONFIG.EXCELLENT_POINTS;
        } else if (elapsed < FISHING_CONFIG.GOOD_TIME) {
            points = FISHING_CONFIG.GOOD_POINTS;
        }
        const newScore = GameState.addScore(points);
        document.getElementById('score-display').innerText = 'Punkti: ' + newScore;

        container.innerHTML = `
            <div style="text-align:center;">
                <h2 style="color: #ffaa00;">Zivs noķerta!</h2>
                <p>Laiks: ${elapsed} s</p>
                <p style="color:#ffaa00; font-size:20px; font-weight:bold;">+${points} punkti!</p>
                <p style="color:#ffaa00;font-style:italic;">${questions['Mols'].fact}</p>
                <button class="btn btn-full" onclick="closeFishingGame()">Turpināt</button>
            </div>`;
    } else {
        container.innerHTML = `
            <div style="text-align:center;">
                <h2 style="color: #ff7777;">Aukla pārtrūka!</h2>
                <p style="opacity:0.7;">Centies kontrolēt spriegumu — netur pogu pārāk ilgi!</p>
                <button class="btn btn-full" onclick="startFishingGame()">Mēģināt vēlreiz</button>
            </div>`;
    }
}

function closeFishingGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Mols') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    recordMiniScore('Mols', 10);
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Mols', time: Date.now() });
    fishingActive = false;
    cleanupFishingListeners();
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

// --- Server-side score recording ---
function recordMiniScore(taskId, points) {
    if (!_serverGameToken) return;
    fetch('src/php/record_task_score.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameToken: _serverGameToken, taskId: taskId, points: points })
    }).catch(function() {});
}

// --- Mini-game: Simon Says (Dzintars) ---
const SIMON_COLORS = ['red', 'blue', 'green', 'yellow'];
let simonSeq = [], simonIdx = 0, simonRound = 0;
const SIMON_TOTAL_ROUNDS = 3;

function startSimonGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Mūzikas Atmiņa</h2>
        <p>Atceries un atkārto krāsu secību!</p>
        <button class="btn btn-full" onclick="initSimonRounds()">SĀKT</button>`;
}

function initSimonRounds() {
    simonSeq = []; simonRound = 0;
    runNextSimonRound();
}

function renderSimonGrid() {
    document.querySelector('.task-section').innerHTML = `
        <h2>Kārta ${simonRound}/${SIMON_TOTAL_ROUNDS}</h2>
        <p id="simon-msg" style="color:#ffaa00;">Vēro secību...</p>
        <div class="simon-grid">
            ${SIMON_COLORS.map(function(c) { return `<div id="sg-${c}" class="simon-btn simon-${c}" onclick="simonClick('${c}')"></div>`; }).join('')}
        </div>`;
    setSimonClickable(false);
}

function setSimonClickable(on) {
    document.querySelectorAll('.simon-btn').forEach(function(b) { b.style.pointerEvents = on ? 'auto' : 'none'; });
}

function lightSimon(color, lit) {
    const el = document.getElementById('sg-' + color);
    if (el) { if (lit) el.classList.add('lit'); else el.classList.remove('lit'); }
}

function runNextSimonRound() {
    simonRound++;
    simonIdx = 0;
    simonSeq.push(SIMON_COLORS[Math.floor(Math.random() * 4)]);
    renderSimonGrid();
    simonSeq.forEach(function(c, i) {
        setTimeout(function() { lightSimon(c, true); },  800 + i * 700);
        setTimeout(function() { lightSimon(c, false); }, 800 + i * 700 + 450);
    });
    setTimeout(function() {
        const msg = document.getElementById('simon-msg');
        if (msg) msg.textContent = 'Tava kārta! Atkārto secību.';
        setSimonClickable(true);
    }, 800 + simonSeq.length * 700 + 200);
}

function simonClick(color) {
    lightSimon(color, true);
    setTimeout(function() { lightSimon(color, false); }, 200);
    if (color !== simonSeq[simonIdx]) {
        const gh = document.getElementById('guide-hint');
        if (gh) gh.textContent = getRandomBubble(false);
        GameState.addScore(-5);
        document.getElementById('score-display').innerText = 'Punkti: ' + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Nepareizi!</h2>
            <p style="color: #ff7777;">Nepareizā krāsa! -5 punkti.</p>
            <button class="btn btn-full" onclick="initSimonRounds()">Mēģināt vēlreiz</button>`;
        return;
    }
    simonIdx++;
    if (simonIdx < simonSeq.length) return;
    if (simonRound >= SIMON_TOTAL_ROUNDS) {
        const gh = document.getElementById('guide-hint');
        if (gh) gh.textContent = getRandomBubble(true);
        GameState.addScore(10);
        document.getElementById('score-display').innerText = 'Punkti: ' + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Lieliski!</h2>
            <p style="color: #ffaa00;">Visas kārtas pareizi! +10 punkti!</p>
            <p style="color:#ffaa00;font-style:italic;">${questions['Dzintars'].fact}</p>
            <button class="btn btn-full" onclick="closeSimonGame()">Turpināt</button>`;
    } else {
        const msg = document.getElementById('simon-msg');
        if (msg) msg.textContent = 'Pareizi! Nākamā kārta...';
        setSimonClickable(false);
        setTimeout(runNextSimonRound, 900);
    }
}

function closeSimonGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Dzintars') { _ac.addViolation(); showNotification('Aizdomīga darbība!', 'error', 3000); return; }
    recordMiniScore('Dzintars', 10);
    _ac.activeTask = false; _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Dzintars', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask(); updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

// --- Mini-game: Boat Dodge (Kanals) ---
let kanalGameActive = false, kanalAnimId2 = null;
let kanalPlayerX = 160, kanalHits = 0, kanalDodges = 0;
let kanalFrames = 0, kanalTimeLeft = 0, kanalTimer2 = null;
let kanalObstacles2 = [];
let kanalKeys2 = { left: false, right: false };
let kanalW = 320, kanalH = 260;
const KANAL_PLAYER_Y2 = 220;
const KANAL_GAME_TIME2 = 20;
const KANAL_DODGES_NEEDED = 8;
const KANAL_MAX_HITS2 = 3;

function startKanalGame() {
    document.getElementById('game-modal').style.display = 'block';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    document.querySelector('.task-section').innerHTML = `
        <h2>Kanāla Laiva</h2>
        <p>Izvairīties no akmeņiem kanālā!</p>
        <p style="font-size:13px;opacity:0.7;">${isTouch ? 'Spied kreisi/labi pogas.' : 'Lieto ← → taustiņus vai pogas.'}</p>
        <button class="btn btn-full" onclick="initKanalGame()">SĀKT</button>`;
}

function initKanalGame() {
    kanalGameActive = true;
    kanalObstacles2 = []; kanalHits = 0; kanalDodges = 0; kanalFrames = 0;
    kanalTimeLeft = KANAL_GAME_TIME2;
    kanalKeys2 = { left: false, right: false };
    document.querySelector('.task-section').innerHTML = `
        <p id="kanal-stats" style="color:#ffaa00;margin:0 0 4px;font-size:13px;">Izvairīšanās: 0/${KANAL_DODGES_NEEDED} | Dzīvības: ${KANAL_MAX_HITS2} | ${KANAL_GAME_TIME2}s</p>
        <canvas id="kanalCanvas" style="width:100%;display:block;border:2px solid rgba(255,170,0,0.3);border-radius:8px;touch-action:none;"></canvas>
        <div style="display:flex;gap:8px;margin-top:6px;">
            <button class="boat-tap-btn" style="padding:12px 5px;"
                onmousedown="kanalSetKey(true,true)" onmouseup="kanalSetKey(true,false)"
                ontouchstart="kanalSetKey(true,true);event.preventDefault()" ontouchend="kanalSetKey(true,false)">← Kreisi</button>
            <button class="boat-tap-btn" style="padding:12px 5px;"
                onmousedown="kanalSetKey(false,true)" onmouseup="kanalSetKey(false,false)"
                ontouchstart="kanalSetKey(false,true);event.preventDefault()" ontouchend="kanalSetKey(false,false)">Labi →</button>
        </div>`;
    const canvas = document.getElementById('kanalCanvas');
    const rect = canvas.getBoundingClientRect();
    kanalW = rect.width > 0 ? Math.floor(rect.width) : 320;
    kanalH = Math.floor(kanalW * 0.8);
    canvas.width = kanalW; canvas.height = kanalH;
    kanalPlayerX = kanalW / 2;
    document.removeEventListener('keydown', kanalKeyDown2);
    document.removeEventListener('keyup', kanalKeyUp2);
    document.addEventListener('keydown', kanalKeyDown2);
    document.addEventListener('keyup', kanalKeyUp2);
    if (kanalTimer2) clearInterval(kanalTimer2);
    kanalTimer2 = setInterval(function() {
        if (!kanalGameActive) return;
        kanalTimeLeft--;
        updateKanalStats();
        if (kanalTimeLeft <= 0) finishKanalGame();
    }, 1000);
    if (kanalAnimId2) cancelAnimationFrame(kanalAnimId2);
    kanalLoop();
}

function kanalSetKey(isLeft, on) { if (isLeft) kanalKeys2.left = on; else kanalKeys2.right = on; }
function kanalKeyDown2(e) {
    if (e.key === 'ArrowLeft'  || e.key === 'a') kanalKeys2.left  = true;
    if (e.key === 'ArrowRight' || e.key === 'd') kanalKeys2.right = true;
}
function kanalKeyUp2(e) {
    if (e.key === 'ArrowLeft'  || e.key === 'a') kanalKeys2.left  = false;
    if (e.key === 'ArrowRight' || e.key === 'd') kanalKeys2.right = false;
}

function updateKanalStats() {
    const el = document.getElementById('kanal-stats');
    if (el) el.textContent = `Izvairīšanās: ${kanalDodges}/${KANAL_DODGES_NEEDED} | Dzīvības: ${Math.max(0, KANAL_MAX_HITS2 - kanalHits)} | ${kanalTimeLeft}s`;
}

function kanalLoop() {
    if (!kanalGameActive) return;
    const canvas = document.getElementById('kanalCanvas');
    if (!canvas) { kanalGameActive = false; return; }
    const ctx = canvas.getContext('2d');
    const W = kanalW, H = kanalH;
    const PY = Math.floor(H * 0.85);

    if (kanalKeys2.left)  kanalPlayerX = Math.max(28, kanalPlayerX - 4);
    if (kanalKeys2.right) kanalPlayerX = Math.min(W - 28, kanalPlayerX + 4);

    ctx.fillStyle = '#1a4a7a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5c4a1e'; ctx.fillRect(0, 0, 18, H); ctx.fillRect(W - 18, 0, 18, H);
    ctx.strokeStyle = 'rgba(100,180,255,0.12)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        const ry = (kanalFrames * 1.5 + i * (H / 4)) % H;
        ctx.beginPath(); ctx.moveTo(18, ry); ctx.lineTo(W - 18, ry); ctx.stroke();
    }
    kanalFrames++;
    if (kanalFrames % 50 === 0) {
        kanalObstacles2.push({ x: 28 + Math.random() * (W - 56), y: -20, spd: 1.2 + Math.random() * 0.8 });
    }

    let newHits = 0, newDodges = 0;
    kanalObstacles2 = kanalObstacles2.filter(function(obs) {
        obs.y += obs.spd;
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🪨', obs.x, obs.y);
        ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
        const dx = kanalPlayerX - obs.x, dy = PY - obs.y;
        if (Math.sqrt(dx * dx + dy * dy) < 28) { newHits++; return false; }
        if (obs.y > H + 20) { newDodges++; return false; }
        return true;
    });

    ctx.fillStyle = '#ffaa00';
    ctx.beginPath(); ctx.moveTo(kanalPlayerX, PY - 18); ctx.lineTo(kanalPlayerX - 13, PY + 8); ctx.lineTo(kanalPlayerX + 13, PY + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(kanalPlayerX - 2, PY - 28, 4, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(kanalPlayerX, PY - 28); ctx.lineTo(kanalPlayerX + 10, PY - 18); ctx.lineTo(kanalPlayerX, PY - 16); ctx.fill();

    if (newHits > 0) { kanalHits += newHits; updateKanalStats(); if (kanalHits >= KANAL_MAX_HITS2) { finishKanalGame(); return; } }
    if (newDodges > 0) { kanalDodges += newDodges; updateKanalStats(); if (kanalDodges >= KANAL_DODGES_NEEDED) { finishKanalGame(); return; } }
    kanalAnimId2 = requestAnimationFrame(kanalLoop);
}

function finishKanalGame() {
    if (!kanalGameActive) return;
    kanalGameActive = false;
    if (kanalTimer2) { clearInterval(kanalTimer2); kanalTimer2 = null; }
    if (kanalAnimId2) { cancelAnimationFrame(kanalAnimId2); kanalAnimId2 = null; }
    document.removeEventListener('keydown', kanalKeyDown2);
    document.removeEventListener('keyup', kanalKeyUp2);
    const success = kanalDodges >= KANAL_DODGES_NEEDED && kanalHits < KANAL_MAX_HITS2;
    const gh = document.getElementById('guide-hint');
    if (gh) gh.textContent = getRandomBubble(success);
    if (success) {
        const pts = kanalHits === 0 ? 10 : 7;
        GameState.addScore(pts);
        document.getElementById('score-display').innerText = 'Punkti: ' + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Labi padarīts!</h2>
            <p>Izvairīšanās: ${kanalDodges} | Trāpījumi: ${kanalHits}</p>
            <p style="color:#ffaa00;font-size:20px;font-weight:bold;">+${pts} punkti!</p>
            <p style="color:#ffaa00;font-style:italic;">${questions['Kanals'].fact}</p>
            <button class="btn btn-full" onclick="closeKanalGame()">Turpināt</button>`;
    } else {
        document.querySelector('.task-section').innerHTML = `
            <h2>Neizdevās!</h2>
            <p>Laiva saskārās ar ${kanalHits} akmeņiem vai laiks beidzās.</p>
            <button class="btn btn-full" onclick="initKanalGame()">Mēģināt vēlreiz</button>`;
    }
}

function closeKanalGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Kanals') { _ac.addViolation(); showNotification('Aizdomīga darbība!', 'error', 3000); return; }
    recordMiniScore('Kanals', 10);
    kanalGameActive = false;
    document.removeEventListener('keydown', kanalKeyDown2);
    document.removeEventListener('keyup', kanalKeyUp2);
    _ac.activeTask = false; _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Kanals', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask(); updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

// --- Mini-game: Cargo Sort (LSEZ) ---
let lsezActive = false, lsezCorrect = 0, lsezWrong = 0, lsezRound2 = 0;
let lsezCurrentBin = -1, lsezItemTimer = null;
const LSEZ_TOTAL2 = 10;
const LSEZ_ITEM_MS = 3000;
const LSEZ_TYPES2 = [
    { label: 'Sarkana', color: '#b22222', bin: 0 },
    { label: 'Zila',    color: '#1e4fa0', bin: 1 },
    { label: 'Zaļa',    color: '#1a6b2a', bin: 2 },
];
const LSEZ_ICONS = ['📦', '🗃', '📫'];

function startLSEZGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Kravas Šķirošana</h2>
        <p>Šķiro kastes pēc krāsas atbilstošajā tvertnē!</p>
        <p style="font-size:13px;opacity:0.7;">Klikšķini uz pareizās tvertnes pirms laiks beidzas.</p>
        <button class="btn btn-full" onclick="initLSEZGame()">SĀKT</button>`;
}

function initLSEZGame() {
    lsezActive = true; lsezCorrect = 0; lsezWrong = 0; lsezRound2 = 0;
    lsezNextItem();
}

function lsezNextItem() {
    if (!lsezActive) return;
    if (lsezRound2 >= LSEZ_TOTAL2) { finishLSEZGame(); return; }
    lsezRound2++;
    const type = LSEZ_TYPES2[Math.floor(Math.random() * LSEZ_TYPES2.length)];
    lsezCurrentBin = type.bin;
    const icon = LSEZ_ICONS[type.bin];
    let msLeft = LSEZ_ITEM_MS;
    document.querySelector('.task-section').innerHTML = `
        <p style="color:#ffaa00;margin:0 0 4px;font-size:13px;">Kaste ${lsezRound2}/${LSEZ_TOTAL2} | ✓ ${lsezCorrect} | ✗ ${lsezWrong}</p>
        <div style="height:6px;background:rgba(255,255,255,0.15);border-radius:3px;margin-bottom:10px;">
            <div id="lsez-bar" style="height:100%;width:100%;background:#ffaa00;border-radius:3px;transition:width 0.1s linear;"></div>
        </div>
        <div style="text-align:center;padding:10px 0;">
            <span style="font-size:52px;filter:drop-shadow(0 0 12px ${type.color});">${icon}</span>
            <p style="font-size:22px;font-weight:bold;color:${type.color};margin:6px 0 0;">${type.label}</p>
        </div>
        <p style="text-align:center;font-size:12px;opacity:0.6;margin-bottom:8px;">Izvēlies pareizo tvertni:</p>
        <div style="display:flex;gap:6px;">
            ${LSEZ_TYPES2.map(function(t, i) {
                return `<button class="btn btn-full" style="background:${t.color};border:2px solid ${t.color};font-size:13px;padding:10px 4px;" onclick="lsezSort(${i})">${t.label}</button>`;
            }).join('')}
        </div>`;
    if (lsezItemTimer) clearInterval(lsezItemTimer);
    lsezItemTimer = setInterval(function() {
        msLeft -= 100;
        const bar = document.getElementById('lsez-bar');
        if (bar) bar.style.width = Math.max(0, msLeft / LSEZ_ITEM_MS * 100) + '%';
        if (msLeft <= 0) { clearInterval(lsezItemTimer); lsezItemTimer = null; lsezWrong++; lsezShowFeedback(false); }
    }, 100);
}

function lsezSort(binIdx) {
    if (!lsezActive) return;
    if (lsezItemTimer) { clearInterval(lsezItemTimer); lsezItemTimer = null; }
    const ok = lsezCurrentBin === binIdx;
    if (ok) lsezCorrect++; else lsezWrong++;
    lsezShowFeedback(ok);
}

function lsezShowFeedback(ok) {
    const sec = document.querySelector('.task-section');
    if (!sec) return;
    const p = document.createElement('p');
    p.style.cssText = `color:${ok ? '#4CAF50' : '#f44336'};font-size:16px;font-weight:bold;text-align:center;margin:4px 0 0;`;
    p.textContent = ok ? '✓ Pareizi!' : '✗ Nepareizi!';
    sec.appendChild(p);
    setTimeout(lsezNextItem, 600);
}

function finishLSEZGame() {
    lsezActive = false;
    if (lsezItemTimer) { clearInterval(lsezItemTimer); lsezItemTimer = null; }
    const success = lsezCorrect >= 7;
    const gh = document.getElementById('guide-hint');
    if (gh) gh.textContent = getRandomBubble(success);
    if (success) {
        const pts = lsezCorrect >= 9 ? 10 : 7;
        GameState.addScore(pts);
        document.getElementById('score-display').innerText = 'Punkti: ' + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Lielisks darbs!</h2>
            <p>Pareizi šķirots: ${lsezCorrect}/${LSEZ_TOTAL2}</p>
            <p style="color:#ffaa00;font-size:20px;font-weight:bold;">+${pts} punkti!</p>
            <p style="color:#ffaa00;font-style:italic;">${questions['LSEZ'].fact}</p>
            <button class="btn btn-full" onclick="closeLSEZGame()">Turpināt</button>`;
    } else {
        document.querySelector('.task-section').innerHTML = `
            <h2>Nepietiekami!</h2>
            <p>Pareizi šķirots: ${lsezCorrect}/${LSEZ_TOTAL2} (vajag vismaz 7)</p>
            <button class="btn btn-full" onclick="initLSEZGame()">Mēģināt vēlreiz</button>`;
    }
}

function closeLSEZGame() {
    if (!_ac.activeTask || _ac.taskType !== 'LSEZ') { _ac.addViolation(); showNotification('Aizdomīga darbība!', 'error', 3000); return; }
    recordMiniScore('LSEZ', 10);
    lsezActive = false;
    if (lsezItemTimer) { clearInterval(lsezItemTimer); lsezItemTimer = null; }
    _ac.activeTask = false; _ac.taskType = null;
    _taskCompletionLog.push({ task: 'LSEZ', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask(); updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

// --- Mini-game: Guard Escape (Cietums) ---
let cietActive = false, cietSteps = 0, cietGuardPos = 0, cietGuardDir = 0.5;
let cietGuardSpd = 1.2, cietAnimId3 = null;
const CIET_STEPS_NEEDED = 5;

function startEscapeGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Izvairīšanās</h2>
        <p>Sardze patruļo. Spied <strong>SPACE</strong> vai pogu, kad rādītājs ir <strong>zaļajā zonā</strong>!</p>
        <p style="font-size:13px;opacity:0.7;">Vajadzīgi ${CIET_STEPS_NEEDED} veiksmīgi soļi, lai aizbēgtu.</p>
        <button class="btn btn-full" onclick="initEscapeGame()">SĀKT</button>`;
}

function initEscapeGame() {
    cietActive = true; cietSteps = 0; cietGuardPos = 0; cietGuardDir = 1; cietGuardSpd = 1.2;
    document.querySelector('.task-section').innerHTML = `
        <p id="ciet-status" style="color:#ffaa00;margin:0 0 6px;">Soļi: 0/${CIET_STEPS_NEEDED}</p>
        <canvas id="cietCanvas" style="width:100%;display:block;border:2px solid rgba(255,170,0,0.3);border-radius:8px;"></canvas>
        <button class="boat-tap-btn" onclick="cietMove()" style="margin-top:8px;">BĒG!</button>
        <p style="font-size:11px;opacity:0.5;text-align:center;margin-top:4px;">vai SPACE taustiņš</p>`;
    const canvas = document.getElementById('cietCanvas');
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width > 0 ? Math.floor(rect.width) : 320;
    canvas.width = cw; canvas.height = Math.floor(cw * 0.38);
    document.removeEventListener('keydown', cietKeyHandler);
    document.addEventListener('keydown', cietKeyHandler);
    if (cietAnimId3) cancelAnimationFrame(cietAnimId3);
    cietDrawLoop();
}

function cietKeyHandler(e) {
    if (cietActive && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); cietMove(); }
}

function cietDrawLoop() {
    if (!cietActive) return;
    const canvas = document.getElementById('cietCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    cietGuardPos += cietGuardDir * cietGuardSpd;
    if (cietGuardPos >= 100) { cietGuardPos = 100; cietGuardDir = -1; }
    if (cietGuardPos <= 0)   { cietGuardPos = 0;   cietGuardDir =  1; }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a0f05'; ctx.fillRect(0, 0, W, H);

    const sx = Math.floor(0.6 * (W - 20)) + 10;
    const ex = Math.floor(0.8 * (W - 20)) + 10;
    ctx.fillStyle = 'rgba(0,200,80,0.18)'; ctx.fillRect(sx, 0, ex - sx, H);
    ctx.strokeStyle = 'rgba(0,220,80,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, 0); ctx.lineTo(ex, H); ctx.stroke();
    ctx.fillStyle = 'rgba(0,220,80,0.7)';
    ctx.font = `bold ${Math.max(10, Math.floor(H * 0.18))}px Poppins,Arial`;
    ctx.textAlign = 'center'; ctx.fillText('✓ BĒG!', (sx + ex) / 2, H * 0.28); ctx.textAlign = 'start';

    const isSafe = cietGuardPos >= 60 && cietGuardPos <= 80;
    const gx = 10 + (cietGuardPos / 100) * (W - 20);

    ctx.fillStyle = '#333'; ctx.fillRect(10, H - 18, W - 20, 10);
    ctx.fillStyle = isSafe ? '#00cc55' : '#ff4444';
    ctx.beginPath(); ctx.arc(gx, H - 13, 7, 0, Math.PI * 2); ctx.fill();

    const gy = H * 0.52;
    ctx.fillStyle = '#444'; ctx.fillRect(gx - 10, gy, 20, 22);
    ctx.fillStyle = '#c8a060'; ctx.beginPath(); ctx.arc(gx, gy - 10, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(gx + cietGuardDir * 4, gy - 11, 2, 0, Math.PI * 2); ctx.fill();
    if (!isSafe) {
        ctx.fillStyle = 'rgba(255,255,80,0.07)';
        ctx.beginPath(); ctx.moveTo(gx + cietGuardDir * 6, gy - 8);
        ctx.lineTo(gx + cietGuardDir * 55, gy - 25); ctx.lineTo(gx + cietGuardDir * 55, gy + 5); ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = isSafe ? '#00cc55' : '#ff4444';
    ctx.font = `bold ${Math.max(11, Math.floor(H * 0.20))}px Poppins,Arial`;
    ctx.textAlign = 'center'; ctx.fillText(isSafe ? 'DROŠS' : 'UZMANĪBU!', W / 2, H * 0.52); ctx.textAlign = 'start';

    cietAnimId3 = requestAnimationFrame(cietDrawLoop);
}

function cietMove() {
    if (!cietActive) return;
    const isSafe = cietGuardPos >= 60 && cietGuardPos <= 80;
    if (isSafe) {
        cietSteps++;
        cietGuardSpd = Math.min(1, 0.6 + cietSteps * 0.35);
        const st = document.getElementById('ciet-status');
        if (st) st.textContent = `Soļi: ${cietSteps}/${CIET_STEPS_NEEDED}`;
        if (cietSteps >= CIET_STEPS_NEEDED) { finishEscapeGame(true); } else { showNotification('Labi', 'success', 700); }
    } else {
        showNotification('Sardze redz tevi', 'error', 800);
        cietSteps = Math.max(0, cietSteps - 1);
        const st = document.getElementById('ciet-status');
        if (st) st.textContent = `Soļi: ${cietSteps}/${CIET_STEPS_NEEDED}`;
    }
}

function finishEscapeGame(success) {
    if (!cietActive) return;
    cietActive = false;
    if (cietAnimId3) { cancelAnimationFrame(cietAnimId3); cietAnimId3 = null; }
    document.removeEventListener('keydown', cietKeyHandler);
    const gh = document.getElementById('guide-hint');
    if (gh) gh.textContent = getRandomBubble(success);
    if (success) {
        GameState.addScore(10);
        document.getElementById('score-display').innerText = 'Punkti: ' + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Aizbēgi!</h2>
            <p style="color: #ffaa00;">Tu veiksmīgi izvairījies no sardzēm! +10 punkti!</p>
            <p style="color:#ffaa00;font-style:italic;">${questions['Cietums'].fact}</p>
            <button class="btn btn-full" onclick="closeEscapeGame()">Turpināt</button>`;
    } else {
        document.querySelector('.task-section').innerHTML = `
            <h2>Noķerts!</h2>
            <p style="color: #ff7777;">Sardze tevi pamanīja!</p>
            <button class="btn btn-full" onclick="initEscapeGame()">Mēģināt vēlreiz</button>`;
    }
}

function closeEscapeGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Cietums') { _ac.addViolation(); showNotification('Aizdomīga darbība!', 'error', 3000); return; }
    recordMiniScore('Cietums', 10);
    cietActive = false;
    document.removeEventListener('keydown', cietKeyHandler);
    _ac.activeTask = false; _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Cietums', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask(); updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

// --- Mini-game: Bird Spotting (Ezerkrasts) ---
let birdActive = false, birdCaught = 0, birdTimeLeft = 0, birdTimer2 = null, birdSpawnInt = null;
const BIRDS_NEEDED = 8;
const BIRD_GAME_TIME = 22;
const BIRD_EMOJIS = ['🦢', '🦆', '🐦', '🦅', '🦉'];

function startBirdGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Putnu Vērošana</h2>
        <p>Nofotografē putnus pirms tie aizlido!</p>
        <p style="font-size:13px;opacity:0.7;">Klikšķini uz putniem. Vajadzīgi ${BIRDS_NEEDED} putni ${BIRD_GAME_TIME} sekundēs.</p>
        <button class="btn btn-full" onclick="initBirdGame()">SĀKT</button>`;
}

function initBirdGame() {
    birdActive = true; birdCaught = 0; birdTimeLeft = BIRD_GAME_TIME;
    document.querySelector('.task-section').innerHTML = `
        <p id="bird-stats" style="color:#ffaa00;margin:0 0 4px;font-size:13px;">Putni: 0/${BIRDS_NEEDED} | ${BIRD_GAME_TIME}s</p>
        <div id="bird-field" style="position:relative;width:220px;height:200px;background:linear-gradient(180deg,rgba(100,180,255,0.2),rgba(30,120,60,0.3));border:2px solid rgba(255,170,0,0.3);border-radius:8px;overflow:hidden;cursor:crosshair;"></div>`;
    if (birdTimer2) clearInterval(birdTimer2);
    birdTimer2 = setInterval(function() {
        if (!birdActive) return;
        birdTimeLeft--;
        const el = document.getElementById('bird-stats');
        if (el) el.textContent = `Putni: ${birdCaught}/${BIRDS_NEEDED} | ${birdTimeLeft}s`;
        if (birdTimeLeft <= 0) finishBirdGame();
    }, 1000);
    if (birdSpawnInt) clearInterval(birdSpawnInt);
    birdSpawnInt = setInterval(function() { if (birdActive) spawnBird(); }, 1400);
    spawnBird(); spawnBird();
}

function spawnBird() {
    if (!birdActive) return;
    const field = document.getElementById('bird-field');
    if (!field) return;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const b = document.createElement('div');
    const em = BIRD_EMOJIS[Math.floor(Math.random() * BIRD_EMOJIS.length)];
    const sz = isTouch ? 44 : 32;
    const stay = 1500 + Math.random() * 1200;
    b.textContent = em;
    b.style.cssText = `position:absolute;font-size:${sz}px;cursor:pointer;user-select:none;opacity:0;transition:opacity 0.25s;left:${2 + Math.random() * 80}%;top:${5 + Math.random() * 68}%;z-index:5;${isTouch ? 'padding:6px;' : ''}`;
    field.appendChild(b);
    requestAnimationFrame(function() { if (b.parentNode) b.style.opacity = '1'; });
    const flyTimer = setTimeout(function() {
        if (!b.parentNode) return;
        b.style.opacity = '0';
        setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 280);
    }, stay);
    const catchBird = function(e) {
        e.preventDefault();
        if (!birdActive || !b.parentNode) return;
        clearTimeout(flyTimer);
        birdCaught++;
        b.textContent = '*'; b.style.transition = 'all 0.2s'; b.style.transform = 'scale(1.4)';
        const el = document.getElementById('bird-stats');
        if (el) el.textContent = `Putni: ${birdCaught}/${BIRDS_NEEDED} | ${birdTimeLeft}s`;
        setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 200);
        if (birdCaught >= BIRDS_NEEDED) finishBirdGame();
    };
    b.addEventListener('click', catchBird);
    b.addEventListener('touchstart', catchBird, { passive: false });
}

function finishBirdGame() {
    if (!birdActive) return;
    birdActive = false;
    if (birdTimer2) { clearInterval(birdTimer2); birdTimer2 = null; }
    if (birdSpawnInt) { clearInterval(birdSpawnInt); birdSpawnInt = null; }
    const success = birdCaught >= BIRDS_NEEDED;
    const gh = document.getElementById('guide-hint');
    if (gh) gh.textContent = getRandomBubble(success);
    if (success) {
        const pts = birdTimeLeft > 10 ? 10 : 7;
        GameState.addScore(pts);
        document.getElementById('score-display').innerText = 'Punkti: ' + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Lielisks!</h2>
            <p>Nofotografēti ${birdCaught} putni!</p>
            <p style="color:#ffaa00;font-size:20px;font-weight:bold;">+${pts} punkti!</p>
            <p style="color:#ffaa00;font-style:italic;">${questions['Ezerkrasts'].fact}</p>
            <button class="btn btn-full" onclick="closeBirdGame()">Turpināt</button>`;
    } else {
        document.querySelector('.task-section').innerHTML = `
            <h2>Nepietiekami!</h2>
            <p>Nofotografēti ${birdCaught}/${BIRDS_NEEDED} putni.</p>
            <button class="btn btn-full" onclick="initBirdGame()">Mēģināt vēlreiz</button>`;
    }
}

function closeBirdGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Ezerkrasts') { _ac.addViolation(); showNotification('Aizdomīga darbība!', 'error', 3000); return; }
    recordMiniScore('Ezerkrasts', 10);
    birdActive = false;
    _ac.activeTask = false; _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Ezerkrasts', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask(); updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

// --- Mini-game: Memory Cards (Parks) ---
let memActive = false, memCards = [], memFlipped2 = [], memMatched2 = 0, memMoves = 0, memLock = false;
const MEM_PAIRS2 = ['🌲', '🌳', '🌴', '🌿'];

function startMemoryGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Koku Atmiņa</h2>
        <p>Atrodi visus koku pārus!</p>
        <p style="font-size:13px;opacity:0.7;">Apvērs divas kārtis – ja simboli sakrīt, tās paliek atklātas.</p>
        <button class="btn btn-full" onclick="initMemoryGame()">SĀKT</button>`;
}

function initMemoryGame() {
    memActive = true; memFlipped2 = []; memMatched2 = 0; memMoves = 0; memLock = false;
    const deck = [...MEM_PAIRS2, ...MEM_PAIRS2].sort(function() { return Math.random() - 0.5; });
    memCards = deck.map(function(v, i) { return { id: i, value: v, matched: false }; });
    renderMemoryBoard();
}

function renderMemoryBoard() {
    document.querySelector('.task-section').innerHTML = `
        <p id="mem-stats" style="color:#ffaa00;margin:0 0 6px;font-size:13px;">Soļi: ${memMoves} | Pāri: ${memMatched2}/${MEM_PAIRS2.length}</p>
        <div class="mem-grid">${memCards.map(function(c) {
            return `<div class="mem-card${c.matched ? ' matched' : ''}" id="mc-${c.id}" onclick="memFlip(${c.id})"><div class="mem-back">?</div><div class="mem-front">${c.value}</div></div>`;
        }).join('')}</div>`;
    memFlipped2.forEach(function(id) {
        const el = document.getElementById('mc-' + id);
        if (el && !memCards[id].matched) el.classList.add('flipped');
    });
}

function memFlip(id) {
    if (!memActive || memLock) return;
    const card = memCards[id];
    if (!card || card.matched || memFlipped2.includes(id)) return;
    const el = document.getElementById('mc-' + id);
    if (!el) return;
    el.classList.add('flipped');
    memFlipped2.push(id);
    if (memFlipped2.length < 2) return;
    memMoves++;
    memLock = true;
    const a = memFlipped2[0], b = memFlipped2[1];
    if (memCards[a].value === memCards[b].value) {
        memCards[a].matched = memCards[b].matched = true;
        memMatched2++;
        memFlipped2 = []; memLock = false;
        document.getElementById('mc-' + a).classList.add('matched');
        document.getElementById('mc-' + b).classList.add('matched');
        const st = document.getElementById('mem-stats');
        if (st) st.textContent = `Soļi: ${memMoves} | Pāri: ${memMatched2}/${MEM_PAIRS2.length}`;
        if (memMatched2 >= MEM_PAIRS2.length) setTimeout(finishMemoryGame, 400);
    } else {
        setTimeout(function() {
            const ea = document.getElementById('mc-' + a), eb = document.getElementById('mc-' + b);
            if (ea) ea.classList.remove('flipped');
            if (eb) eb.classList.remove('flipped');
            memFlipped2 = []; memLock = false;
            const st = document.getElementById('mem-stats');
            if (st) st.textContent = `Soļi: ${memMoves} | Pāri: ${memMatched2}/${MEM_PAIRS2.length}`;
        }, 900);
    }
}

function finishMemoryGame() {
    if (!memActive) return;
    memActive = false;
    const gh = document.getElementById('guide-hint');
    if (gh) gh.textContent = getRandomBubble(true);
    const pts = memMoves <= 5 ? 10 : 7;
    GameState.addScore(pts);
    document.getElementById('score-display').innerText = 'Punkti: ' + GameState.getScore();
    document.querySelector('.task-section').innerHTML = `
        <h2>Apsveicam!</h2>
        <p>Atrasti visi pāri ${memMoves} soļos!</p>
        <p style="color:#ffaa00;font-size:20px;font-weight:bold;">+${pts} punkti!</p>
        <p style="color:#ffaa00;font-style:italic;">${questions['Parks'].fact}</p>
        <button class="btn btn-full" onclick="closeMemoryGame()">Turpināt</button>`;
}

function closeMemoryGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Parks') { _ac.addViolation(); showNotification('Aizdomīga darbība!', 'error', 3000); return; }
    recordMiniScore('Parks', 10);
    memActive = false;
    _ac.activeTask = false; _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Parks', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask(); updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showFinalTest();
}

window.startFishingGame = startFishingGame;
window.initFishingLogic = initFishingLogic;
window.closeFishingGame = closeFishingGame;
window.startSimonGame = startSimonGame;
window.initSimonRounds = initSimonRounds;
window.simonClick = simonClick;
window.closeSimonGame = closeSimonGame;
window.startKanalGame = startKanalGame;
window.initKanalGame = initKanalGame;
window.kanalSetKey = kanalSetKey;
window.closeKanalGame = closeKanalGame;
window.startLSEZGame = startLSEZGame;
window.initLSEZGame = initLSEZGame;
window.lsezSort = lsezSort;
window.closeLSEZGame = closeLSEZGame;
window.startEscapeGame = startEscapeGame;
window.initEscapeGame = initEscapeGame;
window.cietMove = cietMove;
window.closeEscapeGame = closeEscapeGame;
window.startBirdGame = startBirdGame;
window.initBirdGame = initBirdGame;
window.closeBirdGame = closeBirdGame;
window.startMemoryGame = startMemoryGame;
window.initMemoryGame = initMemoryGame;
window.memFlip = memFlip;
window.closeMemoryGame = closeMemoryGame;
window.toggleModal = toggleModal;
window.startSingleGame = startSingleGame;
window.openLobby = openLobby;
window.joinGame = joinGame;
window.exitGame = exitGame;
window.setMusicVolume = setMusicVolume;
window.setSFXVolume = setSFXVolume;
window.setTheme = setTheme;
window.startActivity = startActivity;
window.checkAns = checkAns;
window.showTheory = showTheory;
window.closeQuizAndContinue = closeQuizAndContinue;
window.initBoatRace = initBoatRace;
window.closeBoatGame = closeBoatGame;
window.startHistorySequence = startHistorySequence;
window.checkHistorySequence = checkHistorySequence;
window.closeHistoryGame = closeHistoryGame;
window.sendReady = sendReady;
window.sendLobbyReady = sendLobbyReady;
window.checkMini = checkMini;
    window.toggleAnimations = toggleAnimations;
})();
