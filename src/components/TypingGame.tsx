import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Dog, Volume2, VolumeX, Settings } from 'lucide-react';
import KeyboardHands from './KeyboardHands';
import GameHeader from './game/GameHeader';
import GameScreen from './game/GameScreen';
import { GameSettings, ScorePopup, CurrentWord, Particle } from '../types/game';
import {
  stageBackgrounds,
  stageSets,
  romajiMap,
} from '../constants/gameConstants';

interface Props {
  settings: GameSettings;
  onAdminRequest: () => void;
}

const TypingGame: React.FC<Props> = ({ settings, onAdminRequest }) => {
  const [stage, setStage] = useState(settings.selectedStages[0]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState('start');
  const [speedMultiplier, setSpeedMultiplier] = useState(settings.speed);
  const [currentWord, setCurrentWord] = useState<CurrentWord | null>(null);
  const [input, setInput] = useState('');
  const [life, setLife] = useState(10);
  const [questionCount, setQuestionCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [totalStagesCompleted, setTotalStagesCompleted] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [scoreAnimation, setScoreAnimation] = useState(false);
  const [shakeAnimation, setShakeAnimation] = useState(false);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<string[]>([]);
  const [lastCharacter, setLastCharacter] = useState<string>('');
  const [showSuccessEffect, setShowSuccessEffect] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentBackground, setCurrentBackground] = useState<string>('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const finalScoreRef = useRef<number>(0);
  const previousHighScoreRef = useRef<number>(0);
  const currentStageIndexRef = useRef(0);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef(gameState);

  const getTimeoutDuration = (speed: number) => {
    switch (speed) {
      case 5: return 2000;
      case 4: return 4000;
      case 3: return 6000;
      case 2: return 8000;
      case 1: return 10000;
      default: return 6000;
    }
  };

  const QUESTION_TIMEOUT = getTimeoutDuration(speedMultiplier);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const chars = settings.selectedStages.flatMap(
      (stageNum) => stageSets[stageNum as keyof typeof stageSets]
    );
    setAvailableCharacters(chars);
  }, [settings.selectedStages]);

  useEffect(() => {
    setSpeedMultiplier(settings.speed);
    setStage(settings.selectedStages[0]);
    currentStageIndexRef.current = 0;
    if (settings.isRandomMode) {
      const backgrounds = Object.values(stageBackgrounds);
      setCurrentBackground(
        backgrounds[Math.floor(Math.random() * backgrounds.length)]
      );
    }
  }, [settings]);

  const getRandomBackground = useCallback(() => {
    const backgrounds = Object.values(stageBackgrounds);
    return backgrounds[Math.floor(Math.random() * backgrounds.length)];
  }, []);

  const playSound = useCallback(
    (freq: number, type: OscillatorType, dur: number, vol = 0.3) => {
      if (isMuted || !audioContextRef.current) return;
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioContextRef.current.currentTime + dur
        );
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + dur);
      } catch (e) {
        console.error(e);
      }
    },
    [isMuted]
  );

  const playTypeSound = useCallback(
    () => playSound(800, 'square', 0.05, 0.1),
    [playSound]
  );
  const playCorrectSound = useCallback(() => {
    playSound(880, 'sine', 0.1, 0.2);
    playSound(1760, 'sine', 0.15, 0.1);
  }, [playSound]);
  const playMissSound = useCallback(
    () => playSound(220, 'square', 0.15, 0.2),
    [playSound]
  );
  const playStageClearSound = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((note, i) => {
      setTimeout(() => playSound(note, 'sine', 0.5, 0.2), i * 200);
    });
  }, [playSound]);
  const playGameClearSound = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((note, i) => {
      setTimeout(() => {
        playSound(note, 'sine', 0.8, 0.15);
        if (i % 2 === 0) playSound(note / 2, 'triangle', 0.8, 0.1);
      }, i * 300);
    });
  }, [playSound]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'start') {
        if (e.key === 'v') {
          onAdminRequest();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onAdminRequest]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem('typingGameHighScore');
    if (savedHighScore) {
      const parsedHighScore = parseInt(savedHighScore, 10);
      setHighScore(parsedHighScore);
      previousHighScoreRef.current = parsedHighScore;
    }
  }, []);

  const updateHighScore = useCallback((finalScore: number) => {
    finalScoreRef.current = finalScore;
    if (finalScore > previousHighScoreRef.current) {
      return true;
    }
    return false;
  }, []);

  const saveNewHighScore = useCallback(() => {
    if (finalScoreRef.current > previousHighScoreRef.current) {
      localStorage.setItem(
        'typingGameHighScore',
        finalScoreRef.current.toString()
      );
      previousHighScoreRef.current = finalScoreRef.current;
      setHighScore(finalScoreRef.current);
    }
  }, []);

  const initAudio = useCallback(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          setGameState('playing');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const resetGame = useCallback(() => {
    initAudio();
    saveNewHighScore();
    setScore(0);
    setStage(settings.selectedStages[0]);
    currentStageIndexRef.current = 0;
    setLife(10);
    setQuestionCount(0);
    setInput('');
    setGameState('countdown');
    setTotalStagesCompleted(0);
    setCurrentWord(null);
    setScorePopups([]);
    finalScoreRef.current = 0;
    setLastCharacter('');
    startCountdown();
  }, [initAudio, saveNewHighScore, settings.selectedStages, startCountdown]);

  const convertToRomaji = useCallback((word: string) => {
    if (!word) return [];
    return romajiMap[word as keyof typeof romajiMap] || [word];
  }, []);

  const calculateScore = useCallback(
    (elapsedTime: number) => {
      const maxScore = 8;
      const minScore = 1;
      const maxTime = QUESTION_TIMEOUT;

      return Math.max(
        minScore,
        Math.ceil(maxScore * (1 - elapsedTime / maxTime) * (1 + speedMultiplier * 0.2))
      );
    },
    [speedMultiplier]
  );

  const createParticles = useCallback((x: number, y: number) => {
    const newParticles = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      x,
      y,
      color: ['#60A5FA', '#34D399', '#FBBF24'][Math.floor(Math.random() * 3)],
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.find((np) => np.id === p.id))
      );
    }, 1000);
  }, []);

  const createScorePopup = useCallback(
    (score: number, x: number, y: number) => {
      const newPopup = {
        id: Date.now(),
        score,
        x,
        y,
      };
      setScorePopups((prev) => [...prev, newPopup]);
      setTimeout(() => {
        setScorePopups((prev) =>
          prev.filter((popup) => popup.id !== newPopup.id)
        );
      }, 1000);
    },
    []
  );

  const saveHighScoreToStorage = useCallback((score: number) => {
    if (score >= previousHighScoreRef.current) {
      localStorage.setItem('typingGameHighScore', score.toString());
    }
  }, []);

  const gameOver = useCallback(() => {
    setGameState('gameover');
    setCurrentWord(null);
    updateHighScore(score);
    saveHighScoreToStorage(score);
    playGameClearSound();
  }, [playGameClearSound, score, updateHighScore, saveHighScoreToStorage]);

  const checkStageClear = useCallback(() => {
    if (questionCount >= 19) {
      currentStageIndexRef.current++;

      const shouldEndGame = settings.isRandomMode
        ? totalStagesCompleted + 1 >= settings.numStages
        : currentStageIndexRef.current >= settings.selectedStages.length;

      if (shouldEndGame) {
        setGameState('clear');
        updateHighScore(score);
        saveHighScoreToStorage(score);
        playGameClearSound();
      } else {
        setGameState('stageClear');
        playStageClearSound();
      }
      return true;
    }
    return false;
  }, [
    questionCount,
    totalStagesCompleted,
    settings.isRandomMode,
    settings.numStages,
    settings.selectedStages.length,
    playGameClearSound,
    playStageClearSound,
    score,
    updateHighScore,
    saveHighScoreToStorage,
  ]);

  const nextStage = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (settings.isRandomMode) {
        setCurrentBackground(getRandomBackground());
        setStage(
          settings.selectedStages[
            Math.floor(Math.random() * settings.selectedStages.length)
          ]
        );
      } else {
        setStage(settings.selectedStages[currentStageIndexRef.current]);
      }
      setQuestionCount(0);
      setInput('');
      setGameState('countdown');
      setCurrentWord(null);
      setIsTransitioning(false);
      setTotalStagesCompleted((prev) => prev + 1);
      setLastCharacter('');
      startCountdown();
    }, 500);
  }, [
    settings.selectedStages,
    settings.isRandomMode,
    getRandomBackground,
    startCountdown,
  ]);

  const createNewWord = useCallback(() => {
    let text;
    const currentSet = stageSets[stage as keyof typeof stageSets];

    if (stage === 1) {
      text = Math.random() < 0.5 ? 'F' : 'J';
    } else {
      if (questionCount > 0 && questionCount % 4 === 3) {
        text = Math.random() < 0.5 ? 'F' : 'J';
      } else {
        if (settings.isRandomMode) {
          let availableChars = availableCharacters.filter(
            (char) => char !== 'F' && char !== 'J' && char !== lastCharacter
          );
          if (availableChars.length === 0) {
            availableChars = availableCharacters.filter(
              (char) => char !== 'F' && char !== 'J'
            );
          }
          text =
            availableChars[Math.floor(Math.random() * availableChars.length)];
        } else {
          let availableChars = currentSet.filter(
            (char) => char !== 'F' && char !== 'J' && char !== lastCharacter
          );
          if (availableChars.length === 0) {
            availableChars = currentSet.filter(
              (char) => char !== 'F' && char !== 'J'
            );
          }
          text =
            availableChars[Math.floor(Math.random() * availableChars.length)];
        }
      }
    }

    setLastCharacter(text);
    setQuestionStartTime(Date.now());

    // Start question timer
    if (questionTimerRef.current) {
      clearTimeout(questionTimerRef.current);
    }
    
    questionTimerRef.current = setTimeout(() => {
      if (gameStateRef.current === 'playing') {
        setInput('');
        setShakeAnimation(true);
        setTimeout(() => setShakeAnimation(false), 500);
        setLife(prev => {
          const newLife = prev - 1;
          if (newLife <= 0) {
            gameOver();
          }
          return newLife;
        });
        setCurrentWord(createNewWord());
        playMissSound();
      }
    }, QUESTION_TIMEOUT);

    return {
      id: Date.now(),
      text,
      x: 50, // Center horizontally
      y: 50, // Center vertically
      speed: 0, // No movement needed
      startTime: Date.now(),
    };
  }, [
    stage,
    questionCount,
    settings.isRandomMode,
    availableCharacters,
    lastCharacter,
    playMissSound,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing' || !currentWord) return;
      if (showSuccessEffect) return; // アニメーション中は入力を受け付けない

      if (e.isComposing) return;

      const key = e.key.toUpperCase();
      if (!/^[A-Z0-9\-.,]$/.test(key)) return;

      const correctRomaji = convertToRomaji(currentWord.text);
      const newInput = (input + key).toUpperCase();

      const isPartiallyCorrect = correctRomaji.some((romaji) =>
        romaji.startsWith(newInput)
      );

      if (!isPartiallyCorrect) {
        playMissSound();
        setInput('');
        setLife(prev => {
          const newLife = prev - 1;
          if (newLife <= 0) {
            gameOver();
          }
          return newLife;
        });
        setShakeAnimation(true);
        setTimeout(() => setShakeAnimation(false), 500);
        return;
      }

      setInput(newInput);
      playTypeSound();

      if (correctRomaji.includes(newInput)) {
        const elapsedTime = Date.now() - questionStartTime;
        const pointsEarned = calculateScore(elapsedTime);
        setScore((prev) => prev + pointsEarned);
        setInput('');
        setQuestionCount((prev) => prev + 1);
        playCorrectSound();

        if (currentWord) {
          createParticles(currentWord.x, currentWord.y);
          createScorePopup(pointsEarned, currentWord.x, currentWord.y);
          const currentWordCopy = currentWord; // 現在の単語を保存
          setShowSuccessEffect(true);
          
          // アニメーション完了後に次の問題を表示
          setTimeout(() => {
            setShowSuccessEffect(false);
            if (!checkStageClear()) {
              if (questionTimerRef.current) {
                clearTimeout(questionTimerRef.current);
              }
              setCurrentWord(createNewWord());
            }
          }, 600);
        }

        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 300);
      }
    },
    [
      currentWord,
      input,
      convertToRomaji,
      playMissSound,
      playTypeSound,
      questionStartTime,
      calculateScore,
      playCorrectSound,
      createParticles,
      createScorePopup,
      checkStageClear,
      createNewWord,
    ]
  );

  useEffect(() => {
    if (gameState === 'playing') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [gameState, handleKeyDown]);

  useEffect(() => {
    if (gameState === 'playing' && !currentWord && !isTransitioning) {
      setCurrentWord(createNewWord());
    }
  }, [gameState, currentWord, createNewWord, isTransitioning]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (gameState === 'start') {
          resetGame();
        } else if (gameState === 'stageClear') {
          nextStage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, resetGame, nextStage]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
      <div
        className="w-full max-w-2xl p-8 bg-gradient-to-b from-blue-100 to-blue-200 shadow-xl rounded-lg"
        style={{
          transform: `scale(${settings.windowSize})`,
          transformOrigin: 'center center',
        }}
      >
        <GameHeader
          onAdminRequest={onAdminRequest}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          totalStagesCompleted={totalStagesCompleted}
          questionCount={questionCount}
          gameState={gameState}
          life={life}
          score={score}
          highScore={highScore}
          scoreAnimation={scoreAnimation}
        />

        <GameScreen
          gameState={gameState}
          currentWord={currentWord}
          countdown={countdown}
          score={score}
          speedMultiplier={speedMultiplier}
          highScore={highScore}
          totalStagesCompleted={totalStagesCompleted}
          questionCount={questionCount}
          finalScoreRef={finalScoreRef}
          previousHighScoreRef={previousHighScoreRef}
          resetGame={resetGame}
          nextStage={nextStage}
          saveHighScoreToStorage={saveHighScoreToStorage}
          showSuccessEffect={showSuccessEffect}
          particles={particles}
          scorePopups={scorePopups}
          stage={stage}
          convertToRomaji={convertToRomaji}
          shakeAnimation={shakeAnimation}
          settings={settings}
          currentBackground={currentBackground}
          stageBackgrounds={stageBackgrounds}
        />

        {gameState === 'playing' && currentWord && (
          <div className="relative h-32">
            <KeyboardHands
              highlightedKey={currentWord?.text || ''}
              currentInput={input}
              show={settings.showHands}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingGame;