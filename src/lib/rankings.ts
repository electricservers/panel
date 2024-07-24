import type { Games, Player } from './game';

export function getPlayerGames(games: Games): PlayerGames[] {
    const playerStatsMap: { [steamId: string]: PlayerGames } = {};

    // Loop through each game result
    for (const result of games.results) {
        // Loop through each slot in the game
        for (const slot of result.slots) {
            const { steamId, name } = slot.player;
            const gameClass = slot.gameClass.toLowerCase();

            // Initialize player stats if not already present
            if (!playerStatsMap[steamId]) {
                playerStatsMap[steamId] = {
                    name,
                    steamid: steamId,
                    totalGames: 0,
                    scoutGames: 0,
                    demomanGames: 0,
                    soldierGames: 0,
                    medicGames: 0
                };
            }

            // Increment the total games played
            playerStatsMap[steamId].totalGames += 1;

            // Increment the game count for the specific class
            if (gameClass === 'scout') {
                playerStatsMap[steamId].scoutGames += 1;
            } else if (gameClass === 'demoman') {
                playerStatsMap[steamId].demomanGames += 1;
            } else if (gameClass === 'soldier') {
                playerStatsMap[steamId].soldierGames += 1;
            } else if (gameClass === 'medic') {
                playerStatsMap[steamId].medicGames += 1;
            }
        }
    }

    // Convert the playerStatsMap object into an array
    return Object.values(playerStatsMap);
}

export interface PlayerGames {
    name: string;
    steamid: string;
    totalGames: number;
    scoutGames: number;
    demomanGames: number;
    soldierGames: number;
    medicGames: number;
}
