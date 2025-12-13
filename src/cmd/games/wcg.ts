import { Ctx } from "../../lib/ctx";

type Challenge = { startsWith: string; length: number; answered: boolean };
type Player = { jid: string; name: string; correct: number; incorrect: number };

type DifficultyKey = "easy" | "normal" | "hard";

type GameState = {
  groupId: string;
  host: string;
  lobbyOpen: boolean;
  active: boolean;
  players: Player[];
  challenges: Challenge[];
  challengeIndex: number;
  turnIndex: number;
  waitingFor?: string;
  timer?: NodeJS.Timeout;
  mode: DifficultyKey;
};

const games = new Map<string, GameState>();

const LIMITS = {
  easy: { min: 3, max: 5 },
  normal: { min: 3, max: 7 },
  hard: { min: 5, max: 8 },
};

const CHALLENGE_COUNT = 20;
const MAX_PLAYERS = 10;
const TURN_TIMEOUT_MS = 30_000;

const getPlayerJid = (ctx: Ctx) => ctx.sender.jid;

const randomLetter = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet[Math.floor(Math.random() * alphabet.length)];
};

const randomLength = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateChallenges = (min: number, max: number): Challenge[] =>
  Array.from({ length: CHALLENGE_COUNT }, () => ({
    startsWith: randomLetter(),
    length: randomLength(min, max),
    answered: false,
  }));

let spellCheckerPromise: Promise<
  | {
      correct: (word: string) => boolean;
      suggest: (word: string) => string[];
    }
  | null
> | null = null;

async function getSpellChecker() {
  if (spellCheckerPromise) return spellCheckerPromise;
  spellCheckerPromise = (async () => {
    try {
      const dictionaryModule = await eval('import("dictionary-en")');
      const { aff, dic } = dictionaryModule.default;
      const nspell = (await import("nspell")).default;
      return nspell({ aff: aff as Buffer, dic: dic as Buffer });
    } catch (err) {
      console.warn("Spell checker unavailable; using basic validation.", err);
      return null;
    }
  })();
  return spellCheckerPromise;
}

async function validateWord(word: string, challenge: Challenge) {
  const trimmed = word.trim();
  if (!trimmed) return { ok: false, reason: "No word provided." };
  if (!trimmed.toLowerCase().startsWith(challenge.startsWith.toLowerCase())) {
    return { ok: false, reason: `Word must start with "${challenge.startsWith}".` };
  }
  if (trimmed.length < challenge.length) {
    return { ok: false, reason: `Word must be at least ${challenge.length} letters.` };
  }

  const spell = await getSpellChecker();
  if (!spell) return { ok: true };
  if (spell.correct(trimmed)) return { ok: true };

  const suggestion = spell
    .suggest(trimmed)
    .find((s) =>
      s.toLowerCase().startsWith(challenge.startsWith.toLowerCase()) &&
      s.length >= challenge.length
    );

  return { ok: false, reason: "Word not in dictionary.", suggestion };
}

const getGame = (groupId: string) => games.get(groupId) || null;

const ensureNoTimer = (game: GameState) => {
  if (game.timer) {
    clearTimeout(game.timer);
    game.timer = undefined;
  }
};

const endGame = async (ctx: Ctx, game: GameState, reason: string) => {
  ensureNoTimer(game);
  games.delete(game.groupId);

  const sorted = [...game.players].sort(
    (a, b) => b.correct - a.correct || a.incorrect - b.incorrect
  );
  const winner = sorted[0];

  await ctx.sock.sendMessage(game.groupId, {
    text:
      `${reason}\n\nWinner: ${winner.name} (✅ ${winner.correct} | ❌ ${winner.incorrect})\n\nScores:\n` +
      sorted
        .map((p, idx) => `${idx + 1}. ${p.name} — ✅ ${p.correct} | ❌ ${p.incorrect}`)
        .join("\n"),
  });
};

