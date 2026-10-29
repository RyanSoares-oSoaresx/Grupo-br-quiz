import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy, Flame, Clock, CheckCircle2, XCircle, ArrowRight, RotateCcw,
  Shield, Download, Trash2, X, Lock, Zap, Gamepad2, Radio,
  Volume2, VolumeX, Sparkles, AlertCircle, PlayCircle, Users
} from 'lucide-react';
import { db, QuizResult, LiveParticipant } from './lib/database';
import { triggerVictoryConfetti } from './lib/confetti';

// 12 PERGUNTAS DE CONHECIMENTOS GERAIS
const INITIAL_QUESTIONS = [
  {
    id: 'q1',
    question: "Qual é a capital do Brasil?",
    options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
    correctIndex: 2,
    timeLimit: 15,
    points: 150,
    category: "Geografia"
  },
  {
    id: 'q2',
    question: "Quantos dias tem um ano bissexto?",
    options: ["364", "365", "366", "367"],
    correctIndex: 2,
    timeLimit: 15,
    points: 150,
    category: "Curiosidades"
  },
  {
    id: 'q3',
    question: "Qual planeta é conhecido popularmente como o 'Planeta Vermelho'?",
    options: ["Vênus", "Marte", "Júpiter", "Saturno"],
    correctIndex: 1,
    timeLimit: 15,
    points: 150,
    category: "Ciências"
  },
  {
    id: 'q4',
    question: "Quantas cores tem o arco-íris tradicional?",
    options: ["5", "6", "7", "8"],
    correctIndex: 2,
    timeLimit: 15,
    points: 150,
    category: "Natureza"
  },
  {
    id: 'q5',
    question: "Qual é o maior animal vivo do planeta Terra?",
    options: ["Elefante africano", "Baleia-azul", "Tubarão-baleia", "Girafa"],
    correctIndex: 1,
    timeLimit: 15,
    points: 150,
    category: "Biologia"
  },
  {
    id: 'q6',
    question: "Qual destes elementos é uma cor primária tradicional?",
    options: ["Verde", "Laranja", "Azul", "Roxo"],
    correctIndex: 2,
    timeLimit: 15,
    points: 150,
    category: "Artes"
  },
  {
    id: 'q7',
    question: "Quantos segundos tem um minuto?",
    options: ["50", "60", "100", "120"],
    correctIndex: 1,
    timeLimit: 15,
    points: 150,
    category: "Matemática"
  },
  {
    id: 'q8',
    question: "Qual é o idioma oficial falado no Brasil?",
    options: ["Espanhol", "Português", "Inglês", "Italiano"],
    correctIndex: 1,
    timeLimit: 15,
    points: 150,
    category: "Línguas"
  },
  {
    id: 'q9',
    question: "Em que estação do ano as folhas das árvores costumam cair com frequência?",
    options: ["Primavera", "Verão", "Outono", "Inverno"],
    correctIndex: 2,
    timeLimit: 15,
    points: 150,
    category: "Natureza"
  },
  {
    id: 'q10',
    question: "Qual é o resultado da operação matemática 8 x 5?",
    options: ["35", "40", "45", "50"],
    correctIndex: 1,
    timeLimit: 15,
    points: 150,
    category: "Matemática"
  },
  {
    id: 'q11',
    question: "Qual órgão do corpo humano é responsável por bombear o sangue?",
    options: ["Coração", "Pulmão", "Fígado", "Estômago"],
    correctIndex: 0,
    timeLimit: 15,
    points: 150,
    category: "Saúde"
  },
  {
    id: 'q12',
    question: "Qual oceano banha o litoral do Brasil?",
    options: ["Pacífico", "Índico", "Atlântico", "Ártico"],
    correctIndex: 2,
    timeLimit: 15,
    points: 150,
    category: "Geografia"
  }
];

