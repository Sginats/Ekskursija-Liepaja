(function() {
    'use strict';

    if (window.MinigameFX) return;

    window.MinigameFX = {
        applyTheme: function(scene, variant) {
            const { width, height } = scene.scale;
            scene.cameras.main.setBackgroundColor(variant === 'construction' ? '#0f172a' : '#0a0a1a');
            const graphics = scene.add.graphics();
            graphics.lineStyle(1, 0x1e293b, 0.4);
            for (let i = 0; i < width + 100; i += 40) graphics.lineBetween(i, 0, i, height + 2000);
            for (let j = 0; j < height + 2000; j += 40) graphics.lineBetween(0, j, width, j);
            return graphics;
        },
        makeParticles: function(scene, texture = 'spark') {
            if (!scene.textures.exists(texture)) {
                const g = scene.add.graphics();
                g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 4);
                g.generateTexture(texture, 8, 8); g.destroy();
            }
            return scene.add.particles(0, 0, texture, {
                speed: { min: 60, max: 200 }, lifespan: 400, gravityY: 300,
                scale: { start: 0.8, end: 0 }, blendMode: 'ADD', emitting: false
            });
        },
        burst: function(emitter, x, y, amount = 15) {
            if (emitter && emitter.explode) emitter.explode(amount, x, y);
        },
        flash: function(scene, ms = 100, color = 0xffffff) {
            scene.cameras.main.flash(ms, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
        },
        shake: function(scene, ms = 200, intensity = 0.01) {
            scene.cameras.main.shake(ms, intensity);
        },
        textPop: function(scene, x, y, text, color = '#ffb000') {
            const txt = scene.add.text(x, y, text, {
                fontFamily: 'Poppins, Arial', fontSize: '20px', fill: color, fontWeight: 'bold'
            }).setOrigin(0.5).setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
            scene.tweens.add({
                targets: txt, y: y - 50, alpha: 0, duration: 600, ease: 'Power2',
                onComplete: () => txt.destroy()
            });
        },
        tinySynth: function() {
            let ctx = null;
            const ensure = () => {
                if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
                if (ctx.state === 'suspended') ctx.resume();
                return ctx;
            };
            const play = (freq, duration = 0.08, type = 'sine', gainValue = 0.08) => {
                const c = ensure(); if (!c) return;
                const o = c.createOscillator(); const g = c.createGain();
                o.type = type; o.frequency.value = freq;
                const t = c.currentTime;
                g.gain.setValueAtTime(gainValue, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + duration);
                o.connect(g); g.connect(c.destination);
                o.start(t); o.stop(t + duration);
            };
            return { play };
        }
    };
})();
