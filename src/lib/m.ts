export const patterns = [
    'doubleTop', 'headAndShoulders', 'inverseHeadAndShoulders', 'tripleBottom', 
    'tripleTop', 'cupAndHandle', 'ascendingTriangle', 'descendingTriangle', 
    'symmetricalTriangle', 'flag', 'pennant', 'wedge', 'risingWedge', 
    'fallingWedge', 'bullishHarami', 'bearishHarami', 'doji', 'hammer', 
    'hangingMan', 'shootingStar', 'morningStar', 'eveningStar', 'insideBar', 
    'outsideBar', 'railroadTracks', 'spinningTop', 'marubozu', 'piercingLine', 
    'darkCloudCover', 'tweezerTops', 'tweezerBottoms', 'risingThreeMethods', 
    'fallingThreeMethods', 'engulfingCandle', 'gappingUp', 'gappingDown', 
    'priceActionReversal', 'priceActionContinuation', 'breakout', 'breakdown', 
    'supportBounce', 'resistanceRejection', 'priceChannel', 'movingAverageCrossover', 
    'bollingerBandSqueeze', 'rsiPattern', 'macdCrossover'
];

// Randomly select a pattern
export const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];

export const { movement, explanation } = (() => {
    switch (selectedPattern) {
        case 'bullishEngulfing':
            return { movement: 'bullish', explanation: 'A Bullish Engulfing pattern was detected.' };
        case 'bearishEngulfing':
            return { movement: 'bearish', explanation: 'A Bearish Engulfing pattern was detected.' };
        case 'doubleBottom':
            return { movement: 'bullish', explanation: 'A Double Bottom pattern was detected.' };
        case 'doubleTop':
            return { movement: 'bearish', explanation: 'A Double Top pattern was detected.' };
        case 'headAndShoulders':
            return { movement: 'bearish', explanation: 'A Head and Shoulders pattern was detected.' };
        case 'inverseHeadAndShoulders':
            return { movement: 'bullish', explanation: 'An Inverse Head and Shoulders pattern was detected.' };
        case 'hammer':
            return { movement: 'bullish', explanation: 'A Hammer pattern was detected.' };
        case 'hangingMan':
            return { movement: 'bearish', explanation: 'A Hanging Man pattern was detected.' };
        case 'doji':
            return { movement: 'neutral', explanation: 'A Doji pattern was detected, indicating indecision.' };
        case 'morningStar':
            return { movement: 'bullish', explanation: 'A Morning Star pattern was detected.' };
        case 'eveningStar':
            return { movement: 'bearish', explanation: 'An Evening Star pattern was detected.' };
        case 'risingThreeMethods':
            return { movement: 'bullish', explanation: 'A Rising Three Methods pattern was detected.' };
        case 'fallingThreeMethods':
            return { movement: 'bearish', explanation: 'A Falling Three Methods pattern was detected.' };
        case 'harami':
            return { movement: 'neutral', explanation: 'A Harami pattern was detected.' };
        case 'piercingLine':
            return { movement: 'bullish', explanation: 'A Piercing Line pattern was detected.' };
        case 'darkCloudCover':
            return { movement: 'bearish', explanation: 'A Dark Cloud Cover pattern was detected.' };
        case 'spinningTop':
            return { movement: 'neutral', explanation: 'A Spinning Top pattern was detected, indicating indecision.' };
        case 'marubozu':
            return { movement: 'bullish', explanation: 'A Marubozu pattern was detected.' };
        case 'shootingStar':
            return { movement: 'bearish', explanation: 'A Shooting Star pattern was detected.' };
        case 'invertedHammer':
            return { movement: 'bullish', explanation: 'An Inverted Hammer pattern was detected.' };
        case 'cupAndHandle':
            return { movement: 'bullish', explanation: 'A Cup and Handle pattern was detected.' };
        case 'ascendingTriangle':
            return { movement: 'bullish', explanation: 'An Ascending Triangle pattern was detected.' };
        case 'descendingTriangle':
            return { movement: 'bearish', explanation: 'A Descending Triangle pattern was detected.' };
        case 'symmetricalTriangle':
            return { movement: 'neutral', explanation: 'A Symmetrical Triangle pattern was detected.' };
        case 'flag':
            return { movement: 'bullish', explanation: 'A Flag pattern was detected.' };
        case 'pennant':
            return { movement: 'bullish', explanation: 'A Pennant pattern was detected.' };
        case 'wedge':
            return { movement: 'neutral', explanation: 'A Wedge pattern was detected.' };
        case 'risingWedge':
            return { movement: 'bearish', explanation: 'A Rising Wedge pattern was detected.' };
        case 'fallingWedge':
            return { movement: 'bullish', explanation: 'A Falling Wedge pattern was detected.' };
        case 'bullishHarami':
            return { movement: 'bullish', explanation: 'A Bullish Harami pattern was detected.' };
        case 'bearishHarami':
            return { movement: 'bearish', explanation: 'A Bearish Harami pattern was detected.' };
        case 'insideBar':
            return { movement: 'neutral', explanation: 'An Inside Bar pattern was detected.' };
        case 'outsideBar':
            return { movement: 'neutral', explanation: 'An Outside Bar pattern was detected.' };
        case 'railroadTracks':
            return { movement: 'bullish', explanation: 'A Railroad Tracks pattern was detected.' };
        case 'tweezerTops':
            return { movement: 'bearish', explanation: 'Tweezer Tops pattern was detected.' };
        case 'tweezerBottoms':
            return { movement: 'bullish', explanation: 'Tweezer Bottoms pattern was detected.' };
        case 'gappingUp':
            return { movement: 'bullish', explanation: 'A Gapping Up pattern was detected.' };
        case 'gappingDown':
            return { movement: 'bearish', explanation: 'A Gapping Down pattern was detected.' };
        case 'priceActionReversal':
            return { movement: 'reversal', explanation: 'A Price Action Reversal pattern was detected.' };
        case 'priceActionContinuation':
            return { movement: 'continuation', explanation: 'A Price Action Continuation pattern was detected.' };
        case 'breakout':
            return { movement: 'bullish', explanation: 'A Breakout pattern was detected.' };
        case 'breakdown':
            return { movement: 'bearish', explanation: 'A Breakdown pattern was detected.' };
        case 'supportBounce':
            return { movement: 'bullish', explanation: 'A Support Bounce pattern was detected.' };
        case 'resistanceRejection':
            return { movement: 'bearish', explanation: 'A Resistance Rejection pattern was detected.' };
        case 'priceChannel':
            return { movement: 'neutral', explanation: 'A Price Channel pattern was detected.' };
        case 'movingAverageCrossover':
            return { movement: 'neutral', explanation: 'A Moving Average Crossover pattern was detected.' };
        case 'bollingerBandSqueeze':
            return { movement: 'neutral', explanation: 'A Bollinger Band Squeeze pattern was detected.' };
        case 'rsiPattern':
            return { movement: 'neutral', explanation: 'An RSI pattern was detected.' };
        case 'macdCrossover':
            return { movement: 'neutral', explanation: 'A MACD Crossover pattern was detected.' };
        default:
            return { movement: 'neutral', explanation: 'No significant pattern detected.' };
    }
})();

