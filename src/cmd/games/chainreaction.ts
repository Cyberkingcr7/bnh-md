import { Ctx } from "../../lib/ctx";
import Jimp = require("jimp");

type Cell = { owner: string | null; count: number };

type Player = { jid: string; name: string; color: string };

type GameState = {
  groupId: string;
  host: string;
  lobbyOpen: boolean;
  active: boolean;
  width: number;
  height: number;
  players: Player[];
  current: number;
  board: Cell[][];
  moveCount: number;
  eliminated: Set<string>;
};

const games = new Map<string, GameState>();

const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#95a5a6"];
const MAX_PLAYERS = COLORS.length;

const cellCapacity = (x: number, y: number, w: number, h: number) => {
  const isCorner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
  return isCorner ? 1 : 2; // explode on 2 at corners, 3 elsewhere
};

const createBoard = (width: number, height: number): Cell[][] =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => ({ owner: null, count: 0 })));

const initGame = (groupId: string, host: string, width = 6, height = 8): GameState => ({
  groupId,
  host,
  lobbyOpen: true,
  active: false,
  width,
  height,
  players: [],
  current: 0,
  board: createBoard(width, height),
  moveCount: 0,
  eliminated: new Set<string>(),
});

const renderBoard = async (game: GameState): Promise<Buffer> => {
  const cellSize = 80;
  const pad = 20;
  const w = game.width * cellSize + pad * 2;
  const h = game.height * cellSize + pad * 2;

  const img = new Jimp(w, h, 0x111820ff);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

  for (let y = 0; y < game.height; y++) {
    for (let x = 0; x < game.width; x++) {
      const cell = game.board[y][x];
      const x0 = pad + x * cellSize;
      const y0 = pad + y * cellSize;

      img.scan(x0, y0, cellSize, cellSize, function (px, py, idx) {
        // border shading
        const border = 2;
        const inBorder = px - x0 < border || py - y0 < border || x0 + cellSize - px <= border || y0 + cellSize - py <= border;
        const color = inBorder ? 0x444444ff : 0x1f2836ff;
        this.bitmap.data.writeUInt32BE(color, idx);
      });

      if (cell.owner) {
        const player = game.players.find((p) => p.jid === cell.owner);
        const clr = player?.color || "#ffffff";
        const circleRadius = 14;
        for (let i = 0; i < cell.count; i++) {
          const offsetX = x0 + cellSize / 2 + (i - (cell.count - 1) / 2) * (circleRadius * 1.5);
          const offsetY = y0 + cellSize / 2;
          img.scan(
            offsetX - circleRadius,
            offsetY - circleRadius,
            circleRadius * 2,
            circleRadius * 2,
            function (px, py, idx) {
              const dx = px - offsetX;
              const dy = py - offsetY;
              if (dx * dx + dy * dy <= circleRadius * circleRadius) {
                this.bitmap.data.writeUInt32BE(Jimp.cssColorToHex(clr), idx);
              }
            }
          );
        }
      }

      const idxNumber = y * game.width + x + 1;
      img.print(font, x0 + 6, y0 + 6, `${idxNumber}`); // tiny cell index for !cr move
    }
  }

  return await img.getBufferAsync(Jimp.MIME_PNG);
};

const getGame = (groupId: string) => games.get(groupId) || null;

const neighbors = (x: number, y: number, w: number, h: number) => {
  const list: [number, number][] = [];
  if (x > 0) list.push([x - 1, y]);
  if (x < w - 1) list.push([x + 1, y]);
  if (y > 0) list.push([x, y - 1]);
  if (y < h - 1) list.push([x, y + 1]);
  return list;
};

const explode = (game: GameState, x: number, y: number, owner: string) => {
  const cap = cellCapacity(x, y, game.width, game.height);
  const queue: [number, number, string][] = [[x, y, owner]];

  while (queue.length) {
    const [cx, cy, currentOwner] = queue.shift()!;
    const cell = game.board[cy][cx];
    cell.count += 1;
    cell.owner = currentOwner;

    const capNow = cellCapacity(cx, cy, game.width, game.height);
    if (cell.count > capNow) {
      cell.count -= capNow + 1;
      if (cell.count < 0) cell.count = 0;
      if (cell.count === 0) cell.owner = null;
      for (const [nx, ny] of neighbors(cx, cy, game.width, game.height)) {
        queue.push([nx, ny, currentOwner]);
      }
    }
  }
};

const alivePlayers = (game: GameState) => {
  const owners = new Set<string>();
  for (const row of game.board) {
    for (const cell of row) if (cell.owner) owners.add(cell.owner);
  }
  return game.players.filter((p) => owners.has(p.jid));
};

const hasOrbs = (game: GameState, jid: string) => {
  for (const row of game.board) {
    for (const cell of row) if (cell.owner === jid) return true;
  }
  return false;
};

const updateEliminations = (game: GameState) => {
  if (game.moveCount < game.players.length) return; // no eliminations before everyone played once
  for (const p of game.players) {
    if (!hasOrbs(game, p.jid)) {
      game.eliminated.add(p.jid);
    }
  }
};

const checkWin = (game: GameState): Player | null => {
  const active = game.players.filter((p) => !game.eliminated.has(p.jid));
  if (active.length !== 1) return null;
  const sole = active[0];
  return hasOrbs(game, sole.jid) ? sole : null;
};

