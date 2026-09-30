// Canvas lógico
export const W = 800;
export const H = 600;

// Asteroides, indexados por tamaño 1, 2, 3 (el índice 0 no se usa)
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32]; // velocidad base
export const POINTS = [0, 100, 50, 20];

// Power-up de disparo triple
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;

// Balas
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;

// Nave
export const SHIP_ROT = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987;
export const SHIP_NOSE = 21;
export const SHIP_INVINCIBLE = 3; // s al reaparecer
export const SHOOT_COOLDOWN = 0.2; // s