// Define types for OHLC data and analysis result
export type OHLCData = [number, number, number, number, number]; // [timestamp, open, high, low, close]
export function generatePatternData(pattern: string): OHLCData[] {
    const data: OHLCData[] = [];
    let previousClose = Math.random() * (6600 - 6500) + 6500;

    // Generate more candles for context
    for (let i = 0; i < 15; i++) {
        const open = previousClose;
        const closeChange = (Math.random() - 0.5) * 20; // Random change
        const close = open + closeChange;
        const high = Math.max(open, close) + Math.random() * 10;
        const low = Math.min(open, close) - Math.random() * 10;
        const timestamp = Date.now() + i * 60000; // 1 minute intervals

        data.push([timestamp, open, high, low, close]);
        previousClose = close;
    }

    // Add the pattern candles
    switch (pattern) {
        case 'bullishEngulfing': {
            const open1 = previousClose;
            const close1 = open1 - Math.random() * 10;
            const high1 = open1;
            const low1 = close1 - Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 - Math.random() * 5;
            const close2 = open2 + Math.random() * 20;
            const high2 = close2 + Math.random() * 5;
            const low2 = open2;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'bearishEngulfing': {
            const open1 = previousClose;
            const close1 = open1 + Math.random() * 10;
            const high1 = close1 + Math.random() * 5;
            const low1 = open1;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 + Math.random() * 5;
            const close2 = open2 - Math.random() * 20;
            const high2 = open2;
            const low2 = close2 - Math.random() * 5;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'doubleBottom': {
            const low1 = previousClose - Math.random() * 10;
            const high1 = low1 + Math.random() * 20;
            data.push([Date.now(), low1 + 5, high1, low1, low1 + Math.random() * 10]);

            const low2 = low1 + Math.random() * 5;
            const high2 = low2 + Math.random() * 20;
            data.push([Date.now() + 60000, low2 + 5, high2, low2, low2 + Math.random() * 10]);

            break;
        }
        case 'doubleTop': {
            const high1 = previousClose + Math.random() * 10;
            const low1 = high1 - Math.random() * 20;
            data.push([Date.now(), high1 - 5, high1, low1, low1 + Math.random() * 10]);

            const high2 = high1 - Math.random() * 5;
            const low2 = high2 - Math.random() * 20;
            data.push([Date.now() + 60000, high2 - 5, high2, low2, low2 + Math.random() * 10]);

            break;
        }
        case 'headAndShoulders': {
            const shoulder1 = previousClose - Math.random() * 10;
            const head = shoulder1 - Math.random() * 20;
            const shoulder2 = shoulder1 + Math.random() * 10;
            data.push([Date.now(), shoulder1, shoulder1 + Math.random() * 10, shoulder1 - Math.random() * 5, shoulder1 + Math.random() * 5]);
            data.push([Date.now() + 60000, head, head + Math.random() * 10, head - Math.random() * 10, head + Math.random() * 5]);
            data.push([Date.now() + 120000, shoulder2, shoulder2 + Math.random() * 10, shoulder2 - Math.random() * 5, shoulder2]);

            break;
        }
        case 'inverseHeadAndShoulders': {
            const shoulder1 = previousClose + Math.random() * 10;
            const head = shoulder1 + Math.random() * 20;
            const shoulder2 = shoulder1 - Math.random() * 10;
            data.push([Date.now(), shoulder1, shoulder1 + Math.random() * 10, shoulder1 - Math.random() * 5, shoulder1 - Math.random() * 5]);
            data.push([Date.now() + 60000, head, head + Math.random() * 10, head - Math.random() * 10, head - Math.random() * 5]);
            data.push([Date.now() + 120000, shoulder2, shoulder2 + Math.random() * 10, shoulder2 - Math.random() * 5, shoulder2]);

            break;
        }
        case 'hammer': {
            const open = previousClose;
            const close = open + (Math.random() - 0.5) * 10;
            const high = open + (Math.random() * 5);
            const low = open - (Math.random() * 5);
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'hangingMan': {
            const open = previousClose;
            const close = open - (Math.random() - 0.5) * 10;
            const high = open + (Math.random() * 5);
            const low = close - (Math.random() * 5);
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'doji': {
            const open = previousClose;
            const close = open;
            const high = open + Math.random() * 5;
            const low = open - Math.random() * 5;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'morningStar': {
            const open1 = previousClose;
            const close1 = open1 - Math.random() * 10;
            const high1 = open1;
            const low1 = close1 - Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 + Math.random() * 5;
            const close2 = open2 + Math.random() * 5;
            const high2 = Math.max(open2, close2) + Math.random() * 5;
            const low2 = Math.min(open2, close2) - Math.random() * 5;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            const open3 = close2 + Math.random() * 5;
            const close3 = open3 + Math.random() * 10;
            const high3 = Math.max(open3, close3) + Math.random() * 5;
            const low3 = open3;
            data.push([Date.now() + 120000, open3, high3, low3, close3]);

            break;
        }
        case 'eveningStar': {
            const open1 = previousClose;
            const close1 = open1 + Math.random() * 10;
            const high1 = open1;
            const low1 = close1 + Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 - Math.random() * 5;
            const close2 = open2 - Math.random() * 5;
            const high2 = Math.max(open2, close2) + Math.random() * 5;
            const low2 = Math.min(open2, close2) - Math.random() * 5;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            const open3 = close2 - Math.random() * 5;
            const close3 = open3 - Math.random() * 10;
            const high3 = Math.max(open3, close3) + Math.random() * 5;
            const low3 = open3;
            data.push([Date.now() + 120000, open3, high3, low3, close3]);

            break;
        }
        case 'risingThreeMethods': {
            const open = previousClose;
            const close = open + Math.random() * 10;
            const high = close + Math.random() * 5;
            const low = open - Math.random() * 5;
            data.push([Date.now(), open, high, low, close]);

            for (let i = 1; i <= 3; i++) {
                const openN = open + (Math.random() - 0.5) * 5;
                const closeN = open + (Math.random() - 0.5) * 5;
                const highN = Math.max(openN, closeN) + Math.random() * 5;
                const lowN = Math.min(openN, closeN) - Math.random() * 5;
                data.push([Date.now() + i * 60000, openN, highN, lowN, closeN]);
            }

            data.push([Date.now() + 4 * 60000, close - Math.random() * 5, close + Math.random() * 10, close - Math.random() * 10, close]);

            break;
        }
        case 'fallingThreeMethods': {
            const open = previousClose;
            const close = open - Math.random() * 10;
            const high = open + Math.random() * 5;
            const low = close - Math.random() * 5;
            data.push([Date.now(), open, high, low, close]);

            for (let i = 1; i <= 3; i++) {
                const openN = open + (Math.random() - 0.5) * 5;
                const closeN = open + (Math.random() - 0.5) * 5;
                const highN = Math.max(openN, closeN) + Math.random() * 5;
                const lowN = Math.min(openN, closeN) - Math.random() * 5;
                data.push([Date.now() + i * 60000, openN, highN, lowN, closeN]);
            }

            data.push([Date.now() + 4 * 60000, close + Math.random() * 5, close + Math.random() * 10, close - Math.random() * 10, close]);

            break;
        
        }
        case 'tweezerTops': {
            const open1 = previousClose + Math.random() * 10;
            const close1 = open1;
            const high1 = open1;
            const low1 = open1 - Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = previousClose + Math.random() * 10;
            const close2 = open2;
            const high2 = open2;
            const low2 = open2 - Math.random() * 5;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'tweezerBottoms': {
            const open1 = previousClose - Math.random() * 10;
            const close1 = open1;
            const high1 = open1;
            const low1 = open1 + Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = previousClose - Math.random() * 10;
            const close2 = open2;
            const high2 = open2;
            const low2 = open2 + Math.random() * 5;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'harami': {
            const open1 = previousClose;
            const close1 = open1 - Math.random() * 10;
            const high1 = open1;
            const low1 = close1 - Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 + Math.random() * 5;
            const close2 = open2 + Math.random() * 5;
            const high2 = Math.max(open2, close2) + Math.random() * 5;
            const low2 = Math.min(open2, close2) - Math.random() * 5;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'piercingLine': {
            const open1 = previousClose;
            const close1 = open1 - Math.random() * 10;
            const high1 = open1;
            const low1 = close1 - Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 - Math.random() * 5;
            const close2 = open2 + (Math.random() * (open1 - close1));
            const high2 = open2 + Math.random() * 5;
            const low2 = Math.min(open2, close2);
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'darkCloudCover': {
            const open1 = previousClose;
            const close1 = open1 + Math.random() * 10;
            const high1 = open1;
            const low1 = close1 + Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 + Math.random() * 5;
            const close2 = open2 - (Math.random() * (close1 - open1));
            const high2 = Math.max(open2, close2);
            const low2 = open2;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'spinningTop': {
            const open = previousClose;
            const close = open + (Math.random() - 0.5) * 10;
            const high = Math.max(open, close) + Math.random() * 5;
            const low = Math.min(open, close) - Math.random() * 5;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
       
        case 'marubozu': {
            const open = previousClose;
            const close = open + (Math.random() - 0.5) * 20;
            const high = Math.max(open, close) + Math.random() * 10;
            const low = Math.min(open, close) - Math.random() * 10;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'shootingStar': {
            const open = previousClose + Math.random() * 5;
            const close = open - Math.random() * 10;
            const high = open + Math.random() * 10;
            const low = close - Math.random() * 5;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'invertedHammer': {
            const open = previousClose - Math.random() * 5;
            const close = open + Math.random() * 10;
            const high = open + Math.random() * 10;
            const low = open - Math.random() * 5;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'gappingUp': {
            const open1 = previousClose;
            const close1 = open1 + Math.random() * 10;
            const high1 = close1 + Math.random() * 5;
            const low1 = open1 - Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 + Math.random() * 5;
            const close2 = open2 + Math.random() * 10;
            const high2 = close2 + Math.random() * 5;
            const low2 = open2;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'gappingDown': {
            const open1 = previousClose;
            const close1 = open1 - Math.random() * 10;
            const high1 = open1 + Math.random() * 5;
            const low1 = close1 - Math.random() * 5;
            data.push([Date.now(), open1, high1, low1, close1]);

            const open2 = close1 - Math.random() * 5;
            const close2 = open2 - Math.random() * 10;
            const high2 = open2;
            const low2 = close2 - Math.random() * 5;
            data.push([Date.now() + 60000, open2, high2, low2, close2]);

            break;
        }
        case 'priceActionReversal': {
            const open = previousClose;
            const close = open + (Math.random() - 0.5) * 20;
            const high = Math.max(open, close) + Math.random() * 10;
            const low = Math.min(open, close) - Math.random() * 10;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'priceActionContinuation': {
            const open = previousClose;
            const close = open + (Math.random() - 0.5) * 15;
            const high = open + (Math.random() * 10);
            const low = open - (Math.random() * 10);
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'breakout': {
            const open = previousClose;
            const close = open + Math.random() * 15;
            const high = close + Math.random() * 10;
            const low = open - Math.random() * 5;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'breakdown': {
            const open = previousClose;
            const close = open - Math.random() * 15;
            const high = open + Math.random() * 5;
            const low = close - Math.random() * 10;
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'supportBounce': {
            const low = previousClose - Math.random() * 10;
            const high = low + Math.random() * 15;
            const open = low + (Math.random() * (high - low));
            const close = open + (Math.random() * (high - open));
            data.push([Date.now(), open, high, low, close]);

            break;
        }
        case 'resistanceRejection': {
            const high = previousClose + Math.random() * 10;
            const low = high - Math.random() * 15;
            const open = high - (Math.random() * (high - low));
            const close = open - (Math.random() * (open - low));
            data.push([Date.now(), open, high, low, close]);

            break;
        }}

    return data;
}