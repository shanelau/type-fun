export interface EnemyPlane {
  id: number;
  x: number;
  y: number;
  speed: number;
  letter: string;
  width: number;
  height: number;
}

// 上一次生成的字母，用于增加相同字母出现的概率
let lastGeneratedLetter = '';
let sameLetterCounter = 0;
const MAX_SAME_LETTER = 5; // 最多连续出现的相同字母数

export function createEnemy(id: number, containerWidth: number): EnemyPlane {
  // 80%的概率复用上次的字母，但最多连续出现MAX_SAME_LETTER次
  let letter: string;
  if (
    lastGeneratedLetter &&
    sameLetterCounter < MAX_SAME_LETTER &&
    Math.random() < 0.4
  ) {
    letter = lastGeneratedLetter;
    sameLetterCounter++;
  } else {
    // 生成A-Z的随机字母
    const randomCharCode = Math.floor(Math.random() * 26) + 65;
    letter = String.fromCharCode(randomCharCode);
    lastGeneratedLetter = letter;
    sameLetterCounter = 1;
  }

  // 随机生成敌机X坐标
  const x = Math.random() * (containerWidth - 50) + 25;

  return {
    id,
    x,
    y: -50, // 从屏幕上方出现
    speed: 1 + Math.random() * 1.5, // 随机速度
    letter,
    width: 40,
    height: 40,
  };
}

export function updateEnemy(enemy: EnemyPlane): EnemyPlane {
  return {
    ...enemy,
    y: enemy.y + enemy.speed,
  };
}
