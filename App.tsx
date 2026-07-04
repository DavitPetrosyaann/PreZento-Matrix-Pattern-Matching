import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Trophy, Zap, AlertTriangle, Home } from 'lucide-react';
import { GameState, GamePhase, GameStats } from './types';
import { getLevelConfig, getMaxWarnings, BASE_SCORE } from './constants';

type ExplosionPhase = 'none' | 'imploding' | 'exploding';

interface Particle {
    id: number;
    x: number;
    y: number;
    z: number;
    color: string;
    size: number;
    delay: number;
}

interface Vector3D {
    x: number;
    y: number;
    z: number;
    rotX: number;
    rotY: number;
    rotZ: number;
}

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('menu');
    const [phase, setPhase] = useState<GamePhase>('idle');
    
    // Board dimensions state
    const [boardCols, setBoardCols] = useState<number>(3);
    const [boardRows, setBoardRows] = useState<number>(3);
    const [customColsInput, setCustomColsInput] = useState<string>('');
    const [customRowsInput, setCustomRowsInput] = useState<string>('');
    
    const [stats, setStats] = useState<GameStats>({
        score: 0,
        level: 1,
        warnings: 0,
        maxCombo: 0
    });
    
    const [currentCombo, setCurrentCombo] = useState(0);
    const [pattern, setPattern] = useState<number[]>([]);
    const [userPattern, setUserPattern] = useState<number[]>([]);
    const [wrongTile, setWrongTile] = useState<number | null>(null);
    const [message, setMessage] = useState<string>('');
    
    // Animation states
    const [isShaking, setIsShaking] = useState<boolean>(false);
    const [explosionPhase, setExplosionPhase] = useState<ExplosionPhase>('none');
    const [explosionVectors, setExplosionVectors] = useState<Vector3D[]>([]);
    const [particles, setParticles] = useState<Particle[]>([]);

    // Refs for timeouts to clean them up
    const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const explosionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clearTimeouts = useCallback(() => {
        if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
        if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
        if (explosionTimeoutRef.current) clearTimeout(explosionTimeoutRef.current);
    }, []);

    const showMessage = useCallback((msg: string, duration: number = 2000) => {
        setMessage(msg);
        if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
        if (duration > 0) {
            messageTimeoutRef.current = setTimeout(() => {
                setMessage('');
            }, duration);
        }
    }, []);

    const generatePattern = useCallback((totalTiles: number, length: number) => {
        const newPattern = new Set<number>();
        // Safety check to prevent infinite loop if length > totalTiles
        const safeLength = Math.min(length, totalTiles);
        while (newPattern.size < safeLength) {
            newPattern.add(Math.floor(Math.random() * totalTiles));
        }
        return Array.from(newPattern);
    }, []);

    const startLevel = useCallback((levelToStart: number) => {
        clearTimeouts();
        const config = getLevelConfig(levelToStart, boardCols, boardRows);
        const totalTiles = config.gridCols * config.gridRows;
        const newPattern = generatePattern(totalTiles, config.patternLength);
        
        setPattern(newPattern);
        setUserPattern([]);
        setWrongTile(null);
        setPhase('showing');
        showMessage(`LEVEL ${levelToStart}`, 1000);

        // Transition to input phase after showing
        phaseTimeoutRef.current = setTimeout(() => {
            setPhase('input');
            showMessage('YOUR TURN', 1500);
        }, config.showDurationMs + 1000); // Add 1s buffer for initial level display
    }, [clearTimeouts, generatePattern, showMessage, boardCols, boardRows]);

    const startGame = useCallback(() => {
        setGameState('playing');
        setStats({ score: 0, level: 1, warnings: 0, maxCombo: 0 });
        setCurrentCombo(0);
        setExplosionPhase('none');
        setIsShaking(false);
        setExplosionVectors([]);
        setParticles([]);
        startLevel(1);
    }, [startLevel]);

    const handleGameOver = useCallback(() => {
        setGameState('gameover');
        setPhase('idle');
        showMessage('', 0); // Clear message
    }, [showMessage]);

    const triggerEpicExplosion = useCallback(() => {
        const config = getLevelConfig(stats.level, boardCols, boardRows);
        const totalTiles = config.gridCols * config.gridRows;
        
        // Phase 1: Implosion & Anticipation
        setExplosionPhase('imploding');
        showMessage('CRITICAL FAILURE', 3000);
        
        explosionTimeoutRef.current = setTimeout(() => {
            // Phase 2: The Blast
            
            // Generate extreme 3D flying vectors for each tile
            const vectors = Array.from({ length: totalTiles }).map(() => {
                const angle = Math.random() * Math.PI * 2;
                const velocity = 2000 + Math.random() * 4000; // Fly extremely far away
                const zVelocity = (Math.random() - 0.5) * 3000; // Fly towards/away from camera
                return {
                    x: Math.cos(angle) * velocity,
                    y: Math.sin(angle) * velocity,
                    z: zVelocity,
                    rotX: (Math.random() - 0.5) * 3600,
                    rotY: (Math.random() - 0.5) * 3600,
                    rotZ: (Math.random() - 0.5) * 3600
                };
            });
            
            // Generate particles for the blast
            const colors = ['#00f3ff', '#ff00ff', '#00ff00', '#ff003c', '#ffffff'];
            const newParticles = Array.from({ length: 150 }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const dist = 1000 + Math.random() * 2000;
                return {
                    id: i,
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    z: (Math.random() - 0.5) * 2000,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: 2 + Math.random() * 8,
                    delay: Math.random() * 0.1 // Slight stagger
                };
            });

            setExplosionVectors(vectors);
            setParticles(newParticles);
            setExplosionPhase('exploding');
            
            // Phase 3: Game Over Screen
            explosionTimeoutRef.current = setTimeout(() => {
                handleGameOver();
                setExplosionPhase('none');
                setExplosionVectors([]);
                setParticles([]);
            }, 2500); // Wait for epic explosion animation to finish
            
        }, 800); // Duration of the implosion build-up
    }, [stats.level, boardCols, boardRows, handleGameOver, showMessage]);

    const handleTileClick = useCallback((index: number) => {
        if (phase !== 'input') return;
        if (userPattern.includes(index)) return; // Already clicked

        const newUserPattern = [...userPattern, index];
        setUserPattern(newUserPattern);

        // Check if the clicked tile is in the pattern
        if (pattern.includes(index)) {
            // Correct click
            const newCombo = currentCombo + 1;
            setCurrentCombo(newCombo);
            
            // Calculate score with combo multiplier
            const pointsEarned = Math.floor(BASE_SCORE * (1 + (newCombo * 0.1)));
            
            setStats(prev => ({
                ...prev,
                score: prev.score + pointsEarned,
                maxCombo: Math.max(prev.maxCombo, newCombo)
            }));

            // Check if level is complete
            if (newUserPattern.length === pattern.length) {
                setPhase('result');
                showMessage('PATTERN MATCHED', 1500);
                
                phaseTimeoutRef.current = setTimeout(() => {
                    const nextLevel = stats.level + 1;
                    setStats(prev => ({ ...prev, level: nextLevel }));
                    startLevel(nextLevel);
                }, 1500);
            }
        } else {
            // Wrong click
            setPhase('result');
            setWrongTile(index);
            setCurrentCombo(0);
            
            const newWarnings = stats.warnings + 1;
            setStats(prev => ({ ...prev, warnings: newWarnings }));

            const maxWarnings = getMaxWarnings(boardCols, boardRows);

            if (newWarnings >= maxWarnings) {
                triggerEpicExplosion();
            } else {
                // Mistake made -> Shake and warn
                setIsShaking(true);
                
                setTimeout(() => {
                    setIsShaking(false);
                }, 600); // Reset shake after animation
                
                showMessage('', 0); // Clear top message to focus on the center warning
                phaseTimeoutRef.current = setTimeout(() => {
                    // Retry same level
                    startLevel(stats.level);
                }, 1500);
            }
        }
    }, [phase, userPattern, pattern, currentCombo, stats.level, stats.warnings, startLevel, triggerEpicExplosion, showMessage, boardCols, boardRows]);

    // Cleanup on unmount
    useEffect(() => {
        return clearTimeouts;
    }, [clearTimeouts]);

    // --- Render Helpers ---

    const renderGrid = () => {
        const config = getLevelConfig(stats.level, boardCols, boardRows);
        const totalTiles = config.gridCols * config.gridRows;
        const tiles = [];

        for (let i = 0; i < totalTiles; i++) {
            let tileState = 'idle';
            
            if (phase === 'showing' && pattern.includes(i)) {
                tileState = 'showing';
            } else if (userPattern.includes(i)) {
                tileState = pattern.includes(i) ? 'correct' : 'wrong';
            } else if (phase === 'result' && wrongTile === i) {
                tileState = 'wrong';
            } else if (phase === 'result' && pattern.includes(i) && !userPattern.includes(i)) {
                // Reveal missed tiles on failure
                tileState = 'missed';
            }

            let baseClasses = "w-full aspect-square rounded-lg transition-all duration-300 ease-in-out transform ";
            let stateClasses = "";
            let inlineStyle: React.CSSProperties = {};

            switch (tileState) {
                case 'idle':
                    stateClasses = "bg-neon-panel border border-gray-800 hover:border-gray-600 shadow-inner";
                    if (phase === 'input') baseClasses += " cursor-pointer hover:scale-105 active:scale-95";
                    break;
                case 'showing':
                    stateClasses = "bg-neon-cyan border-2 border-white shadow-neon-cyan scale-105";
                    break;
                case 'correct':
                    stateClasses = "bg-neon-green border-2 border-white shadow-neon-green scale-105";
                    break;
                case 'wrong':
                    stateClasses = "bg-neon-red border-2 border-white shadow-neon-red scale-105 animate-pulse-fast";
                    break;
                case 'missed':
                    stateClasses = "bg-neon-cyan/30 border border-neon-cyan/50";
                    break;
            }

            // Apply epic 3D explosion physics if triggered
            if (explosionPhase === 'exploding' && explosionVectors[i]) {
                const vec = explosionVectors[i];
                inlineStyle = {
                    transform: `translate3d(${vec.x}px, ${vec.y}px, ${vec.z}px) rotateX(${vec.rotX}deg) rotateY(${vec.rotY}deg) rotateZ(${vec.rotZ}deg) scale(0.5)`,
                    opacity: 0,
                    filter: 'brightness(5) drop-shadow(0 0 30px #ff003c)',
                    transition: 'all 2s cubic-bezier(0.05, 0.9, 0.1, 1)', // Explosive easing
                    pointerEvents: 'none',
                    zIndex: 50
                };
            }

            tiles.push(
                <button
                    key={i}
                    className={`${baseClasses} ${stateClasses}`}
                    style={inlineStyle}
                    onClick={() => handleTileClick(i)}
                    disabled={phase !== 'input' || userPattern.includes(i)}
                    aria-label={`Tile ${i}`}
                />
            );
        }

        // Adjust gap dynamically based on grid size to prevent huge grids from overflowing
        const maxDim = Math.max(config.gridCols, config.gridRows);
        const gapClass = maxDim > 5 ? 'gap-1 sm:gap-2' : 'gap-2 sm:gap-4';
        let containerClasses = `grid ${gapClass} w-full max-w-md mx-auto p-4 sm:p-6 bg-neon-dark/80 rounded-2xl border border-gray-800 backdrop-blur-sm shadow-2xl relative z-10`;
        
        if (isShaking) containerClasses += " animate-shake";
        if (explosionPhase === 'imploding') containerClasses += " animate-implode";
        // When exploding, remove background to just show flying tiles
        if (explosionPhase === 'exploding') containerClasses = containerClasses.replace('bg-neon-dark/80', 'bg-transparent').replace('border-gray-800', 'border-transparent').replace('shadow-2xl', '');

        return (
            <div className="relative w-full flex justify-center items-center">
                {/* The Grid */}
                <div 
                    className={containerClasses}
                    style={{ 
                        gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))`,
                        transformStyle: 'preserve-3d'
                    }}
                >
                    {tiles}

                    {/* Warning Overlay in the middle of the box */}
                    {phase === 'result' && wrongTile !== null && explosionPhase === 'none' && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                            <div className="bg-black/80 border-2 border-neon-red px-6 py-4 sm:px-10 sm:py-6 rounded-2xl transform -rotate-12 animate-pulse shadow-[0_0_50px_rgba(255,0,60,0.8)] backdrop-blur-sm">
                                <span className="text-4xl sm:text-6xl font-black text-neon-red drop-shadow-[0_0_20px_rgba(255,0,60,1)] tracking-widest whitespace-nowrap">
                                    WARNING {stats.warnings}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Particle System */}
                {explosionPhase === 'exploding' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ transformStyle: 'preserve-3d' }}>
                        {particles.map(p => (
                            <div 
                                key={p.id}
                                className="absolute rounded-full"
                                style={{
                                    width: `${p.size}px`,
                                    height: `${p.size}px`,
                                    backgroundColor: p.color,
                                    boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                                    transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px)`,
                                    opacity: 0,
                                    transition: `all 2s cubic-bezier(0.1, 0.8, 0.2, 1) ${p.delay}s`,
                                    // Initial state before transition applies
                                    ...(explosionPhase === 'exploding' ? {} : { transform: 'translate3d(0,0,0)', opacity: 1 })
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Force particles to start at center then fly out by using a tiny timeout trick, 
    // but CSS transitions handle it well if we set initial state in a wrapper or rely on the mount.
    // To ensure particles fly from center, we inject a style tag dynamically for the animation.
    const renderParticleStyles = () => {
        if (explosionPhase !== 'exploding') return null;
        return (
            <style>
                {particles.map(p => `
                    @keyframes fly-${p.id} {
                        0% { transform: translate3d(0,0,0) scale(1); opacity: 1; }
                        10% { opacity: 1; }
                        100% { transform: translate3d(${p.x}px, ${p.y}px, ${p.z}px) scale(0); opacity: 0; }
                    }
                    .particle-${p.id} {
                        animation: fly-${p.id} 2s cubic-bezier(0.05, 0.9, 0.1, 1) ${p.delay}s forwards;
                    }
                `).join('\n')}
            </style>
        );
    };

    // Determine main wrapper classes
    let wrapperClasses = "min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden";
    if (explosionPhase === 'imploding') wrapperClasses += " animate-epic-shake"; // Shake the whole screen during implosion

    return (
        <div className={wrapperClasses}>
            {renderParticleStyles()}

            {/* Full Screen Flash Overlay */}
            {explosionPhase === 'exploding' && (
                <div className="absolute inset-0 z-50 pointer-events-none animate-screen-flash"></div>
            )}

            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30"></div>
            </div>

            <div className="z-10 w-full max-w-2xl flex flex-col items-center">
                
                {/* Header / HUD */}
                <div className="w-full grid grid-cols-3 items-center mb-8 px-4 sm:px-8">
                    <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-400 tracking-widest uppercase">Score</span>
                        <span className="text-2xl sm:text-4xl font-bold text-neon-cyan font-mono tracking-wider drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">
                            {stats.score.toString().padStart(6, '0')}
                        </span>
                    </div>

                    <div className="flex justify-center relative">
                        {gameState === 'playing' && (
                            <button
                                onClick={() => {
                                    clearTimeouts();
                                    setGameState('menu');
                                    setBoardCols(3);
                                    setBoardRows(3);
                                    setCustomColsInput('');
                                    setCustomRowsInput('');
                                }}
                                className="flex items-center justify-center text-gray-500 hover:text-neon-cyan transition-colors duration-200 group"
                                title="Return to Menu"
                            >
                                <Home size={28} className="group-hover:drop-shadow-[0_0_8px_rgba(0,243,255,0.8)] transition-all" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-400 tracking-widest uppercase">Level</span>
                        <span className="text-2xl sm:text-4xl font-bold text-neon-pink font-mono tracking-wider drop-shadow-[0_0_8px_rgba(255,0,255,0.5)]">
                            {stats.level.toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Main Game Area */}
                <div className="relative w-full flex flex-col items-center justify-center min-h-[400px]">
                    
                    {/* Status Message Overlay */}
                    <div className="absolute top-[-40px] left-0 right-0 flex justify-center h-8 z-20">
                        <span className={`text-lg sm:text-xl font-bold tracking-[0.2em] uppercase transition-opacity duration-300 ${message ? 'opacity-100' : 'opacity-0'} ${phase === 'showing' ? 'text-neon-cyan' : phase === 'input' ? 'text-white' : phase === 'result' && wrongTile !== null ? 'text-neon-red' : 'text-neon-green'} ${explosionPhase !== 'none' ? 'text-neon-red animate-pulse drop-shadow-[0_0_10px_rgba(255,0,0,1)] scale-125' : ''}`}>
                            {message}
                        </span>
                    </div>

                    {gameState === 'menu' && (
                        <div className="flex flex-col items-center bg-neon-panel/80 p-8 rounded-2xl border border-gray-700 backdrop-blur-md shadow-2xl text-center w-full max-w-md">
                            <Zap size={48} className="text-neon-cyan mb-4 drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                            <h1 className="text-4xl sm:text-5xl font-black mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-pink">
                                PreZento Matrix
                            </h1>
                            <p className="text-gray-400 mb-8 max-w-xs">
                                Memorize and repeat the pattern.
                            </p>

                            {/* Board Size Selector */}
                            <div className="mb-8 w-full">
                                <div className="flex flex-wrap gap-3 justify-center items-center">
                                    {[2, 3, 4, 5].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                setBoardCols(size);
                                                setBoardRows(size);
                                                setCustomColsInput('');
                                                setCustomRowsInput('');
                                            }}
                                            className={`px-4 py-2 rounded border transition-all duration-200 ${
                                                boardCols === size && boardRows === size && customColsInput === '' && customRowsInput === ''
                                                ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan font-bold shadow-[0_0_10px_rgba(0,243,255,0.3)]' 
                                                : 'bg-transparent text-gray-400 border-gray-600 hover:border-neon-cyan/50 hover:text-neon-cyan/80'
                                            }`}
                                        >
                                            {size}x{size}
                                        </button>
                                    ))}
                                    
                                    {/* Custom N x M Input */}
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded border transition-all duration-200 ${
                                        (customColsInput !== '' || customRowsInput !== '')
                                        ? 'bg-neon-cyan/20 border-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                                        : 'bg-transparent border-gray-600 hover:border-neon-cyan/50'
                                    }`}>
                                        <input
                                            type="number"
                                            min="1"
                                            max="15"
                                            placeholder="W"
                                            value={customColsInput}
                                            onChange={(e) => {
                                                setCustomColsInput(e.target.value);
                                                let val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) setBoardCols(Math.min(val, 15));
                                            }}
                                            className="w-10 bg-transparent text-center outline-none text-white font-bold placeholder-gray-500"
                                        />
                                        <span className="text-gray-400 font-bold">x</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="15"
                                            placeholder="H"
                                            value={customRowsInput}
                                            onChange={(e) => {
                                                setCustomRowsInput(e.target.value);
                                                let val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) setBoardRows(Math.min(val, 15));
                                            }}
                                            className="w-10 bg-transparent text-center outline-none text-white font-bold placeholder-gray-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={startGame}
                                className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-lg border-2 border-neon-cyan text-neon-cyan font-bold tracking-widest uppercase hover:text-white transition-colors duration-300 w-full flex justify-center"
                            >
                                <div className="absolute inset-0 bg-neon-cyan w-0 group-hover:w-full transition-all duration-300 ease-out -z-10"></div>
                                <span className="flex items-center gap-2">
                                    <Play size={20} /> Initialize Sequence
                                </span>
                            </button>
                        </div>
                    )}

                    {gameState === 'playing' && renderGrid()}

                    {gameState === 'gameover' && (
                        <div className="flex flex-col items-center bg-neon-panel/90 p-8 rounded-2xl border border-neon-red backdrop-blur-md shadow-neon-red text-center z-20 w-full max-w-md">
                            <AlertTriangle size={48} className="text-neon-red mb-4 animate-pulse" />
                            <h2 className="text-5xl sm:text-7xl font-black text-fire mb-6 tracking-widest uppercase">
                                LOSER
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-4 w-full mb-8 text-left">
                                <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
                                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Final Score</span>
                                    <span className="text-2xl font-mono text-white">{stats.score}</span>
                                </div>
                                <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
                                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Level Reached</span>
                                    <span className="text-2xl font-mono text-white">{stats.level}</span>
                                </div>
                                <div className="bg-black/50 p-4 rounded-lg border border-gray-800 col-span-2 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">Max Combo</span>
                                    <span className="text-xl font-mono text-neon-pink flex items-center gap-2">
                                        {stats.maxCombo}x <Trophy size={16} />
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    setGameState('menu');
                                    setBoardCols(3);
                                    setBoardRows(3);
                                    setCustomColsInput('');
                                    setCustomRowsInput('');
                                }}
                                className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-lg border-2 border-white text-white font-bold tracking-widest uppercase hover:text-black transition-colors duration-300 w-full flex justify-center"
                            >
                                <div className="absolute inset-0 bg-white w-0 group-hover:w-full transition-all duration-300 ease-out -z-10"></div>
                                <span className="flex items-center gap-2">
                                    <RotateCcw size={20} /> Main Menu
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
