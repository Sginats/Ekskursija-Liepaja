(() => {
  if (typeof Phaser === "undefined") {
    return;
  }

  const overlay = {
    root: null,
    title: null,
    body: null,
    primary: null,
    secondary: null,
    show({ title, body, primaryText, secondaryText, onPrimary, onSecondary }) {
      if (!overlay.root) return;
      overlay.title.textContent = title || "";
      overlay.body.textContent = body || "";
      overlay.primary.textContent = primaryText || "Turpināt";
      overlay.secondary.textContent = secondaryText || "Atcelt";
      overlay.primary.onclick = onPrimary || null;
      overlay.secondary.onclick = onSecondary || null;
      overlay.root.classList.add("visible");
    },
    hide() {
      if (overlay.root) overlay.root.classList.remove("visible");
    }
  };

  class TowerBlocksScene extends Phaser.Scene {
    constructor() {
      super("TowerBlocksScene");
      this.blocks = [];
      this.activeBlock = null;
      this.dropStarted = false;
      this.blockCount = 0;
      this.targetCount = 10;
      this.scoreCap = 10;
      this.activityId = "";
      this.baseY = 540;
      this.moveDir = 1;
    }

    init(data) {
      this.activityId = data.activityId;
      this.scoreCap = data.scoreCap || 10;
      this.blockCount = 0;
      this.blocks = [];
      this.dropStarted = false;
      this.moveDir = 1;
    }

    create() {
      this.physics.world.gravity.y = 600;
      this.cameras.main.setBackgroundColor("#1c0f0f");
      this.add.text(320, 40, "Būvniecība", { fontFamily: "Arial", fontSize: "22px", color: "#ffdd99" }).setOrigin(0.5);
      this.add.text(320, 70, "Nospied Space, lai nomestu bloku", { fontFamily: "Arial", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5);
      this.add.rectangle(320, this.baseY + 24, 640, 48, 0x3b2a2a);
      this.createNewBlock();

      this.input.keyboard.on("keydown-SPACE", () => {
        if (this.dropStarted) return;
        this.dropStarted = true;
        this.activeBlock.body.setAllowGravity(true);
        this.activeBlock.body.setVelocityY(400);
      });
    }

    createNewBlock() {
      const width = Phaser.Math.Between(80, 140);
      const y = 80;
      const block = this.add.rectangle(320, y, width, 26, 0xffaa00);
      this.physics.add.existing(block);
      block.body.setAllowGravity(false);
      block.body.setImmovable(true);
      block.body.setVelocityX(120 * this.moveDir);
      this.activeBlock = block;
      this.dropStarted = false;
      this.moveDir *= -1;
    }

    update() {
      if (!this.activeBlock) return;
      const block = this.activeBlock;

      if (!this.dropStarted) {
        if (block.x < 80 || block.x > 560) {
          block.body.setVelocityX(-block.body.velocity.x);
        }
        return;
      }

      if (block.y >= this.baseY - this.blockCount * 26 - 10) {
        block.body.setVelocity(0, 0);
        block.body.setAllowGravity(false);
        const previous = this.blocks[this.blocks.length - 1];
        if (previous) {
          const overlap = Math.max(0, Math.min(block.x + block.width / 2, previous.x + previous.width / 2) - Math.max(block.x - block.width / 2, previous.x - previous.width / 2));
          if (overlap < block.width * 0.5) {
            this.failState();
            return;
          }
        }

        this.blocks.push(block);
        this.blockCount += 1;

        if (this.blockCount === this.targetCount) {
          this.reachMilestone();
          return;
        }

        this.createNewBlock();
      } else if (block.y > 620) {
        this.failState();
      }
    }

    reachMilestone() {
      this.scene.pause();
      window.MinigameManager.showOverlay({
        title: "Milestone",
        body: "Tu sasniedzi 10 blokus.",
        primaryText: "Turpināt →",
        secondaryText: "Spēlēt vēl",
        onPrimary: () => {
          window.MinigameManager.hideOverlay();
          window.MinigameManager.complete(this.activityId, this.scoreCap);
        },
        onSecondary: () => {
          window.MinigameManager.hideOverlay();
          this.scene.restart({ activityId: this.activityId, scoreCap: this.scoreCap });
        }
      });
    }

    failState() {
      this.scene.pause();
      window.MinigameManager.showOverlay({
        title: "Kritiens",
        body: "Bloks nokrita. Mēģināsi vēlreiz vai turpināsi tālāk?",
        primaryText: "Mēģināt vēlreiz",
        secondaryText: "Turpināt →",
        onPrimary: () => {
          window.MinigameManager.hideOverlay();
          this.scene.restart({ activityId: this.activityId, scoreCap: this.scoreCap });
        },
        onSecondary: () => {
          window.MinigameManager.hideOverlay();
          window.MinigameManager.complete(this.activityId, 0);
        }
      });
    }
  }

  class DzintarsScene extends Phaser.Scene {
    constructor() {
      super("DzintarsScene");
      this.sequence = [];
      this.inputIndex = 0;
      this.isPlaying = false;
      this.scoreCap = 10;
      this.activityId = "";
      this.audioCtx = null;
      this.lastToneAt = 0;
    }

    init(data) {
      this.activityId = data.activityId;
      this.scoreCap = data.scoreCap || 10;
      this.sequence = [];
      this.inputIndex = 0;
      this.isPlaying = false;
      this.lastToneAt = 0;
    }

    create() {
      this.physics.world.gravity.y = 0;
      this.cameras.main.setBackgroundColor("#2a1a1a");
      this.add.text(320, 60, "Dzintara toņi", { fontFamily: "Arial", fontSize: "24px", color: "#ffdd99" }).setOrigin(0.5);
      this.add.text(320, 95, "Noklausies un atkārto secību", { fontFamily: "Arial", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5);

      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const tones = [
        { x: 200, y: 260, color: 0xffaa00, freq: 392 },
        { x: 320, y: 260, color: 0xff7700, freq: 440 },
        { x: 440, y: 260, color: 0xff5500, freq: 523 }
      ];

      tones.forEach((tone, index) => {
        const circle = this.add.circle(tone.x, tone.y, 40, tone.color).setInteractive();
        circle.on("pointerdown", () => this.handleTone(index, tone.freq, circle));
        tone.sprite = circle;
      });

      this.sequence = Phaser.Utils.Array.Shuffle([0, 1, 2]).slice(0, 3);
      this.time.delayedCall(400, () => this.playSequence(tones));
    }

    playSequence(tones) {
      if (this.isPlaying) return;
      this.isPlaying = true;
      let delay = 0;
      this.sequence.forEach((index) => {
        this.time.delayedCall(delay, () => this.playTone(tones[index].freq, tones[index].sprite));
        delay += 600;
      });
      this.time.delayedCall(delay, () => {
        this.isPlaying = false;
      });
    }

    playTone(freq, sprite) {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const volume = window.MinigameManager.getVolume();
      gain.gain.value = volume;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      sprite.setScale(1.2);
      this.time.delayedCall(200, () => {
        osc.stop();
        sprite.setScale(1);
      });
    }

    handleTone(index, freq, sprite) {
      if (this.isPlaying) return;
      const now = Date.now();
      if (now - this.lastToneAt < 180) return;
      this.lastToneAt = now;
      this.playTone(freq, sprite);
      if (this.sequence[this.inputIndex] === index) {
        this.inputIndex += 1;
        if (this.inputIndex >= this.sequence.length) {
          window.MinigameManager.complete(this.activityId, this.scoreCap);
        }
      } else {
        this.inputIndex = 0;
      }
    }
  }

  class TeatrisScene extends Phaser.Scene {
    constructor() {
      super("TeatrisScene");
      this.activityId = "";
      this.scoreCap = 10;
    }

    init(data) {
      this.activityId = data.activityId;
      this.scoreCap = data.scoreCap || 10;
    }

    create() {
      this.physics.world.gravity.y = 0;
      this.cameras.main.setBackgroundColor("#1d1020");
      this.add.text(320, 70, "Teātra dekors", { fontFamily: "Arial", fontSize: "22px", color: "#ffdd99" }).setOrigin(0.5);
      this.add.text(320, 100, "Izvēlies pareizo aizkaru krāsu", { fontFamily: "Arial", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5);

      const choices = [
        { color: 0xaa0000, correct: true },
        { color: 0x0033aa, correct: false },
        { color: 0x228822, correct: false }
      ];
      Phaser.Utils.Array.Shuffle(choices);

      choices.forEach((choice, i) => {
        const rect = this.add.rectangle(200 + i * 120, 280, 90, 140, choice.color).setInteractive();
        rect.on("pointerdown", () => {
          if (choice.correct) {
            window.MinigameManager.complete(this.activityId, this.scoreCap);
          } else {
            this.add.text(320, 420, "Mēģini vēlreiz", { fontFamily: "Arial", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5);
          }
        });
      });
    }
  }

  class RegateScene extends Phaser.Scene {
    constructor() {
      super("RegateScene");
      this.activityId = "";
      this.scoreCap = 10;
      this.boat = null;
      this.goal = null;
      this.speed = 0;
      this.startTime = 0;
    }

    init(data) {
      this.activityId = data.activityId;
      this.scoreCap = data.scoreCap || 10;
      this.speed = 0;
    }

    create() {
      this.physics.world.gravity.y = 0;
      this.cameras.main.setBackgroundColor("#0e2a3b");
      this.add.text(320, 40, "Ostas regate", { fontFamily: "Arial", fontSize: "22px", color: "#ffdd99" }).setOrigin(0.5);
      this.add.text(320, 70, "Stūrē līdz bākai", { fontFamily: "Arial", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5);

      this.boat = this.add.rectangle(120, 420, 28, 48, 0xffaa00);
      this.physics.add.existing(this.boat);
      this.boat.body.setAllowGravity(false);
      this.boat.body.setCollideWorldBounds(true);
      this.goal = this.add.circle(520, 120, 26, 0x66ffcc);
      this.physics.add.existing(this.goal);
      this.goal.body.setImmovable(true);

      const obstacles = [
        this.add.rectangle(240, 220, 120, 20, 0x355060),
        this.add.rectangle(360, 320, 160, 20, 0x355060),
        this.add.rectangle(400, 180, 20, 120, 0x355060)
      ];

      obstacles.forEach((obs) => {
        this.physics.add.existing(obs, true);
        this.physics.add.collider(this.boat, obs, () => {
          this.speed = Math.max(0, this.speed - 40);
        });
      });

      this.physics.add.overlap(this.boat, this.goal, () => this.finish());
      this.cursors = this.input.keyboard.createCursorKeys();
      this.startTime = Date.now();
    }

    update(time, delta) {
      const accel = 40;
      if (this.cursors.up.isDown) this.speed = Math.min(220, this.speed + accel);
      if (this.cursors.down.isDown) this.speed = Math.max(60, this.speed - accel);

      let vx = 0;
      let vy = 0;
      if (this.cursors.left.isDown) vx = -this.speed;
      if (this.cursors.right.isDown) vx = this.speed;
      if (this.cursors.up.isDown) vy = -this.speed;
      if (this.cursors.down.isDown) vy = this.speed;
      this.boat.body.setVelocity(vx, vy);
    }

    finish() {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const score = Math.max(0, this.scoreCap - Math.floor(elapsed));
      window.MinigameManager.complete(this.activityId, score);
    }
  }

  class CietumsScene extends Phaser.Scene {
    constructor() {
      super("CietumsScene");
      this.activityId = "";
      this.scoreCap = 10;
      this.player = null;
      this.speed = 80;
      this.obstacles = [];
      this.spawnTimer = 0;
      this.startTime = 0;
    }

    init(data) {
      this.activityId = data.activityId;
      this.scoreCap = data.scoreCap || 10;
      this.speed = 80;
      this.spawnTimer = 0;
      this.obstacles = [];
    }

    create() {
      this.physics.world.gravity.y = 0;
      this.cameras.main.setBackgroundColor("#0f1115");
      this.add.text(320, 50, "Cietuma koridors", { fontFamily: "Arial", fontSize: "22px", color: "#ffdd99" }).setOrigin(0.5);
      this.add.text(320, 80, "Izvairies no režģiem", { fontFamily: "Arial", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5);

      this.player = this.add.rectangle(320, 520, 26, 26, 0xffaa00);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.cursors = this.input.keyboard.createCursorKeys();
      this.startTime = Date.now();
    }

    update(time, delta) {
      const move = 220;
      if (this.cursors.left.isDown) this.player.body.setVelocityX(-move);
      else if (this.cursors.right.isDown) this.player.body.setVelocityX(move);
      else this.player.body.setVelocityX(0);

      this.speed += delta * 0.02;
      this.spawnTimer += delta;
      if (this.spawnTimer > 800) {
        this.spawnTimer = 0;
        const obstacle = this.add.rectangle(Phaser.Math.Between(60, 580), -20, 80, 18, 0x556677);
        this.physics.add.existing(obstacle);
        obstacle.body.setVelocityY(this.speed);
        this.obstacles.push(obstacle);
        this.physics.add.overlap(this.player, obstacle, () => this.fail());
      }

      this.obstacles = this.obstacles.filter((obs) => {
        if (obs.y > 620) {
          obs.destroy();
          return false;
        }
        return true;
      });

      if (Date.now() - this.startTime > 12000) {
        window.MinigameManager.complete(this.activityId, this.scoreCap);
      }
    }

    fail() {
      this.scene.pause();
      window.MinigameManager.showOverlay({
        title: "Aizturēts",
        body: "Režģi tevi noķēra. Mēģināsi vēlreiz?",
        primaryText: "Mēģināt vēlreiz",
        secondaryText: "Turpināt →",
        onPrimary: () => {
          window.MinigameManager.hideOverlay();
          this.scene.restart({ activityId: this.activityId, scoreCap: this.scoreCap });
        },
        onSecondary: () => {
          window.MinigameManager.hideOverlay();
          window.MinigameManager.complete(this.activityId, 0);
        }
      });
    }
  }

  const manager = {
    game: null,
    currentScene: null,
    volume: 0.4,
    init(containerId) {
      overlay.root = document.getElementById("minigame-overlay");
      if (overlay.root) {
        overlay.title = overlay.root.querySelector("[data-overlay-title]");
        overlay.body = overlay.root.querySelector("[data-overlay-body]");
        overlay.primary = overlay.root.querySelector("[data-overlay-primary]");
        overlay.secondary = overlay.root.querySelector("[data-overlay-secondary]");
      }

      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerId,
        width: 640,
        height: 600,
        backgroundColor: "#2a1a1a",
        physics: {
          default: "arcade",
          arcade: { gravity: { y: 600 }, debug: false }
        },
        scene: [TowerBlocksScene, DzintarsScene, TeatrisScene, RegateScene, CietumsScene]
      });
    },
    start(sceneKey, data) {
      if (!this.game) return;
      this.currentScene = sceneKey;
      overlay.hide();
      this.game.scene.start(sceneKey, data);
    },
    complete(activityId, score) {
      if (this.game && this.currentScene) {
        this.game.scene.stop(this.currentScene);
      }
      const event = new CustomEvent("minigame-complete", { detail: { activityId, score } });
      window.dispatchEvent(event);
    },
    showOverlay: overlay.show,
    hideOverlay: overlay.hide,
    setVolume(value) {
      this.volume = Math.min(1, Math.max(0, value));
    },
    getVolume() {
      return this.volume;
    }
  };

  window.MinigameManager = manager;
})();
