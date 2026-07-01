export type GameState = 'menu' | 'playing' | 'gameover';
export type GamePhase = 'idle' | 'showing' | 'input' | 'result';

export interface LevelConfig {
    gridCols: number;
    gridRows: number;
    patternLength: number;
    showDurationMs: number;
}

export interface GameStats {
    score: number;
    level: number;
    warnings: number;
    maxCombo: number;
}
