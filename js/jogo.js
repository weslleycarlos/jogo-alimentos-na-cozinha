// Configurações globais
const config = {
    type: Phaser.AUTO,
    width: 900,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#87CEEB', // Azul céu como fallback
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [MenuScene, GameScene]
};

let game = new Phaser.Game(config);

// Cena do Menu
class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }
    preload() {
        this.load.image('fundo-menu', 'assets/fundo-cozinha.jpg');
    }
    create() {
        // Fundo
        this.add.image(450, 300, 'fundo-menu').setScale(1.5);
        
        // Título com tween (animação suave)
        let titulo = this.add.text(450, 200, 'Jogo de Comidas na Cozinha', { fontSize: '48px', fill: '#ff4500' }).setOrigin(0.5);
        this.tweens.add({ targets: titulo, y: '+=20', duration: 1000, yoyo: true, repeat: -1 });
        
        // Botões para jogadores
        let btn2 = this.add.text(350, 350, '2 Jogadores', { fontSize: '32px', fill: '#32cd32', backgroundColor: '#fff' }).setInteractive().setPadding(20);
        let btn3 = this.add.text(550, 350, '3 Jogadores', { fontSize: '32px', fill: '#32cd32', backgroundColor: '#fff' }).setInteractive().setPadding(20);
        
        btn2.on('pointerdown', () => this.iniciarJogo(2));
        btn3.on('pointerdown', () => this.iniciarJogo(3));
        
        // Hover effect
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

// Cena do Jogo
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
        const velocidade = 150; // Pixels por segundo (lento para criança)
        let jogadores = [];
        let obstaculosPool = this.add.group(); // Pool para reutilizar obstáculos
        let timerObstaculos; // Para spawn

        // Fundo com parallax simples (move devagar)
        this.add.image(450, 300, 'fundo').setScrollFactor(0.5);

        // Divisórias
        for (let i = 1; i < numJogadores; i++) {
            let linha = this.add.line(0, 0, i * larguraFaixa, 0, i * larguraFaixa, 600, 0xffffff).setOrigin(0);
            linha.setStrokeStyle(2, 0xffffff);
        }

        // Inicializar jogadores (comidas)
        const spritesJog = ['maca', 'pizza', 'cupcake'];
        for (let i = 0; i < numJogadores; i++) {
            let jogador = this.physics.add.sprite((i * larguraFaixa) + (larguraFaixa / 2), 500, spritesJog[i]);
            jogador.setCollideWorldBounds(true); // Não sai da tela
            jogador.body.setSize(32, 32); // Hitbox
            jogador.larguraFaixa = larguraFaixa;
            jogador.faixaInicio = i * larguraFaixa;
            jogadores.push(jogador);
        }

        // Input: Clique para mover
        this.input.on('pointerdown', (pointer) => {
            let faixa = Math.floor(pointer.x / larguraFaixa);
            if (faixa < numJogadores && jogadores[faixa].active) {
                // Tween suave para posição do clique (dentro da faixa)
                let targetX = Phaser.Math.Clamp(pointer.x, jogadores[faixa].faixaInicio + 16, jogadores[faixa].faixaInicio + larguraFaixa - 16);
                this.tweens.add({
                    targets: jogadores[faixa],
                    x: targetX,
                    duration: 200, // Suave
                    ease: 'Power2'
                });
            }
        });

        // Spawn de obstáculos (com pool)
        timerObstaculos = this.time.addEvent({
            delay: 1500, // A cada 1.5s, chance de spawn
            callback: () => {
                if (Math.random() < 0.3) { // 30% chance por faixa
                    for (let i = 0; i < numJogadores; i++) {
                        if (jogadores[i].active) {
                            let obs = obstaculosPool.get((i * larguraFaixa) + Math.random() * (larguraFaixa - 32), -32);
                            if (!obs) {
                                const spritesObs = ['faca', 'garfo', 'colher'][Math.floor(Math.random() * 3)];
                                obs = this.physics.add.sprite(0, 0, spritesObs);
                                obs.setVelocityY(velocidade);
                                obstaculosPool.add(obs);
                            } else {
                                obs.setActive(true).setVisible(true);
                                obs.x = (i * larguraFaixa) + Math.random() * (larguraFaixa - 32);
                                obs.y = -32;
                                obs.setVelocityY(velocidade);
                            }
                        }
                    }
                }
            },
            loop: true
        });

        // Colisões: Física cuida
        jogadores.forEach(jogador => {
            this.physics.add.overlap(jogador, obstaculosPool, () => {
                jogador.setActive(false).setVisible(false); // "Morre"
                // Partícula de explosão (bonitinho!)
                this.add.particles(jogador.x, jogador.y).createEmitter({
                    speed: 100,
                    lifespan: 300,
                    blendMode: 'ADD',
                    scale: { start: 1, end: 0 },
                    on: false
                }).explode(10);
                // Para spawn na faixa
                timerObstaculos.paused = true; // Para todos por simplicidade; adapte se quiser
            });
        });

        // Checa vencedor a cada 100ms
        this.time.addEvent({
            delay: 100,
            callback: () => {
                let vivos = jogadores.filter(j => j.active).length;
                if (vivos <= 1) {
                    let vencedor = jogadores.findIndex(j => j.active) + 1;
                    this.add.text(450, 300, `Vencedor: Jogador ${vencedor}!`, { fontSize: '40px', fill: '#fff' }).setOrigin(0.5);
                    this.time.delayedCall(3000, () => this.scene.start('MenuScene'));
                }
            },
            loop: true
        });

        // Atualizar obstáculos (remove se sair da tela)
        this.physics.world.setBounds(0, 0, 900, 600);
        obstaculosPool.children.entries.forEach(obs => {
            obs.body.onWorldBounds = true;
            obs.body.world.on('worldbounds', () => obs.setActive(false).setVisible(false));
        });
    }
    update() {
        // Limpa pool inativo
        this.children.getChildren().forEach(child => {
            if (child.body && !child.active && child.y > 600) {
                child.setActive(false).setVisible(false);
            }
        });
    }
}