// Space Invaders with Roguelike Elements (expandable)
class SpaceInvaders {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'start'; // 'start', 'playing', 'paused', 'gameOver', 'waveComplete'
        
        // Game stats
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.level = 1;
        
        // Player
        this.player = {
            x: this.canvas.width / 2 - 20,
            y: this.canvas.height - 60,
            width: 40,
            height: 30,
            speed: 6,
            color: '#00ff00',
            shootCooldown: 0,
            maxCooldown: 15
        };
        
        // Bullets
        this.playerBullets = [];
        this.enemyBullets = [];
        
        // Invaders
        this.invaders = [];
        this.invaderDirection = 1;
        this.invaderDropDistance = 20;
        
        // Particles for effects
        this.particles = [];
        
        // Input
        this.keys = {};
        
        // Roguelike elements (for future expansion)
        this.playerStats = {
            attack: 1,
            defense: 0,
            speed: 1,
            fireRate: 1
        };
        
        this.equipment = {
            weapon: 'basic_laser',
            shield: null,
            special: null
        };
        
        this.init();
    }
    
    init() {
        this.createInvaderWave();
        this.bindEvents();
        this.updateUI();
        this.gameLoop();
    }
    
    createInvaderWave() {
        this.invaders = [];
        const rows = 4 + Math.floor(this.wave / 3); // More rows as waves progress
        const cols = 8;
        const invaderWidth = 30;
        const invaderHeight = 20;
        const spacing = 15;
        
        const startX = (this.canvas.width - (cols * (invaderWidth + spacing))) / 2;
        const startY = 50;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Different invader types based on row
                let type = 'basic';
                let health = 1;
                let points = 10;
                let color = '#ff0080';
                
                if (row === 0) {
                    type = 'elite';
                    health = 2;
                    points = 50;
                    color = '#ffff00';
                } else if (row === 1) {
                    type = 'heavy';
                    health = 2;
                    points = 30;
                    color = '#ff4444';
                } else {
                    type = 'basic';
                    health = 1;
                    points = 10;
                    color = '#00ffff';
                }
                
                this.invaders.push({
                    x: startX + col * (invaderWidth + spacing),
                    y: startY + row * (invaderHeight + spacing),
                    width: invaderWidth,
                    height: invaderHeight,
                    type: type,
                    health: health,
                    maxHealth: health,
                    points: points,
                    color: color,
                    shootTimer: Math.random() * 120 + 60,
                    alive: true
                });
            }
        }
    }
    
    drawPlayer() {
        // Player ship with retro style
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Ship details
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(this.player.x + 15, this.player.y, 10, 5);
        this.ctx.fillRect(this.player.x + 5, this.player.y + 25, 30, 5);
        
        // Glow effect
        this.ctx.shadowColor = this.player.color;
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.shadowBlur = 0;
    }
    
    drawInvader(invader) {
        if (!invader.alive) return;
        
        // Health-based opacity
        const healthRatio = invader.health / invader.maxHealth;
        this.ctx.globalAlpha = 0.3 + 0.7 * healthRatio;
        
        // Draw invader body
        this.ctx.fillStyle = invader.color;
        this.ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
        
        // Draw invader details based on type
        this.ctx.fillStyle = '#ffffff';
        switch (invader.type) {
            case 'elite':
                // Elite invader pattern
                this.ctx.fillRect(invader.x + 5, invader.y + 5, 20, 3);
                this.ctx.fillRect(invader.x + 10, invader.y + 12, 10, 3);
                break;
            case 'heavy':
                // Heavy invader pattern
                this.ctx.fillRect(invader.x + 3, invader.y + 3, 24, 5);
                this.ctx.fillRect(invader.x + 8, invader.y + 12, 14, 5);
                break;
            default:
                // Basic invader pattern
                this.ctx.fillRect(invader.x + 8, invader.y + 5, 14, 3);
                this.ctx.fillRect(invader.x + 12, invader.y + 12, 6, 3);
        }
        
        // Health indicator for damaged invaders
        if (invader.health < invader.maxHealth) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(invader.x, invader.y - 5, invader.width * healthRatio, 2);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawBullet(bullet, color = '#00ff00') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        // Bullet glow
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 5;
        this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        this.ctx.shadowBlur = 0;
    }
    
    drawParticle(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        this.ctx.restore();
    }
    
    createExplosion(x, y, color = '#ffff00', count = 8) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 4 + 2,
                alpha: 1,
                color: color,
                life: 30
            });
        }
    }
    
    shoot() {
        if (this.player.shootCooldown <= 0) {
            this.playerBullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 10,
                speed: 8 * this.playerStats.fireRate,
                damage: this.playerStats.attack
            });
            this.player.shootCooldown = this.player.maxCooldown / this.playerStats.fireRate;
        }
    }
    
    invaderShoot(invader) {
        if (Math.random() < 0.02 / this.level) { // Shooting frequency increases with level
            this.enemyBullets.push({
                x: invader.x + invader.width / 2 - 2,
                y: invader.y + invader.height,
                width: 4,
                height: 8,
                speed: 3 + this.level * 0.5
            });
        }
    }
    
    updatePlayer() {
        // Movement
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed * this.playerStats.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed * this.playerStats.speed;
        }
        
        // Shooting
        if (this.keys[' ']) {
            this.shoot();
        }
        
        // Update cooldown
        if (this.player.shootCooldown > 0) {
            this.player.shootCooldown--;
        }
    }
    
    updateBullets() {
        // Update player bullets
        this.playerBullets.forEach((bullet, index) => {
            bullet.y -= bullet.speed;
            
            // Remove bullets that go off screen
            if (bullet.y < 0) {
                this.playerBullets.splice(index, 1);
            }
        });
        
        // Update enemy bullets
        this.enemyBullets.forEach((bullet, index) => {
            bullet.y += bullet.speed;
            
            // Remove bullets that go off screen
            if (bullet.y > this.canvas.height) {
                this.enemyBullets.splice(index, 1);
            }
        });
    }
    
    updateInvaders() {
        let moveDown = false;
        let leftMost = this.canvas.width;
        let rightMost = 0;
        
        // Find boundaries of alive invaders
        this.invaders.forEach(invader => {
            if (invader.alive) {
                leftMost = Math.min(leftMost, invader.x);
                rightMost = Math.max(rightMost, invader.x + invader.width);
                
                // Invader shooting
                this.invaderShoot(invader);
            }
        });
        
        // Check if invaders hit screen edges
        if (rightMost >= this.canvas.width || leftMost <= 0) {
            this.invaderDirection *= -1;
            moveDown = true;
        }
        
        // Move invaders
        this.invaders.forEach(invader => {
            if (invader.alive) {
                invader.x += this.invaderDirection * (2 + this.level * 0.5);
                if (moveDown) {
                    invader.y += this.invaderDropDistance;
                }
            }
        });
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha -= 1 / particle.life;
            particle.vy += 0.1; // gravity
            
            if (particle.alpha <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }
    
    checkCollisions() {
        // Player bullets vs invaders
        this.playerBullets.forEach((bullet, bulletIndex) => {
            this.invaders.forEach((invader, invaderIndex) => {
                if (invader.alive &&
                    bullet.x < invader.x + invader.width &&
                    bullet.x + bullet.width > invader.x &&
                    bullet.y < invader.y + invader.height &&
                    bullet.y + bullet.height > invader.y) {
                    
                    // Hit!
                    invader.health -= bullet.damage;
                    this.createExplosion(bullet.x, bullet.y, bullet.color || '#ffff00', 5);
                    this.playerBullets.splice(bulletIndex, 1);
                    
                    if (invader.health <= 0) {
                        invader.alive = false;
                        this.score += invader.points * this.level;
                        this.createExplosion(
                            invader.x + invader.width / 2,
                            invader.y + invader.height / 2,
                            invader.color,
                            12
                        );
                        
                        // Check if wave is complete
                        if (this.invaders.every(inv => !inv.alive)) {
                            this.completeWave();
                        }
                    }
                }
            });
        });
        
        // Enemy bullets vs player
        this.enemyBullets.forEach((bullet, index) => {
            if (bullet.x < this.player.x + this.player.width &&
                bullet.x + bullet.width > this.player.x &&
                bullet.y < this.player.y + this.player.height &&
                bullet.y + bullet.height > this.player.y) {
                
                // Player hit!
                this.lives--;
                this.createExplosion(bullet.x, bullet.y, '#ff0000', 8);
                this.enemyBullets.splice(index, 1);
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        });
        
        // Invaders reaching player level
        this.invaders.forEach(invader => {
            if (invader.alive && invader.y + invader.height >= this.player.y) {
                this.gameOver();
            }
        });
    }
    
    completeWave() {
        this.wave++;
        if (this.wave % 3 === 0) {
            this.level++;
        }
        
        this.gameState = 'waveComplete';
        document.getElementById('overlayTitle').textContent = 'ウェーブクリア！';
        document.getElementById('overlayMessage').textContent = `ウェーブ ${this.wave} に進みます`;
        document.getElementById('gameOverlay').classList.remove('hidden');
        
        setTimeout(() => {
            this.nextWave();
        }, 2000);
    }
    
    nextWave() {
        this.createInvaderWave();
        this.playerBullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.gameState = 'playing';
        document.getElementById('gameOverlay').classList.add('hidden');
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('overlayTitle').textContent = 'ゲームオーバー';
        document.getElementById('overlayMessage').textContent = `最終スコア: ${this.score}`;
        document.getElementById('startButton').style.display = 'none';
        document.getElementById('restartButton').style.display = 'inline-block';
        document.getElementById('gameOverlay').classList.remove('hidden');
    }
    
    restart() {
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.level = 1;
        this.player.x = this.canvas.width / 2 - 20;
        this.playerBullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.createInvaderWave();
        this.gameState = 'playing';
        document.getElementById('startButton').style.display = 'inline-block';
        document.getElementById('restartButton').style.display = 'none';
        document.getElementById('gameOverlay').classList.add('hidden');
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateBullets();
        this.updateInvaders();
        this.updateParticles();
        this.checkCollisions();
        this.updateUI();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars background
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.canvas.width;
            const y = (i * 73) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Draw game objects
        this.drawPlayer();
        
        this.invaders.forEach(invader => this.drawInvader(invader));
        
        this.playerBullets.forEach(bullet => this.drawBullet(bullet, '#00ff00'));
        this.enemyBullets.forEach(bullet => this.drawBullet(bullet, '#ff0080'));
        
        this.particles.forEach(particle => this.drawParticle(particle));
        
        // Draw UI elements on canvas
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px Courier New';
        this.ctx.fillText(`Cooldown: ${'■'.repeat(Math.max(0, this.player.shootCooldown))}`, 10, this.canvas.height - 10);
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('level').textContent = this.level;
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameState === 'start') {
                    this.gameState = 'playing';
                    document.getElementById('gameOverlay').classList.add('hidden');
                }
            }
            
            if (e.key === 'p' || e.key === 'P') {
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                    document.getElementById('overlayTitle').textContent = 'ポーズ';
                    document.getElementById('overlayMessage').textContent = 'Pキーで再開';
                    document.getElementById('gameOverlay').classList.remove('hidden');
                } else if (this.gameState === 'paused') {
                    this.gameState = 'playing';
                    document.getElementById('gameOverlay').classList.add('hidden');
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        document.getElementById('startButton').addEventListener('click', () => {
            this.gameState = 'playing';
            document.getElementById('gameOverlay').classList.add('hidden');
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restart();
        });
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new SpaceInvaders();
    console.log('👾 Space Invaders loaded! Ready for roguelike expansion!');
});