const nextPlayer = (game: GameState) => {
  for (let i = 0; i < game.players.length; i++) {
    game.current = (game.current + 1) % game.players.length;
    const p = game.players[game.current];
    if (!game.eliminated.has(p.jid)) return;
  }
};

const placeOrb = async (ctx: Ctx, game: GameState, player: Player, x: number, y: number) => {
  if (x < 0 || x >= game.width || y < 0 || y >= game.height) return ctx.reply("Invalid cell.");
  const cell = game.board[y][x];
  if (cell.owner && cell.owner !== player.jid) return ctx.reply("You cannot place on another player.");

  explode(game, x, y, player.jid);
  game.moveCount += 1;

  updateEliminations(game);

  const winner = checkWin(game);
  const img = await renderBoard(game);

  if (winner) {
    games.delete(game.groupId);
    await ctx.reply({ image: img, caption: `🎉 ${winner.name} wins!` });
    return;
  }

  nextPlayer(game);
  const next = game.players[game.current];
  await ctx.reply({
    image: img,
    caption: `Placed at (${x + 1},${y + 1}) by ${player.name}. Next: ${next.name}. Use !cr move <n> or !cr x y.`,
  });
};

const startTurnInfo = (game: GameState) => {
  const p = game.players[game.current];
  return `Turn: ${p.name}. Place with !cr x y or !cr move <n>`;
};

const ensureGame = (groupId: string) => games.get(groupId) || null;

const chainReactionCommand = {
  name: "cr",
  category: "Games",
  code: async (ctx: Ctx) => {
    if (!ctx.groupId) return ctx.reply("Play Chain Reaction in a group.");

    const sub = (ctx.args[0] || "").toLowerCase();
    const groupId = ctx.groupId;
    const me = ctx.sender.jid;

    let game = ensureGame(groupId);

    if (sub === "start") {
      if (game && game.active) return ctx.reply("A game is already running.");
      game = initGame(groupId, me);
      games.set(groupId, game);
      return ctx.reply("Chain Reaction lobby opened. Join with !cr join. Host begins with !cr begin.");
    }

    if (!game) return ctx.reply("No Chain Reaction game here. Use !cr start.");

    if (sub === "join") {
      if (!game.lobbyOpen) return ctx.reply("Lobby closed.");
      if (game.players.length >= MAX_PLAYERS) return ctx.reply("Lobby full.");
      if (game.players.some((p) => p.jid === me)) return ctx.reply("You already joined.");

      const color = COLORS[game.players.length % COLORS.length];
      game.players.push({ jid: me, name: ctx.sender.pushName || "Player", color });
      return ctx.reply(`Joined lobby (${game.players.length}/${MAX_PLAYERS}).`);
    }

    if (sub === "leave") {
      if (!game.lobbyOpen) return ctx.reply("Game already started.");
      game.players = game.players.filter((p) => p.jid !== me);
      if (game.host === me) {
        const nextHost = game.players[0]?.jid;
        if (nextHost) game.host = nextHost;
      }
      return ctx.reply("You left the lobby.");
    }

    if (sub === "begin") {
      if (!game.lobbyOpen) return ctx.reply("Game already started.");
      if (me !== game.host) return ctx.reply("Only host can begin.");
      if (game.players.length < 2) return ctx.reply("Need at least 2 players.");

      game.active = true;
      game.lobbyOpen = false;
      game.current = 0;
      game.board = createBoard(game.width, game.height);

      const img = await renderBoard(game);
      return ctx.reply({ image: img, caption: `Chain Reaction started. ${startTurnInfo(game)}` });
    }

    if (!game.active) return ctx.reply("Game not active. Host must !cr begin.");

    if (sub === "end" || sub === "stop") {
      if (me !== game.host) return ctx.reply("Only host can end.");
      games.delete(groupId);
      return ctx.reply("Game ended.");
    }

    if (sub === "status") {
      const img = await renderBoard(game);
      return ctx.reply({ image: img, caption: startTurnInfo(game) });
    }

    // move: !cr move n  OR !cr x y
    if (sub === "move") {
      const idx = Number(ctx.args[1] || "");
      if (isNaN(idx) || idx < 1 || idx > game.width * game.height) {
        return ctx.reply(`Provide a valid cell 1-${game.width * game.height}: !cr move <n>.`);
      }
      if (game.players[game.current]?.jid !== me) return ctx.reply("Not your turn.");
      const zero = idx - 1;
      const xArg = zero % game.width;
      const yArg = Math.floor(zero / game.width);
      await placeOrb(ctx, game, game.players[game.current], xArg, yArg);
      return;
    }

    if (!sub || isNaN(Number(sub))) return ctx.reply("Place with !cr x y or !cr move <n> (1-indexed).");

    if (game.players[game.current]?.jid !== me) return ctx.reply("Not your turn.");

    const xArg = Number(sub) - 1;
    const yArg = Number(ctx.args[1] || "") - 1;
    if (isNaN(xArg) || isNaN(yArg)) return ctx.reply("Provide coordinates: !cr x y (1-indexed).");

    await placeOrb(ctx, game, game.players[game.current], xArg, yArg);
  },
};

export { chainReactionCommand as default };

// For CommonJS consumers (compiled output)
if (typeof module !== "undefined") {
  (module as any).exports = chainReactionCommand;
}