const AVATARS = [
  { id: 'fox', emoji: '🦊', label: 'Raposa Veloz' },
  { id: 'alien', emoji: '👾', label: 'Tech Alien' },
  { id: 'rocket', emoji: '🚀', label: 'Foguete Ágil' },
  { id: 'cat', emoji: '🐱', label: 'Gato Curioso' },
  { id: 'bolt', emoji: '⚡', label: 'Raio Estratégico' },
  { id: 'crown', emoji: '👑', label: 'Mestre' },
  { id: 'fire', emoji: '🔥', label: 'Chama Viva' },
  { id: 'robot', emoji: '🤖', label: 'Bot Lógico' },
  { id: 'game', emoji: '🎮', label: 'Gamer Pro' },
  { id: 'unicorn', emoji: '🦄', label: 'Mítico' }
];

// Efeitos Sonoros Web Audio API nativa
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  playStreak() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }
}

const sounds = new SoundEffects();

// Logo Oficial do GRUPOBR com fallback automático
const GrupoBrLogo = ({ size = 'normal', showSubtitle = true }: { size?: 'normal' | 'large'; showSubtitle?: boolean }) => {
  const isLarge = size === 'large';
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href="https://brcallcenter.com.br/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 select-none group cursor-pointer transition-transform hover:scale-[1.02]"
      title="Acessar site oficial da BRCALL"
    >
      <div className={`relative ${isLarge ? 'w-14 h-14' : 'w-10 h-10'} aspect-square flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-700/60 group-hover:border-emerald-500/50 shadow-lg shadow-black/40 overflow-hidden transition-all shrink-0`}>
        {!imgError ? (
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPLJwcXXvL_1K-BKMEFpY0BuUbheEDyFYVUBHxt8G7JH4bjvhO2Od8U5l1&s=10"
            alt="GrupoBR BRCALL Logo"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover scale-105"
          />
        ) : (
          <span className="font-black text-emerald-400 text-lg">BR</span>
        )}
      </div>
      {showSubtitle && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-white ${isLarge ? 'text-2xl' : 'text-lg'}`}>
              Grupo<span className="text-emerald-400">BR</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              BRCALL
            </span>
          </div>
          <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
            CUSTOMER EXPERIENCE & BPO
          </span>
        </div>
      )}
    </a>
  );
};

// Fundo Interativo em Canvas com Partículas e Conexões
const InteractiveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const numParticles = Math.min(50, Math.floor((width * height) / 22000));
    const particles = Array.from({ length: numParticles }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
      baseColor: Math.random() > 0.4 ? 'rgba(16, 185, 129,' : 'rgba(56, 189, 248,'
    }));

    const mouse = { x: -1000, y: -1000, radius: 120 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseout', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x -= (dx / dist) * force * 2.5;
          p.y -= (dy / dist) * force * 2.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.baseColor} 0.65)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distLinks = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (distLinks < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.16 * (1 - distLinks / 110)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-65" />;
};

export default function App() {
  const [questions] = useState(INITIAL_QUESTIONS);
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'playing' | 'finished' | 'admin'>('welcome');
  const [studentResults, setStudentResults] = useState<QuizResult[]>(() => db.getLocalResults());
  const [liveParticipants, setLiveParticipants] = useState<LiveParticipant[]>(() => db.getLocalActive());
  const [cloudConnected, setCloudConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Estado do Jogador Atual
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[4]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [, setBestStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mySessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9));

  // Painel Admin
  const [adminAuthModal, setAdminAuthModal] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  // Refs para Heartbeat estável
  const stateRef = useRef({
    currentScreen,
    playerName,
    selectedAvatar,
    currentQuestionIndex,
    questionsLength: questions.length,
    elapsedSeconds,
    mySessionId,
    streakCount
  });

  useEffect(() => {
    stateRef.current = {
      currentScreen,
      playerName,
      selectedAvatar,
      currentQuestionIndex,
      questionsLength: questions.length,
      elapsedSeconds,
      mySessionId,
      streakCount
    };
  }, [currentScreen, playerName, selectedAvatar, currentQuestionIndex, questions.length, elapsedSeconds, mySessionId, streakCount]);

  // 1. Inscrição em Tempo Real (Broadcast + Nuvem) - ATUALIZA TUDO SEM F5!
  useEffect(() => {
    const unsubData = db.subscribeData(({ results, active }) => {
      setStudentResults(results);
      setLiveParticipants(active);
    });

    const unsubStatus = db.subscribeStatus((online) => {
      setCloudConnected(online);
    });

    return () => {
      unsubData();
      unsubStatus();
    };
  }, []);

  // 2. Heartbeat em Tempo Real enquanto o jogador estiver respondendo o Quiz
  useEffect(() => {
    if (currentScreen !== 'playing' || !playerName.trim()) return;

    const emitPulse = () => {
      const s = stateRef.current;
      if (s.currentScreen !== 'playing' || !s.playerName.trim()) return;

      const myEntry: LiveParticipant = {
        sessionId: s.mySessionId,
        name: s.playerName.trim(),
        avatar: s.selectedAvatar.emoji,
        currentQ: s.currentQuestionIndex + 1,
        totalQ: s.questionsLength,
        elapsedSec: s.elapsedSeconds,
        lastPing: Date.now(),
        streak: s.streakCount
      };

      db.emitLivePulse(myEntry);
    };

    // Pulso imediato
    emitPulse();

    // Pulso regular a cada 2.5s
    const pulseTimer = setInterval(emitPulse, 2500);

    return () => {
      clearInterval(pulseTimer);
      db.removeLiveParticipant(mySessionId);
    };
  }, [currentScreen, playerName, mySessionId]);

  // Remove participante ao fechar ou atualizar a aba
  useEffect(() => {
    const handleUnload = () => {
      db.removeLiveParticipant(mySessionId);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [mySessionId]);

  // Timer Geral do Quiz
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (currentScreen === 'playing' && quizStartTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - quizStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScreen, quizStartTime]);

  const handleTimeOut = useCallback(() => {
    setIsAnswerCorrect(false);
    setSelectedOption(-1);
    setStreakCount(0);
    setShowFeedbackModal(true);
    sounds.playWrong();
  }, []);

  // Timer de cada Questão (15s regressivo)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (currentScreen === 'playing' && !showFeedbackModal && selectedOption === null) {
      if (timeLeft > 0) {
        timer = setInterval(() => {
          setTimeLeft((prev) => prev - 1);
        }, 1000);
      } else {
        handleTimeOut();
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentScreen, showFeedbackModal, selectedOption, timeLeft, handleTimeOut]);

  const handleStartQuiz = () => {
    if (!playerName.trim()) return;
    setCurrentQuestionIndex(0);
    setUserScore(0);
    setCorrectAnswersCount(0);
    setStreakCount(0);
    setBestStreak(0);
    setSelectedOption(null);
    setShowFeedbackModal(false);
    setTimeLeft(questions[0]?.timeLimit || 15);
    setQuestionStartTime(Date.now());
    setQuizStartTime(Date.now());
    setElapsedSeconds(0);
    setCurrentScreen('playing');

    // Emite o pulso de entrada imediatamente no bloco Ao Vivo
    db.emitLivePulse({
      sessionId: mySessionId,
      name: playerName.trim(),
      avatar: selectedAvatar.emoji,
      currentQ: 1,
      totalQ: questions.length,
      elapsedSec: 0,
      lastPing: Date.now(),
      streak: 0
    });
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null || showFeedbackModal) return;

    const currQ = questions[currentQuestionIndex];
    const correct = idx === currQ.correctIndex;
    setSelectedOption(idx);
    setIsAnswerCorrect(correct);

    if (correct) {
      const newStreak = streakCount + 1;
      if (newStreak >= 2) {
        sounds.playStreak();
      } else {
        sounds.playCorrect();
      }

      const timeSpent = Math.max(0, Math.floor((Date.now() - questionStartTime) / 1000));
      const speedScore = Math.max(30, (currQ.points || 150) - timeSpent * 10);
      const multiplier = newStreak >= 3 ? 1.5 : newStreak === 2 ? 1.2 : 1;
      const gained = Math.round(speedScore * multiplier);

      setUserScore((prev) => prev + gained);
      setCorrectAnswersCount((prev) => prev + 1);
      setStreakCount(newStreak);
      setBestStreak((prev) => Math.max(prev, newStreak));

      // Atualiza o bloco Ao Vivo com a nova informação de combo
      db.emitLivePulse({
        sessionId: mySessionId,
        name: playerName.trim(),
        avatar: selectedAvatar.emoji,
        currentQ: currentQuestionIndex + 1,
        totalQ: questions.length,
        elapsedSec: elapsedSeconds,
        lastPing: Date.now(),
        streak: newStreak
      });
    } else {
      sounds.playWrong();
      setStreakCount(0);
    }

    setShowFeedbackModal(true);
  };

  const handleNextQuestion = async () => {
    setShowFeedbackModal(false);
    setSelectedOption(null);

    if (currentQuestionIndex + 1 < questions.length) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimeLeft(questions[nextIdx]?.timeLimit || 15);
      setQuestionStartTime(Date.now());

      // Atualiza o progresso no bloco Ao Vivo em tempo real para todos verem!
      db.emitLivePulse({
        sessionId: mySessionId,
        name: playerName.trim(),
        avatar: selectedAvatar.emoji,
        currentQ: nextIdx + 1,
        totalQ: questions.length,
        elapsedSec: elapsedSeconds,
        lastPing: Date.now(),
        streak: streakCount
      });
    } else {
      // 1. Remove participante do bloco Ao Vivo
      await db.removeLiveParticipant(mySessionId);

      // 2. Monta o resultado final
      const finalAccuracy = Math.round((correctAnswersCount / questions.length) * 100);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newResult: QuizResult = {
        id: 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: playerName.trim(),
        avatar: selectedAvatar.emoji,
        score: userScore,
        accuracy: finalAccuracy,
        correctCount: correctAnswersCount,
        totalQuestions: questions.length,
        timeSpentSeconds: elapsedSeconds,
        timestamp: timeStr,
        createdAt: Date.now(),
        sessionId: mySessionId
      };

      // 3. Salva no banco de dados e notifica todas as abas e dispositivos sem F5
      await db.saveResult(newResult);

      // 4. Celebração com confetes
      triggerVictoryConfetti();

      setCurrentScreen('finished');
    }
  };

  // Suporte a Teclado (1-4, A-D e Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentScreen !== 'playing') return;

      if (showFeedbackModal) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      if (selectedOption === null) {
        const key = e.key.toUpperCase();
        const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        if (key in map) {
          const idx = map[key];
          if (idx < questions[currentQuestionIndex].options.length) {
            handleSelectOption(idx);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, showFeedbackModal, selectedOption, currentQuestionIndex, questions]);

  // Função Surpresa: Simulação de Colaborador Ao Vivo para testes
  const handleSimulateCollaborator = () => {
    const simAvatars = ['🦊', '🚀', '⚡', '🐱', '🎮'];
    const simNames = ['Mariana Costa', 'Lucas Mendes', 'Fernanda Lima', 'Rodrigo Alves', 'Juliana Rocha'];
    const randomName = simNames[Math.floor(Math.random() * simNames.length)];
    const randomAvatar = simAvatars[Math.floor(Math.random() * simAvatars.length)];
    const simSessionId = 'sim_' + Date.now();

    let step = 1;
    let simStreak = 0;
    let simScore = 0;

    const interval = setInterval(async () => {
      simStreak = Math.min(simStreak + 1, 4);
      simScore += Math.floor(140 * (simStreak >= 3 ? 1.5 : 1));

      if (step <= questions.length) {
        await db.emitLivePulse({
          sessionId: simSessionId,
          name: `${randomName} (Demo)`,
          avatar: randomAvatar,
          currentQ: step,
          totalQ: questions.length,
          elapsedSec: step * 3,
          lastPing: Date.now(),
          streak: simStreak
        });
        step++;
      } else {
        clearInterval(interval);
        await db.removeLiveParticipant(simSessionId);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        await db.saveResult({
          id: 'res_sim_' + Date.now(),
          name: `${randomName} (Demo)`,
          avatar: randomAvatar,
          score: simScore,
          accuracy: 92,
          correctCount: 11,
          totalQuestions: 12,
          timeSpentSeconds: 38,
          timestamp: timeStr,
          createdAt: Date.now()
        });
      }
    }, 2000);
  };

  const handleClearHistory = async () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de resultados?')) {
      await db.clearResults();
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin123';
    if (adminUser.trim().toLowerCase() === 'admin' && adminPass === validPassword) {
      setAdminAuthModal(false);
      setAdminUser('');
      setAdminPass('');
      setAdminAuthError('');
      setCurrentScreen('admin');
    } else {
      setAdminAuthError('Credenciais incorretas. Tente novamente.');
    }
  };

  const handleExportCSV = () => {
    if (studentResults.length === 0) return;
    const headers = "Nome,Avatar,Pontos,Precisao(%),Acertos,Questoes,Tempo(s),Horario\n";
    const rows = studentResults
      .map(r => `"${r.name}","${r.avatar}",${r.score},${r.accuracy},${r.correctCount},${r.totalQuestions},${r.timeSpentSeconds || 0},"${r.timestamp}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `grupobr_quiz_resultados_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Estatísticas do Admin
  const stats = useMemo(() => {
    if (studentResults.length === 0) {
      return { total: 0, avgAccuracy: 0, highestScore: 0 };
    }
    const total = studentResults.length;
    const avg = Math.round(studentResults.reduce((acc, r) => acc + (r.accuracy || 0), 0) / total);
    const max = Math.max(...studentResults.map(r => r.score || 0));
    return { total, avgAccuracy: avg, highestScore: max };
  }, [studentResults]);

  // Ranking ordenado por pontuação
  const sortedRanking = useMemo(() => {
    return [...studentResults].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [studentResults]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Fundo de partículas com reação ao cursor */}
      <InteractiveBackground />

      {/* Marca d'água institucional no centro da tela */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.03] rotate-[-12deg]">
        <div className="text-center font-black tracking-widest text-white leading-none">
          <p className="text-[14vw]">GRUPOBR</p>
          <p className="text-[5vw] text-emerald-400">CUSTOMER EXPERIENCE</p>
        </div>
      </div>

      {/* Topo / Navbar */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <GrupoBrLogo size="normal" showSubtitle={true} />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Alternador de Som */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sounds.enabled = next;
            }}
            title={soundEnabled ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros'}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Status do Banco e Nuvem Realtime */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${
            cloudConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cloudConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${cloudConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="hidden sm:inline">{cloudConnected ? 'Nuvem Realtime Ativa' : 'Modo Offline-First'}</span>
            <span className="sm:hidden">{cloudConnected ? 'Online' : 'Local'}</span>
          </div>

          {/* Botão Admin / Voltar */}
          <button
            onClick={() => {
              if (currentScreen === 'admin') setCurrentScreen('welcome');
              else setAdminAuthModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all hover:border-emerald-500/40 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>{currentScreen === 'admin' ? 'Voltar ao Quiz' : 'Painel Admin'}</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-6xl w-full mx-auto">
        {/* TELA DE INÍCIO / LOBBY */}
        {currentScreen === 'welcome' && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
            {/* Coluna Esquerda: Cadastro e Início */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl shadow-black/60 flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <GrupoBrLogo size="large" showSubtitle={true} />
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400">{questions.length}</span>
                  <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Questões</span>
                </div>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Treinamento & <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    Desafio de Conhecimento
                  </span>
                </h1>
                <p className="text-sm text-slate-300 mt-2">
                  Teste sua agilidade e conquiste o topo do ranking em tempo real da equipe.
                </p>
              </div>

              {/* Seleção de Avatar */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Escolha seu Avatar
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                        selectedAvatar.id === av.id
                          ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105'
                          : 'bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                      title={av.label}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Nome */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Seu Nome ou Nickname
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Digite seu nome..."
                    maxLength={24}
                    className="w-full bg-slate-950/70 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && playerName.trim()) handleStartQuiz();
                    }}
                  />
                  <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={!playerName.trim()}
                className={`w-full py-4 rounded-xl font-black tracking-wide text-sm flex items-center justify-center gap-3 transition-all ${
                  playerName.trim()
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-[0.99] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                }`}
              >
                <Gamepad2 className="w-5 h-5" />
                <span>COMEÇAR QUIZ ({questions.length} QUESTÕES)</span>
              </button>
            </div>

            {/* Coluna Direita: Participantes Ao Vivo + Ranking */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Card de Regras */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Como Funciona o Quiz</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>15s por Pergunta:</strong> Contagem regressiva em cada questão.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Velocidade Conta (+150 pts base):</strong> Quanto mais rápido responder, mais pontos você ganha!</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Multiplicador Streak:</strong> Acertos em sequência ativam bônus de combo (1.2x a 1.5x).</span>
                  </div>
                </div>
              </div>

              {/* CARD AO VIVO NO QUIZ (ATUALIZAÇÃO 100% AUTOMÁTICA EM TEMPO REAL) */}
              <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl shadow-emerald-950/20">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Ao Vivo no Quiz</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {liveParticipants.length > 0 ? `${liveParticipants.length} ativo(s)` : 'Aguardando'}
                    </span>
                    <button
                      onClick={handleSimulateCollaborator}
                      title="Testar simulação ao vivo de colaborador"
                      className="text-[10px] flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30 transition-all cursor-pointer"
                    >
                      <PlayCircle className="w-3 h-3" />
                      <span>Simular</span>
                    </button>
                  </div>
                </div>

                {liveParticipants.length > 0 ? (
                  <div className="space-y-2.5">
                    {liveParticipants.map((p, idx) => (
                      <div
                        key={p.sessionId || idx}
                        className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3 flex flex-col gap-2 shadow-md transition-all animate-in fade-in duration-300"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-lg filter drop-shadow">{p.avatar}</span>
                            <span className="font-bold text-white">{p.name}</span>
                            {p.streak && p.streak >= 2 ? (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                                <Flame className="w-2.5 h-2.5 animate-bounce" /> {p.streak}x
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Q{p.currentQ}/{p.totalQ}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {formatTimer(p.elapsedSec)}
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Animada em Tempo Real */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm shadow-emerald-500/50"
                            style={{ width: `${Math.min(100, (p.currentQ / p.totalQ) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-xs text-slate-400">
                    <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                    Nenhum colaborador fazendo a prova no momento. <br />
                    <span className="text-slate-300 font-medium">Inicie o quiz ou clique em <strong>"Simular"</strong> para ver a mágica ao vivo!</span>
                  </div>
                )}
              </div>

              {/* CARD RANKING EM TEMPO REAL (SEM NECESSIDADE DE F5) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl flex flex-col max-h-[360px]">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Ranking em Tempo Real</h3>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    AUTO-SYNC (SEM F5)
                  </span>
                </div>

                <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
                  {sortedRanking.length > 0 ? (
                    sortedRanking.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          idx === 0
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-md shadow-amber-950/20'
                            : idx === 1
                            ? 'bg-slate-700/30 border-slate-600/40 text-slate-200'
                            : idx === 2
                            ? 'bg-amber-800/20 border-amber-700/30 text-amber-300'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 text-center font-black text-xs ${idx === 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </span>
                          <span className="text-lg">{item.avatar}</span>
                          <div>
                            <p className="font-bold text-xs text-white leading-tight">{item.name}</p>
                            <span className="text-[10px] text-slate-400">{item.accuracy}% precisão</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-xs text-emerald-400">{item.score} pts</span>
                          <span className="block text-[9px] text-slate-400">{item.timestamp}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      <Trophy className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <strong>Nenhum jogador pontuou ainda!</strong>
                      <p className="text-[11px] text-slate-400 mt-1">Seja o primeiro a completar o quiz para liderar o ranking.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TELA DE JOGO / QUIZ EM ANDAMENTO */}
        {currentScreen === 'playing' && (
          <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative my-auto">
            {/* Barra superior de status do jogo */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedAvatar.emoji}</span>
                <div>
                  <h4 className="font-bold text-white text-sm">{playerName}</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400 font-semibold">{userScore} pts</span>
                    {streakCount >= 2 && (
                      <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] border border-amber-500/20">
                        <Flame className="w-3 h-3 animate-bounce" /> {streakCount}x Combo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Questão</span>
                  <p className="text-base font-black text-white">
                    {currentQuestionIndex + 1} <span className="text-slate-400 text-xs">/ {questions.length}</span>
                  </p>
                </div>

                {/* Relógio Regressivo Circular */}
                <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 font-black text-sm transition-all ${
                  timeLeft <= 5
                    ? 'border-red-500 bg-red-500/10 text-red-400 animate-pulse'
                    : 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                }`}>
                  {timeLeft}s
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div className="mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {questions[currentQuestionIndex].category}
              </span>
            </div>

            {/* Pergunta */}
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 leading-snug">
              {questions[currentQuestionIndex].question}
            </h2>

            {/* Alternativas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {questions[currentQuestionIndex].options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === questions[currentQuestionIndex].correctIndex;
                let btnStyle = "bg-slate-950/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200 cursor-pointer";

                if (selectedOption !== null) {
                  if (isSelected && isCorrect) {
                    btnStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-lg shadow-emerald-500/20";
                  } else if (isSelected && !isCorrect) {
                    btnStyle = "bg-red-500/20 border-red-400 text-red-300 font-bold shadow-lg shadow-red-500/20";
                  } else if (isCorrect) {
                    btnStyle = "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold";
                  } else {
                    btnStyle = "bg-slate-950/30 border-slate-800 text-slate-500";
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={selectedOption !== null}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span className="font-medium">{opt}</span>
                    <span className="text-xs font-bold opacity-60 ml-2">
                      {String.fromCharCode(65 + idx)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal / Feedback de Resposta */}
            {showFeedbackModal && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/95 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {isAnswerCorrect ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-400 shrink-0" />
                  )}
                  <div>
                    <h4 className={`font-black text-sm ${isAnswerCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isAnswerCorrect ? 'Resposta Correta!' : 'Resposta Incorreta ou Tempo Esgotado!'}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {isAnswerCorrect
                        ? 'Excelente agilidade na resposta!'
                        : `A resposta correta é: ${questions[currentQuestionIndex].options[questions[currentQuestionIndex].correctIndex]}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <span>{currentQuestionIndex + 1 === questions.length ? 'Ver Resultado' : 'Próxima (Enter)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TELA DE CONCLUSÃO / RESULTADO FINAL */}
        {currentScreen === 'finished' && (
          <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl text-center relative my-auto">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-emerald-500/10 border-2 border-emerald-400/40 flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/20 animate-bounce">
              {selectedAvatar.emoji}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Desafio Concluído!</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">Parabéns, {playerName}!</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">Seus resultados foram gravados e atualizados no ranking da equipe.</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Pontuação</span>
                <span className="text-xl font-black text-emerald-400">{userScore}</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Precisão</span>
                <span className="text-xl font-black text-cyan-400">
                  {Math.round((correctAnswersCount / questions.length) * 100)}%
                </span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Acertos</span>
                <span className="text-xl font-black text-white">
                  {correctAnswersCount}/{questions.length}
                </span>
              </div>
            </div>

            <button
              onClick={() => setCurrentScreen('welcome')}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Voltar ao Início e Jogar Novamente</span>
            </button>
          </div>
        )}

        {/* TELA DO PROFESSOR / DASHBOARD ADMINISTRATIVO */}
        {currentScreen === 'admin' && (
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6">
            {/* Cabeçalho do Painel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-xl font-black text-white">Painel Administrativo & Gestor</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">Acompanhamento de métricas, pontuações e participantes em tempo real.</p>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSimulateCollaborator}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Simular Participante</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={studentResults.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Histórico</span>
                </button>
              </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs uppercase font-bold text-slate-400">Total de Participações</span>
                <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs uppercase font-bold text-slate-400">Média de Acerto</span>
                <p className="text-2xl font-black text-cyan-400 mt-1">{stats.avgAccuracy}%</p>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs uppercase font-bold text-slate-400">Maior Pontuação</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{stats.highestScore} pts</p>
              </div>
            </div>

            {/* Informativo sobre o Banco de Dados Antiperda */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/20 flex items-start gap-3 text-xs text-slate-300">
              <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Banco de Dados Ativo e Permanente</strong>
                O QuizPulse está conectado ao armazenamento em nuvem de alta disponibilidade com sincronização em tempo real nativa (BroadcastChannel + Cloud Relay + Vercel Serverless). Nenhuma alteração é perdida e o banco nunca pausa por inatividade.
              </div>
            </div>

            {/* Tabela de Resultados dos Alunos */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Desempenho dos Colaboradores</h3>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {studentResults.length} Registros
                </span>
              </div>

              {studentResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Colaborador</th>
                        <th className="py-2.5 px-3">Pontos</th>
                        <th className="py-2.5 px-3">Precisão</th>
                        <th className="py-2.5 px-3">Acertos</th>
                        <th className="py-2.5 px-3">Tempo</th>
                        <th className="py-2.5 px-3">Horário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {studentResults.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            <span>{r.avatar}</span>
                            <span className="font-bold text-white">{r.name}</span>
                          </td>
                          <td className="py-2.5 px-3 font-black text-emerald-400">{r.score}</td>
                          <td className="py-2.5 px-3 text-cyan-400 font-semibold">{r.accuracy}%</td>
                          <td className="py-2.5 px-3 text-slate-300">{r.correctCount}/{r.totalQuestions}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{formatTimer(r.timeSpentSeconds || 0)}</td>
                          <td className="py-2.5 px-3 text-slate-400">{r.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-6 text-xs text-slate-400">Nenhum resultado registrado ainda.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Autenticação do Professor */}
      {adminAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setAdminAuthModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-black text-white">Painel Administrativo</h3>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Usuário</label>
                <input
                  type="text"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Senha</label>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {adminAuthError && (
                <p className="text-red-400 text-xs font-semibold">{adminAuthError}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all mt-2 cursor-pointer"
              >
                Entrar no Painel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rodapé Oficial da BRCALL */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <a
          href="https://brcallcenter.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 transition-opacity hover:opacity-85"
          title="Visitar site oficial da BRCALL"
        >
          <img
            src="https://grupobrcall.com/wp-content/uploads/2022/09/grupobrcall.png"
            alt="GrupoBR BRCALL"
            className="h-6 sm:h-7 w-auto object-contain"
          />
          <span className="text-[11px] text-slate-400">Ambiente de Treinamento e Capacitação</span>
        </a>

        <div className="flex items-center gap-1.5 text-[11px] bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
          <span>&lt;/&gt; Desenvolvido pela equipe de T.I. —</span>
          <a
            href="https://brcallcenter.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 font-bold hover:underline"
          >
            GRUPOBR
          </a>
        </div>
      </footer>
    </div>
  );
}
