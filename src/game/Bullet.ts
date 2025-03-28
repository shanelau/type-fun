export interface Bullet {
  id: number;
  x: number;
  y: number;
  targetX: number; // 目标X坐标
  targetY: number; // 目标Y坐标
  speed: number;
  targetLetter: string;
  dx: number; // X方向的速度分量
  dy: number; // Y方向的速度分量
}

export function createBullet(
  id: number,
  x: number,
  y: number,
  targetLetter: string,
  targetX: number,
  targetY: number
): Bullet {
  // 计算方向向量
  const dx = targetX - x;
  const dy = targetY - y;

  // 归一化方向向量
  const length = Math.sqrt(dx * dx + dy * dy);
  const normalizedDx = dx / length;
  const normalizedDy = dy / length;

  // 设置子弹速度
  const speed = 8;

  return {
    id,
    x,
    y,
    targetX,
    targetY,
    targetLetter,
    speed,
    dx: normalizedDx * speed,
    dy: normalizedDy * speed,
  };
}

export function updateBullet(bullet: Bullet): Bullet {
  // 使用方向向量更新子弹位置
  return {
    ...bullet,
    x: bullet.x + bullet.dx,
    y: bullet.y + bullet.dy,
  };
}

export function checkBulletCollision(
  bullet: Bullet,
  enemy: { x: number; y: number; width?: number; height?: number }
): boolean {
  const enemyWidth = enemy.width || 40; // 默认敌机宽度
  const enemyHeight = enemy.height || 40; // 默认敌机高度
  const bulletSize = 5; // 子弹大小

  // 简单的矩形碰撞检测
  return (
    bullet.x + bulletSize >= enemy.x - enemyWidth / 2 &&
    bullet.x - bulletSize <= enemy.x + enemyWidth / 2 &&
    bullet.y + bulletSize >= enemy.y - enemyHeight / 2 &&
    bullet.y - bulletSize <= enemy.y + enemyHeight / 2
  );
}
