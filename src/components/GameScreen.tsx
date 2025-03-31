import React, { useEffect, useState, useCallback, useRef } from 'react';
import { EnemyPlane, createEnemy, updateEnemy } from '../game/EnemyPlane';
import shootAudio from '../assets/sounds/shoot.mp3';
import explosionAudio from '../assets/sounds/explosion.mp3';
import {
  Bullet,
  createBullet,
  updateBullet,
  checkBulletCollision,
} from '../game/Bullet';

// 为子弹添加目标敌机ID的属性
interface EnhancedBullet extends Bullet {
  targetEnemyId: number;
}

interface GameScreenProps {
  onGameOver: (score: number) => void;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  timeLeft: number;
  frame: number; // 添加动画帧
}

const DEFAULT_AVAILABLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const GameScreen: React.FC<GameScreenProps> = ({ onGameOver }) => {
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0); // 改为计时器，记录游戏已进行时间
  const [shotDown, setShotDown] = useState(0);
  const [missed, setMissed] = useState(0);
  const [enemies, setEnemies] = useState<EnemyPlane[]>([]);
  const [bullets, setBullets] = useState<EnhancedBullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [gameActive, setGameActive] = useState(false); // 修改默认值为false，表示游戏未开始
  const [gameStarted, setGameStarted] = useState(false); // 新增：控制游戏是否已经开始
  const [isPaused, setIsPaused] = useState(false);
  const [backgroundPosition, setBackgroundPosition] = useState(0); // 添加背景位置状态
  const [middleLayerPosition, setMiddleLayerPosition] = useState(0);
  const [frontLayerPosition, setFrontLayerPosition] = useState(0);
  const [availableChars, setAvailableChars] = useState<string>(
    DEFAULT_AVAILABLE_CHARS
  );
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [showCharSelector, setShowCharSelector] = useState(false); // 添加控制字符选择弹窗显示的状态

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const nextEnemyIdRef = useRef(0);
  const nextBulletIdRef = useRef(0);
  const nextExplosionIdRef = useRef(0);
  const shootSoundRef = useRef<HTMLAudioElement | null>(null);
  const explosionSoundRef = useRef<HTMLAudioElement | null>(null);

  // 初始化音效
  useEffect(() => {
    shootSoundRef.current = new Audio(shootAudio);
    explosionSoundRef.current = new Audio(explosionAudio);
    return () => {
      if (shootSoundRef.current) shootSoundRef.current = null;
      if (explosionSoundRef.current) shootSoundRef.current = null;
    };
  }, []);

  // 游戏计时（从0开始计时）- 仅当游戏已开始且处于活动状态时才计时
  useEffect(() => {
    if (!gameActive || isPaused || !gameStarted) return;

    const timer = setInterval(() => {
      setTime((prevTime) => prevTime + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, isPaused, gameStarted]);

  // 检查游戏失败条件 - 错过60架敌机
  useEffect(() => {
    const maxMissed = 60; // 最大允许错过的敌机数

    if (missed >= maxMissed && gameActive) {
      setGameActive(false);
      onGameOver(score);
    }
  }, [missed, gameActive, onGameOver, score]);

  // 生成敌机 - 仅当游戏已开始且处于活动状态时才生成敌机
  useEffect(() => {
    if (!gameActive || isPaused || !gameStarted) return;

    const containerWidth = gameContainerRef.current?.clientWidth || 800;

    const enemyInterval = setInterval(() => {
      setEnemies((prevEnemies) => [
        ...prevEnemies,
        createEnemyWithChar(
          nextEnemyIdRef.current,
          containerWidth,
          availableChars
        ),
      ]);
      nextEnemyIdRef.current++;
    }, 2000);

    return () => clearInterval(enemyInterval);
  }, [gameActive, isPaused, gameStarted, availableChars]);

  // 更新游戏状态 - 仅当游戏已开始且处于活动状态时才更新
  useEffect(() => {
    if (!gameActive || isPaused || !gameStarted) return;

    const containerHeight = gameContainerRef.current?.clientHeight || 600;

    const gameLoop = setInterval(() => {
      // 更新敌机位置
      setEnemies((prevEnemies) => {
        const updatedEnemies = prevEnemies.map(updateEnemy);

        // 检查是否有敌机飞出屏幕
        const missedEnemies = updatedEnemies.filter(
          (enemy) => enemy.y > containerHeight
        );
        if (missedEnemies.length > 0) {
          setMissed((prev) => {
            const newMissed = prev + missedEnemies.length;
            return newMissed;
          });
        }

        return updatedEnemies.filter((enemy) => enemy.y <= containerHeight);
      });

      // 更新子弹位置 - 添加追踪逻辑
      //@ts-ignore
      setBullets((prevBullets) => {
        return prevBullets
          .map((bullet) => {
            // 查找目标敌机的当前位置
            const targetEnemy = enemies.find(
              (enemy) => enemy.id === bullet.targetEnemyId
            );

            if (targetEnemy) {
              // 计算子弹到敌机的方向向量
              const dx = targetEnemy.x - bullet.x;
              const dy = targetEnemy.y - bullet.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // 子弹速度 (可以调整此值以改变追踪灵敏度)
              const bulletSpeed = 10;

              // 如果敌机和子弹很近就直线前进，否则调整方向
              if (distance < 50) {
                return updateBullet(bullet);
              } else {
                // 标准化方向向量并乘以速度
                const vx = (dx / distance) * bulletSpeed;
                const vy = (dy / distance) * bulletSpeed;

                // 更新子弹位置，使其朝向目标敌机
                return {
                  ...bullet,
                  x: bullet.x + vx,
                  y: bullet.y + vy,
                };
              }
            } else {
              // 如果目标敌机不存在，继续原来的轨迹
              return updateBullet(bullet);
            }
          })
          .filter((bullet) => bullet.y > 0 && bullet.y < containerHeight);
      });

      // 检查碰撞
      setBullets((prevBullets) => {
        let hitCount = 0; // 跟踪单次循环中击中的敌机数量

        setEnemies((prevEnemies) => {
          const remainingEnemies = [...prevEnemies];
          const remainingBullets = [...prevBullets];
          const newExplosions: Explosion[] = [];

          // 检查每颗子弹与每架敌机的碰撞
          for (let i = remainingBullets.length - 1; i >= 0; i--) {
            const bullet = remainingBullets[i];
            for (let j = remainingEnemies.length - 1; j >= 0; j--) {
              const enemy = remainingEnemies[j];

              // 使用目标字母匹配和物理碰撞共同检测
              if (
                bullet.targetLetter === enemy.letter &&
                checkBulletCollision(bullet, enemy)
              ) {
                // 创建爆炸效果
                newExplosions.push({
                  id: nextExplosionIdRef.current++,
                  x: enemy.x,
                  y: enemy.y,
                  timeLeft: 20, // 增加时间以便完成爆炸动画
                  frame: 0, // 初始化帧
                });

                // 播放爆炸音效
                if (explosionSoundRef.current) {
                  explosionSoundRef.current.currentTime = 0;
                  explosionSoundRef.current.play();
                }

                // 增加击中计数
                hitCount++;

                // 移除敌机和子弹
                remainingEnemies.splice(j, 1);
                remainingBullets.splice(i, 1);
                break;
              }
            }
          }

          // 添加新的爆炸
          if (newExplosions.length > 0) {
            setExplosions((prev) => [...prev, ...newExplosions]);
          }
          // 使用函数式更新，确保获取到最新的状态
          if (hitCount > 0) {
            // 更新分数 - 使用函数式更新而不是直接使用变量
            setScore((prevScore) => prevScore + hitCount * 10);
            // 更新击落计数
            setShotDown((prev) => prev + hitCount);
          }

          return remainingEnemies;
        });
        
        
        return prevBullets;
      });

      // 更新爆炸效果，每两帧递增一次爆炸动画帧
      setExplosions((prev) =>
        prev
          .map((exp) => ({
            ...exp,
            timeLeft: exp.timeLeft - 1,
            frame:
              exp.timeLeft % 2 === 0 ? Math.min(exp.frame + 1, 5) : exp.frame, // 每2帧换一次爆炸动画
          }))
          .filter((exp) => exp.timeLeft > 0)
      );
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameActive, isPaused, gameStarted, enemies]); // 移除 score 和 shotDown 依赖，避免循环依赖

  // 增强的背景滚动效果 - 即使游戏未开始也可以滚动背景
  useEffect(() => {
    if (isPaused || !gameStarted) return;

    const backgroundScroll = setInterval(() => {
      // 远景背景 - 滚动较慢
      setBackgroundPosition((prev) => (prev + 0.5) % 1080);

      // 中景星云 - 中等速度
      setMiddleLayerPosition((prev) => (prev + 1) % 1080);

      // 近景星星 - 滚动较快
      setFrontLayerPosition((prev) => (prev + 2) % 1080);
    }, 33);

    return () => clearInterval(backgroundScroll);
  }, [isPaused, gameStarted]);

  // 处理键盘输入
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // 如果游戏尚未开始，按空格键开始游戏
      if (!gameStarted && event.key === ' ') {
        startGame();
        return;
      }

      // 如果游戏已开始但处于暂停状态，按空格键继续游戏
      if (gameStarted && event.key === ' ') {
        setIsPaused((prev) => !prev);
        return;
      }

      if (!gameActive || isPaused || !gameStarted) return;

      const key = event.key.toUpperCase();
      // 检查是否为字母
      if (/^[A-Z0-9]$/.test(key)) {
        // 找到所有匹配字母的敌机
        const targetEnemies = enemies.filter((enemy) => enemy.letter === key);

        if (targetEnemies.length > 0) {
          const containerWidth = gameContainerRef.current?.clientWidth || 800;
          const containerHeight = gameContainerRef.current?.clientHeight || 600;
          const bulletX = containerWidth / 2;

          // 修改bulletY位置：计算玩家飞机的顶部位置
          // 飞机位于底部20px处，高度为120px，所以顶部位置是容器高度-底部距离-飞机高度
          const bulletY = containerHeight - 20 - 120;

          // 为每个目标敌机发射一颗子弹，并存储敌机ID用于追踪
          const newBullets = targetEnemies.map((targetEnemy) => {
            const basicBullet = createBullet(
              nextBulletIdRef.current++,
              bulletX,
              bulletY,
              key,
              targetEnemy.x,
              targetEnemy.y
            );

            // 增强子弹对象，添加目标敌机ID
            return {
              ...basicBullet,
              targetEnemyId: targetEnemy.id,
            };
          });

          setBullets((prev) => [...prev, ...newBullets]);

          // 播放射击音效 - 无论有几个目标只播放一次
          if (shootSoundRef.current) {
            shootSoundRef.current.currentTime = 0;
            shootSoundRef.current.play();
          }
        }
      }
    },
    [enemies, gameActive, isPaused, gameStarted]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // 重置游戏状态
  const resetGame = () => {
    setScore(0);
    setTime(0);
    setShotDown(0);
    setMissed(0);
    setEnemies([]);
    setBullets([]);
    setExplosions([]);
  };

  // 开始游戏
  const startGame = () => {
    // 如果没有选择任何字符，使用默认字符
    if (selectedChars.length === 0) {
      console.log('使用默认字符集');
      setAvailableChars(DEFAULT_AVAILABLE_CHARS);
    } else {
      console.log('使用选定字符集:', selectedChars.join(''));
      setAvailableChars(selectedChars.join(''));
    }
    setGameStarted(true);
    setGameActive(true);
    resetGame();
  };

  // 创建使用特定字符集的敌机
  const createEnemyWithChar = (
    id: number,
    containerWidth: number,
    chars: string
  ) => {
    const enemy = createEnemy(id, containerWidth);
    // 从可用字符中随机选择一个
    const randomIndex = Math.floor(Math.random() * chars.length);
    return {
      ...enemy,
      letter: chars[randomIndex],
    };
  };

  // 处理字符选择
  const handleCharSelect = (char: string) => {
    console.log('选择字符:', char); // 添加日志，帮助调试
    setSelectedChars((prev) => {
      const newSelection = prev.includes(char)
        ? prev.filter((c) => c !== char)
        : [...prev, char];
      console.log('更新后的选择:', newSelection); // 添加日志，显示更新后的状态
      return newSelection;
    });
  };

  // 字符选择组件 - 重新设计为全屏弹窗
  const CharacterSelector = () => {
    // 按键盘布局排列字符
    const keyboardRows = [
      '1234567890'.split(''),
      'QWERTYUIOP'.split(''),
      'ASDFGHJKL'.split(''),
      'ZXCVBNM'.split(''),
    ];

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          zIndex: 200,
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '40px',
            textShadow: '0 0 15px rgba(0, 255, 255, 0.8)',
          }}
        >
          选择要练习的字符
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          {keyboardRows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              style={{
                display: 'flex',
                gap: '15px',
                // 模拟键盘每行的缩进
                marginLeft:
                  rowIndex === 1
                    ? '30px'
                    : rowIndex === 2
                    ? '45px'
                    : rowIndex === 3
                    ? '60px'
                    : '0px',
              }}
            >
              {row.map((char) => {
                const isSelected = selectedChars.includes(char);
                return (
                  <div
                    key={char}
                    onClick={(e) => {
                      console.log(char);
                      e.preventDefault(); // 阻止默认事件
                      handleCharSelect(char);
                    }}
                    style={{
                      width: '70px',
                      height: '70px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? '#00ffff'
                        : 'rgba(255, 255, 255, 0.2)',
                      color: isSelected ? 'black' : 'white',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      userSelect: 'none',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      border: isSelected ? '3px solid white' : 'none',
                      boxShadow: isSelected ? '0 0 20px #00ffff' : 'none',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '50px', display: 'flex', gap: '25px' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              setSelectedChars([]);
            }}
            style={{
              padding: '15px 25px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '22px',
            }}
          >
            清除选择
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setSelectedChars([...'FJ'.split('')]);
            }}
            style={{
              padding: '15px 25px',
              backgroundColor: 'rgba(0, 255, 255, 0.4)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '22px',
            }}
          >
            仅F和J (示例)
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedChars([...'ASDF'.split('')]);
            }}
            style={{
              padding: '15px 25px',
              backgroundColor: 'rgba(0, 255, 255, 0.4)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '22px',
            }}
          >
            左手 (ASDF)
          </button>
        </div>

        {/* 添加可视化的选择反馈 */}
        <div
          style={{
            marginTop: '15px',
            color: 'white',
            fontSize: '18px',
            padding: '10px',
            backgroundColor: 'rgba(0, 255, 255, 0.1)',
            borderRadius: '5px',
            maxWidth: '80%',
            minHeight: '30px',
            textAlign: 'center',
          }}
        >
          已选择:{' '}
          {selectedChars.length > 0
            ? selectedChars.join(', ')
            : '无 (将使用全部字符)'}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCharSelector(false);
          }}
          style={{
            marginTop: '40px',
            padding: '15px 40px',
            backgroundColor: '#00ffff',
            color: 'black',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '26px',
            fontWeight: 'bold',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.7)',
          }}
        >
          确认选择
        </button>
      </div>
    );
  };

  return (
    <div
      className='game-screen'
      ref={gameContainerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        width: '100%',
      }}
    >
      {/* 远景背景层 */}
      <div
        className='far-background'
        style={{
          backgroundPosition: `center ${backgroundPosition}px`,
        }}
      />

      {/* 中景星云层 */}
      <div
        className='nebula-layer'
        style={{
          backgroundPosition: `center ${middleLayerPosition}px`,
        }}
      />

      {/* 近景星星层 */}
      <div
        className='stars-layer'
        style={{
          backgroundPosition: `center ${frontLayerPosition}px`,
        }}
      />

      {/* 行星装饰层 - 固定位置 */}
      <div className='planet' />

      {/* 移除内联样式的glow动画定义，已移到CSS */}

      {/* 字符选择弹窗 - 在所有其他UI层之上显示 */}
      {showCharSelector && <CharacterSelector />}

      {/* 游戏开始界面 */}
      {!gameStarted && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            zIndex: 100,
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: '48px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '30px',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
            }}
          >
            打字飞行员
          </div>
          <div
            style={{
              color: 'white',
              fontSize: '24px',
              textAlign: 'center',
              maxWidth: '600px',
              margin: '0 auto 40px',
              lineHeight: '1.5',
            }}
          >
            按键盘字母击落带有相应字母的敌机。不要让超过60架敌机飞过你的防线！
          </div>

          {/* 替换原来的字符选择器为按钮 */}
          <button
            onClick={() => setShowCharSelector(true)}
            style={{
              padding: '12px 25px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              border: '2px solid rgba(0, 255, 255, 0.6)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '22px',
              marginBottom: '30px',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.5)')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.3)')
            }
          >
            选择练习字符
            {selectedChars.length > 0 ? ` (已选${selectedChars.length}个)` : ''}
          </button>

          <div
            onClick={startGame}
            style={{
              color: '#00ffff',
              fontSize: '32px',
              fontWeight: 'bold',
              padding: '15px 30px',
              border: '2px solid #00ffff',
              borderRadius: '10px',
              animation: 'pulse 1.5s infinite alternate',
              cursor: 'pointer',
              userSelect: 'none',
              marginTop: '10px',
            }}
          >
            按空格键开始游戏
          </div>
          <p>Press Space to Start</p>
        </div>
      )}

      {/* 游戏界面元素 - 仅在游戏开始后显示 */}
      {gameStarted && (
        <>
          <div
            className='score-board'
            style={{ position: 'relative', zIndex: 5 }}
          >
            <div className='game-stats'>分数: {score}</div>
            <div className='game-stats'>
              游戏时间: {Math.floor(time / 60)}:
              {(time % 60).toString().padStart(2, '0')}
            </div>
            <div className='game-stats'>击落: {shotDown}</div>
            <div className='game-stats'>错过: {missed}/60</div>
          </div>

          {/* 玩家飞机 */}
          <div className='player-plane'></div>

          {/* 敌机 */}
          {enemies.map((enemy) => (
            <div
              key={enemy.id}
              className='enemy-plane'
              style={{
                left: `${enemy.x}px`,
                top: `${enemy.y}px`,
              }}
            >
              <div
                className='enemy-letter'
                style={{
                  color: 'white',
                  fontSize: '34px',
                  fontWeight: 'bold',
                  position: 'absolute',
                  left: '35%',
                  top: '30%',
                  transform: 'translateX(-50%),rotate(180deg)',
                  textShadow: '0 0 4px #000',
                  padding: '0px 6px',
                  borderRadius: '100px',
                }}
              >
                {enemy.letter}
              </div>
            </div>
          ))}

          {/* 子弹 - 保留动态旋转样式 */}
          {bullets.map((bullet) => (
            <div
              key={bullet.id}
              className='bullet'
              style={{
                left: `${bullet.x}px`,
                top: `${bullet.y}px`,
                transform: `translateX(-50%) rotate(${
                  Math.atan2(
                    bullet.y -
                      (enemies.find((e) => e.id === bullet.targetEnemyId)?.y ||
                        0),
                    bullet.x -
                      (enemies.find((e) => e.id === bullet.targetEnemyId)?.x ||
                        0)
                  ) *
                    (180 / Math.PI) +
                  90
                }deg)`,
              }}
            ></div>
          ))}

          {/* 爆炸效果 */}
          {explosions.map((explosion) => (
            <div
              key={explosion.id}
              className='explosion'
              style={{
                left: `${explosion.x}px`,
                top: `${explosion.y}px`,
                backgroundPosition: `${-80 * explosion.frame}px 0px`,
              }}
            ></div>
          ))}
        </>
      )}

      {/* 暂停界面 */}
      {gameStarted && isPaused && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            <div>游戏已暂停</div>
            <div style={{ fontSize: '24px', marginTop: '20px' }}>
              按空格键继续
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