const nextTurn = async (ctx: Ctx, game: GameState) => {
  ensureNoTimer(game);

  if (game.challengeIndex >= game.challenges.length) {
    await endGame(ctx, game, "All challenges answered.");
    return;
  }

  const currentPlayer = game.players[game.turnIndex];
  const challenge = game.challenges[game.challengeIndex];

  game.waitingFor = currentPlayer.jid;

  const wordsLeft = game.challenges.filter((c) => !c.answered).length;
  const message = `
        🆎 Your word must start with *${challenge.startsWith}* and include at least *${challenge.length}* letters.
        ⏳ You have *30s* to answer.
        📝 Total words: ${game.challenges.length}.
        🧑‍💻 Player: *${currentPlayer.name}*.
        ❓ Words left to answer: ${wordsLeft}.
        ✅ Correct: ${currentPlayer.correct}.
        ❌ Incorrect: ${currentPlayer.incorrect}.
        Just type your word (no command needed).
        `;

  await ctx.sock.sendMessage(game.groupId, {
    text: message,
    mentions: [currentPlayer.jid],
  });

  game.timer = setTimeout(async () => {
    currentPlayer.incorrect += 1;
    await ctx.sock.sendMessage(game.groupId, {
      text: `⏰ Time's up for ${currentPlayer.name}. Moving to next turn.`,
      mentions: [currentPlayer.jid],
    });
    await advance(ctx, game);
  }, TURN_TIMEOUT_MS);
};

const advance = async (ctx: Ctx, game: GameState) => {
  ensureNoTimer(game);
  game.challenges[game.challengeIndex].answered = true;
  game.challengeIndex += 1;
  game.turnIndex = (game.turnIndex + 1) % game.players.length;
  await nextTurn(ctx, game);
};

const processAnswer = async (ctx: Ctx, game: GameState, word: string) => {
  const player = game.players[game.turnIndex];
  if (game.waitingFor !== ctx.sender.jid) return ctx.reply("Not your turn.");

  const challenge = game.challenges[game.challengeIndex];
  const result = await validateWord(word, challenge);

  ensureNoTimer(game);

  if (result.ok) {
    player.correct += 1;
    await ctx.reply(`✅ Correct! Score: ${player.correct}`);
  } else {
    player.incorrect += 1;
    const suggestion = result.suggestion ? ` Try: ${result.suggestion}` : "";
    await ctx.reply(`❌ ${result.reason}${suggestion}`);
  }

  if (player.correct >= 20) {
    await endGame(ctx, game, `${player.name} reached 20 correct answers!`);
    return;
  }

  await advance(ctx, game);
};

export const tryProcessWcgInline = async (ctx: Ctx, wordParts: string[]): Promise<boolean> => {
  if (!ctx.groupId) return false;

  const game = getGame(ctx.groupId);
  if (!game || !game.active) return false;
  if (game.waitingFor !== ctx.sender.jid) return false;

  const word = wordParts.join(" ").trim();
  if (!word) return false;

  await processAnswer(ctx, game, word);
  return true;
};

export const tryProcessWcgPassive = async (ctx: Ctx, text: string): Promise<boolean> => {
  if (!ctx.groupId) return false;
  const game = getGame(ctx.groupId);
  if (!game || !game.active) return false;
  if (game.waitingFor !== ctx.sender.jid) return false;

  const trimmed = text.trim();
  if (!trimmed) return false;

  await processAnswer(ctx, game, trimmed);
  return true;
};

