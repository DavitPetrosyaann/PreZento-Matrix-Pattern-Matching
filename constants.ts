import { LevelConfig } from './types';

export const BASE_SCORE = 100;

// Function to determine max warnings based on board dimensions
export const getMaxWarnings = (cols: number, rows: number): number => {
    return Math.max(cols, rows); // e.g., 2x2 -> 2, 3x3 -> 3, 4x5 -> 5
};

// Function to generate level configurations dynamically based on selected board size
export const getLevelConfig = (level: number, cols: number, rows: number): LevelConfig => {
    const totalTiles = cols * rows;
    
    // Pattern length increases steadily but cannot exceed total tiles
    const basePatternLength = Math.max(2, Math.floor(Math.min(cols, rows) / 2) + 1);
    const patternLength = Math.min(totalTiles, basePatternLength + Math.floor((level - 1) / 1.5));
    
    // Show duration decreases slightly as level goes up, but has a minimum
    const baseDuration = 1500;
    const showDurationMs = Math.max(600, baseDuration - (level * 100));

    return {
        gridCols: cols,
        gridRows: rows,
        patternLength,
        showDurationMs
    };
};
