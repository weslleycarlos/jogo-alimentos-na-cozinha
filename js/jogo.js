class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }
    preload() {
        this.load.image('fundo-menu', 'assets/fundo-cozinha.jpg');
    }
    create() {
        this.add.image(600, 400, 'fundo-menu').setScale(2); // Ajustado para nova resolução
        
        let titulo = this.add.text(600, 250, 'Jogo de Alimentos na Cozinha', { fontSize: '64px', fill: '#ff4500' }).setOrigin(0.5);
        this.tweens.add({ targets: titulo, y: '+=20', duration: 1000, yoyo: true, repeat: -1 });
        
        let btn2 = this.add.text(450, 450, '2 Jogadores', { fontSize: '40px', fill: '#32cd32', backgroundColor: '#fff' }).setInteractive().setPadding(20);
        let btn3 = this.add.text(750, 450, '3 Jogadores', { fontSize: '40px', fill: '#32cd32', backgroundColor: '#fff' }).setInteractive().setPadding(20);
        
        btn2.on('pointerdown', () => this.iniciarJogo(2));
        btn3.on('pointerdown', () => this.iniciarJogo(3));
        
        [btn2, btn3].forEach(btn => {
            btn.on('pointerover', () => btn.setStyle({ fill: '#228b22' }));
            btn.on('pointerout', () => btn.setStyle({ fill: '#32cd32' }));
        });
    }
    iniciarJogo(num) {
        this.game.registry.set('numJogadores', num);
        this.scene.start('GameScene');
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    preload() {
        this.load.image('fundo', 'assets/fundo-cozinha.jpg');
        this.load.image('maca', 'assets/maca.png');
        this.load.image('pizza', 'assets/pizza.png');
        this.load.image('cupcake', 'assets/cupcake.png');
        this.load.image('faca', 'assets/faca.png');
        this.load.image('garfo', 'assets/garfo.png');
        this.load.image('colher', 'assets/colher.png');
    }
    create() {
        const numJogadores = this.registry.get('numJogadores');
        const larguraFaixa = this.scale.width / numJogadores;
        const velocidade = 300; // Aumentado para obstáculos mais rápidos
        let jogadores = [];
        let obstaculosPool = this.physics.add.group();

        this.add.image(600, 400, 'fundo').setScale(2); // Ajustado para nova resolução

        for (let i = 1; i < numJogadores; i++) {
            let linha = this.add.line(0, 0, i * larguraFaixa, 0, i * larguraFaixa, 800, 0xffffff).setOrigin(0);
            linha.setStrokeStyle(2, 0xffffff);
        }

        const spritesJog = ['maca', 'pizza', 'cupcake'];
        for (let i = 0; i < numJogadores; i++) {
            let jogador = this.physics.add.sprite((i * larguraFaixa) + (larguraFaixa / 2), 700, spritesJog[i]);
            jogador.setCollideWorldBounds(true);
            jogador.body.setSize(32, 32);
            jogador.setDisplaySize(32, 32); // Padroniza tamanho do sprite
            jogador.larguraFaixa = larguraFaixa;
            jogador.faixaInicio = i * larguraFaixa;
            jogadores.push(jogador);
        }

        // Controles via teclado
        this.cursors = {
            player1: { left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A), right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D) },
            player2: { left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K), right: this.input.keyboard.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L) },
            player3: { left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT), right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT) }
        };

        this.time.addEvent({
            delay: 1000, // Reduzido para mais obstáculos
            callback: () => {
                if (Math.random() < 0.4) { // Aumentado para mais frequência
                    for (let i = 0; i < numJogadores; i++) {
                        if (jogadores[i].active) {
                            let obs = obstaculosPool.get((i * larguraFaixa) + Math.random() * (larguraFaixa - 32), -32);
                            const spritesObs = ['faca', 'garfo', 'colher'][Math.floor(Math.random() * 3)];
                            if (!obs) {
                                obs = this.physics.add.sprite((i * larguraFaixa) + Math.random() * (larguraFaixa - 32), -32, spritesObs);
                                obstaculosPool.add(obs);
                            }
                            obs.setTexture(spritesObs);
                            obs.setActive(true).setVisible(true);
                            obs.setPosition((i * larguraFaixa) + Math.random() * (larguraFaixa - 32), -32);
                            obs.setDisplaySize(32, 32); // Padroniza tamanho do obstáculo
                            obs.body.setVelocityY(velocidade);
                        }
                    }
                }
            },
            loop: true
        });

        jogadores.forEach(jogador => {
            this.physics.add.overlap(jogador, obstaculosPool, () => {
                jogador.setActive(false).setVisible(false);
                this.add.particles(jogador.x, jogador.y).createEmitter({
                    speed: 100,
                    lifespan: 300,
                    blendMode: 'ADD',
                    scale: { start: 1, end: 0 },
                    on: false
                }).explode(10);
            });
        });

        this.time.addEvent({
            delay: 100,
            callback: () => {
                let vivos = jogadores.filter(j => j.active).length;
                if (vivos <= 1) {
                    let vencedor = jogadores.findIndex(j => j.active) + 1;
                    this.add.text(600, 400, `Vencedor: Jogador ${vencedor || 'Ninguém'}!`, { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
                    this.time.delayedCall(3000, () => this.scene.start('MenuScene'));
                }
            },
            loop: true
        });

        this.physics.world.setBounds(2, 0, 1196, 800);
        obstaculosPool.getChildren().forEach(obs => {
            obs.body.onWorldBounds = true;
            obs.body.world.on('worldbounds', () => obs.setActive(false).setVisible(false));
        });

        this.jogadores = jogadores; // Armazena para uso no update
    }
    update() {
        // Controles via teclado
        const velocidadeMovimento = 5; // Pixels por frame
        if (this.jogadores[0].active) {
            if (this.cursors.player1.left.isDown) {
                this.jogadores[0].x = Math.max(this.jogadores[0].faixaInicio + 16, this.jogadores[0].x - velocidadeMovimento);
            } else if (this.cursors.player1.right.isDown) {
                this.jogadores[0].x = Math.min(this.jogadores[0].faixaInicio + this.jogadores[0].larguraFaixa - 16, this.jogadores[0].x + velocidadeMovimento);
            }
        }
        if (this.jogadores.length > 1 && this.jogadores[1].active) {
            if (this.cursors.player2.left.isDown) {
                this.jogadores[1].x = Math.max(this.jogadores[1].faixaInicio + 16, this.jogadores[1].x - velocidadeMovimento);
            } else if (this.cursors.player2.right.isDown) {
                this.jogadores[1].x = Math.min(this.jogadores[1].faixaInicio + this.jogadores[1].larguraFaixa - 16, this.jogadores[1].x + velocidadeMovimento);
            }
        }
        if (this.jogadores.length > 2 && this.jogadores[2].active) {
            if (this.cursors.player3.left.isDown) {
                this.jogadores[2].x = Math.max(this.jogadores[2].faixaInicio + 16, this.jogadores[2].x - velocidadeMovimento);
            } else if (this.cursors.player3.right.isDown) {
                this.jogadores[2].x = Math.min(this.jogadores[2].faixaInicio + this.jogadores[2].larguraFaixa - 16, this.jogadores[2].x + velocidadeMovimento);
            }
        }

        this.children.getChildren().forEach(child => {
            if (child.body && !child.active && child.y > 800) {
                child.setActive(false).setVisible(false);
            }
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1200, // Aumentado
    height: 800, // Aumentado
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [MenuScene, GameScene]
};

let game = new Phaser.Game(config);