const wcgCommand = {
  name: "wcg",
  category: "Games",
  code: async (ctx: Ctx) => {
    if (!ctx.groupId) return ctx.reply("Use this game in a group chat.");

    const sub = (ctx.args[0] || "").toLowerCase();
    const groupId = ctx.groupId;
    const me = getPlayerJid(ctx);

    let game = getGame(groupId);

    if (sub === "start") {
      if (game && game.active) return ctx.reply("A game is already running.");
      if (!game) {
        game = {
          groupId,
          host: me,
          lobbyOpen: true,
          active: false,
          players: [],
          challenges: [],
          challengeIndex: 0,
          turnIndex: 0,
          mode: "normal",
        };
        games.set(groupId, game);
      }
      game.host = me;
      game.lobbyOpen = true;
      game.active = false;
      game.players = [];
      return ctx.reply("Word Chain lobby opened. Join with !wcg join. Host begins with !wcg begin <easy|normal|hard>.");
    }

    if (!game) return ctx.reply("No Word Chain game here. Use !wcg start.");

    if (sub === "join") {
      if (!game.lobbyOpen) return ctx.reply("Lobby closed.");
      if (game.players.length >= MAX_PLAYERS) return ctx.reply("Lobby full.");
      if (game.players.some((p) => p.jid === me)) return ctx.reply("You already joined.");

      game.players.push({ jid: me, name: ctx.sender.pushName || "Player", correct: 0, incorrect: 0 });
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
      if (me !== game.host) return ctx.reply("Only the host can begin.");
      if (game.players.length < 2) return ctx.reply("Need at least 2 players.");

      const modeArg = (ctx.args[1] || "normal").toLowerCase();
      if (modeArg !== "easy" && modeArg !== "normal" && modeArg !== "hard") {
        return ctx.reply("Choose difficulty: easy, normal, or hard.");
      }

      const limits = LIMITS[modeArg as DifficultyKey];
      game.mode = modeArg as DifficultyKey;
      game.challenges = generateChallenges(limits.min, limits.max);
      game.challengeIndex = 0;
      game.turnIndex = 0;
      game.active = true;
      game.lobbyOpen = false;

      await ctx.reply(
        `Starting Word Chain in ${game.mode} mode with ${game.players.length} players. First to 20 correct answers or ${CHALLENGE_COUNT} rounds.`
      );

      await nextTurn(ctx, game);
      return;
    }

    const RESERVED = ["start", "join", "leave", "begin", "play", "status", "end", "stop"];

    if (sub === "play") {
      if (!game.active) return ctx.reply("Game not active.");
      const word = ctx.args.slice(1).join(" ");
      if (!word) return ctx.reply("Provide a word: !wcg play <word>");
      await processAnswer(ctx, game, word);
      return;
    }

    // Shorthand: !wcg <word>
    if (game.active && sub && !RESERVED.includes(sub)) {
      const word = [sub, ...ctx.args.slice(1)].join(" ");
      await processAnswer(ctx, game, word);
      return;
    }

    if (sub === "status") {
      const phase = game.active ? `Active (${game.mode})` : game.lobbyOpen ? "Lobby" : "Idle";
      return ctx.reply(
        `Phase: ${phase}\nHost: ${game.host === me ? "You" : game.players.find(p => p.jid === game.host)?.name || "Unknown"}\nPlayers:\n${game.players
          .map((p, idx) => `${idx + 1}. ${p.name} — ✅ ${p.correct} | ❌ ${p.incorrect}`)
          .join("\n") || "(none)"}`
      );
    }

    if (sub === "end" || sub === "stop") {
      if (me !== game.host) return ctx.reply("Only host can stop the game.");
      await endGame(ctx, game, "Game ended early.");
      return;
    }

    return ctx.reply(
      "Word Chain commands:\n" +
        "!wcg start\n" +
        "!wcg join/leave\n" +
        "!wcg begin <easy|normal|hard>\n" +
        "(during turn) just type your word\n" +
        "!wcg status\n" +
        "!wcg end"
    );
  },
};

export { wcgCommand as default };

// Ensure CommonJS consumers (compiled) get the command and helpers
if (typeof module !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (module as any).exports = wcgCommand;
  (module as any).exports.tryProcessWcgInline = tryProcessWcgInline;
  (module as any).exports.tryProcessWcgPassive = tryProcessWcgPassive;
}
