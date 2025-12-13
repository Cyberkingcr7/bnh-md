import { Ctx } from "../../lib/ctx";

type Role = "murderer" | "sheriff" | "doctor" | "citizen";
type Phase = "lobby" | "night" | "day" | "ended";

interface PlayerState {
  jid: string;      // ALWAYS @lid
  name: string;
  seat: number;
  role?: Role;
  alive: boolean;
}

interface GameState {
  groupId: string;
  host: string;
  phase: Phase;
  lobbyOpen: boolean;
  players: PlayerState[];
  votes: Record<string, string>;
  night: { kill?: string; save?: string };
  nightActions: Set<string>;
}

const games: Map<string, GameState> = new Map();
const playerToGroup: Map<string, string> = new Map();

const MIN_PLAYERS = 4;

// No normalize — LID only mode
const getPlayerJid = (ctx: Ctx) => ctx.sender.jid;

// Find game using LID only
const findGameByPlayer = (jid: string): GameState | null => {
  const mapped = playerToGroup.get(jid);
  if (mapped) return games.get(mapped) || null;

  // fallback scan
  for (const g of games.values()) {
    if (g.players.some((p) => p.jid === jid)) return g;
  }
  return null;
};

// Map player to group — LID only
const linkPlayerToGame = (jid: string, groupId: string) => {
  playerToGroup.set(jid, groupId);
};

// Remove mapping — LID only
const clearPlayerLinks = (jid: string) => {
  playerToGroup.delete(jid);
};

// helpers
const pickRoleDistribution = (count: number): Role[] => {
  const roles: Role[] = ["murderer", "sheriff", "doctor"];
  while (roles.length < count) roles.push("citizen");
  return roles.slice(0, count);
};

const shuffle = <T>(arr: T[]): T[] =>
  arr
    .map((v) => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ v }) => v);

const formatAliveList = (game: GameState) =>
  game.players
    .filter((p) => p.alive)
    .map((p) => `${p.seat}. ${p.name}`)
    .join("\n");

// Resolve target using ONLY seats or names — JIDs are already LID
const resolveTarget = (game: GameState, ctx: Ctx): PlayerState | null => {
  const mentioned = ctx.getMentioned?.()?.[0];
  const arg = ctx.args[1];
  const lowerArg = arg ? arg.toLowerCase() : "";

  let target: PlayerState | undefined;

  if (mentioned) {
    target = game.players.find((p) => p.jid === mentioned);
  }
  if (!target && arg && !isNaN(Number(arg))) {
    const seat = Number(arg);
    target = game.players.find((p) => p.seat === seat);
  }
  if (!target && lowerArg) {
    target = game.players.find((p) =>
      p.name.toLowerCase().includes(lowerArg)
    );
  }

  return target || null;
};

const sendDm = async (ctx: Ctx, jid: string, text: string) => {
  await ctx.sock.sendMessage(jid, { text });
};

const sendAliveList = (ctx: Ctx, game: GameState) =>
  sendDm(
    ctx,
    ctx.sender.jid,
    `Alive players:\n${formatAliveList(game)}`
  );

const checkWin = (game: GameState): "murderer" | "town" | null => {
  const alive = game.players.filter((p) => p.alive);
  const murderers = alive.filter((p) => p.role === "murderer").length;
  if (murderers === 0) return "town";
  if (murderers >= alive.length - murderers) return "murderer";
  return null;
};

const endGame = async (game: GameState, ctx: Ctx, reason: string) => {
  game.phase = "ended";
  game.lobbyOpen = false;

  game.players.forEach((p) => clearPlayerLinks(p.jid));

  const murderers = game.players
    .filter((p) => p.role === "murderer")
    .map((p) => p.name)
    .join(", ");

  await ctx.sock.sendMessage(game.groupId, {
    text: `${reason}\nMurderer(s): ${murderers}`,
  });

  games.delete(game.groupId);
};

// New helper: assign new host if current host dies/leaves
const assignNewHost = async (game: GameState, ctx: Ctx) => {
  const alivePlayers = game.players.filter(p => p.alive);
  if (alivePlayers.length === 0) return; // game over handled elsewhere
  if (alivePlayers.some(p => p.jid === game.host)) return; // host still alive

  // Assign first alive player as new host
  game.host = alivePlayers[0].jid;

  await ctx.sock.sendMessage(game.groupId, {
    text: `Host left/died. New host is ${alivePlayers[0].name}.`,
  });
};

const ensureGroupGame = (groupId: string): GameState | null => {
  return games.get(groupId) || null;
};

const startLobby = (groupId: string, host: string): GameState => {
  const game: GameState = {
    groupId,
    host,
    phase: "lobby",
    lobbyOpen: true,
    players: [],
    votes: {},
    night: {},
    nightActions: new Set(),
  };
  games.set(groupId, game);
  return game;
};

const startGame = async (game: GameState, ctx: Ctx) => {
  const roles = shuffle(pickRoleDistribution(game.players.length));

  game.players = shuffle(game.players).map((p, idx) => ({
    ...p,
    role: roles[idx],
    seat: idx + 1,
    alive: true,
  }));

  game.players.forEach((p) => linkPlayerToGame(p.jid, game.groupId));

  game.nightActions = new Set();

  for (const p of game.players) {
    const desc =
      p.role === "murderer"
        ? "You are the Murderer. DM !mafia kill <player> each night."
        : p.role === "sheriff"
        ? "You are the Sheriff. DM !mafia check <player> each night."
        : p.role === "doctor"
        ? "You are the Doctor. DM !mafia save <player> each night."
        : "You are a Citizen. Discuss and vote during the day.";

    await sendDm(ctx, p.jid, `Mafia role: ${p.role?.toUpperCase()}\n${desc}`);
  }

  game.phase = "night";
  game.lobbyOpen = false;

  await ctx.sock.sendMessage(game.groupId, {
    text:
      `Mafia started with ${game.players.length} players. Night begins.\n\nAlive players:\n${formatAliveList(
        game
      )}\n\nNight actions:\nMurderer: !mafia kill\nSheriff: !mafia check\nDoctor: !mafia save`,
  });
};

const resolveNight = async (game: GameState, ctx: Ctx) => {
  const killTarget = game.night.kill;
  const saveTarget = game.night.save;
  game.nightActions = new Set();
  game.night = {};

  let deathMsg = "No one was eliminated last night.";
  if (killTarget) {
    if (killTarget === saveTarget) {
      deathMsg = "Doctor saved the target. No one died.";
    } else {
      const victim = game.players.find((p) => p.jid === killTarget);
      if (victim && victim.alive) {
        victim.alive = false;
        deathMsg = `${victim.name} was killed.`;

        // Reassign host if victim was host
        await assignNewHost(game, ctx);
      }
    }
  }

  const win = checkWin(game);
  if (win) {
    await endGame(
      game,
      ctx,
      win === "town"
        ? `Town wins! ${deathMsg}`
        : `Murderer wins! ${deathMsg}`
    );
    return;
  }

  game.phase = "day";
  game.votes = {};

  await ctx.sock.sendMessage(game.groupId, {
    text: `${deathMsg}\n\nDay begins. Vote with !mafia vote <player>.\nAlive:\n${formatAliveList(
      game
    )}`,
  });
};

const resolveDay = async (game: GameState, ctx: Ctx) => {
  const tally: Record<string, number> = {};

  Object.entries(game.votes).forEach(([voter, target]) => {
    const voterAlive = game.players.find((p) => p.jid === voter)?.alive;
    if (!voterAlive) return;
    tally[target] = (tally[target] || 0) + 1;
  });

  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    await ctx.sock.sendMessage(game.groupId, {
      text: `No votes. No elimination.\nNight begins.`,
    });
    game.phase = "night";
    return;
  }

  const [topTarget, topVotes] = entries[0];
  const second = entries[1]?.[1] || 0;

  if (topVotes === second) {
    await ctx.sock.sendMessage(game.groupId, {
      text: `Vote tied. No elimination.\nNight begins.`,
    });
    game.phase = "night";
    return;
  }

  const victim = game.players.find((p) => p.jid === topTarget);
  if (victim) victim.alive = false;

  // Reassign host if victim was host
  await assignNewHost(game, ctx);

  const win = checkWin(game);
  if (win) {
    await endGame(
      game,
      ctx,
      win === "town"
        ? `Town wins! ${victim?.name} was eliminated.`
        : `Murderer wins! ${victim?.name} was eliminated.`
    );
    return;
  }

  game.phase = "night";
  game.votes = {};
  game.nightActions = new Set();

  await ctx.sock.sendMessage(game.groupId, {
    text: `${victim?.name} was eliminated.\nNight begins.\nAlive:\n${formatAliveList(
      game
    )}`,
  });
};

const maybeResolveNight = async (game: GameState, ctx: Ctx) => {
  if (game.phase !== "night") return;

  const actors = game.players.filter(
    (p) =>
      p.alive &&
      (p.role === "murderer" || p.role === "doctor" || p.role === "sheriff")
  );

  const allDone = actors.every((p) => game.nightActions.has(p.jid));
  if (allDone) await resolveNight(game, ctx);
};

module.exports = {
  name: "mafia",
  category: "Games",
  code: async (ctx: Ctx) => {
    const sub = (ctx.args[0] || "").toLowerCase();

    // --- DM MODE (Night actions) ---
    if (!ctx.isGroup) {
      const playerJid = getPlayerJid(ctx); // already @lid
      const game = findGameByPlayer(playerJid);

      if (!game) return ctx.reply("You are not in an active Mafia game.");
      if (game.phase !== "night")
        return ctx.reply("No night actions available now.");

      const me = game.players.find(
        (p) => p.jid === playerJid && p.alive
      );
      if (!me) return ctx.reply("You are not alive.");

      if (
        ["kill", "save", "check"].includes(sub) &&
        game.nightActions.has(me.jid)
      ) {
        return ctx.reply("You already used your action tonight.");
      }

      if (sub === "kill" && me.role === "murderer") {
        const target = resolveTarget(game, ctx);
        if (!target) {
          await sendAliveList(ctx, game);
          return ctx.reply("Select a valid target.");
        }
        if (!target.alive) return ctx.reply("Target is dead.");
        if (target.jid === me.jid)
          return ctx.reply("You cannot kill yourself.");

        game.night.kill = target.jid;
        game.nightActions.add(me.jid);

        await ctx.reply(`Kill locked on ${target.name}.`);
        await maybeResolveNight(game, ctx);
        return;
      }

      if (sub === "save" && me.role === "doctor") {
        const target = resolveTarget(game, ctx) || me;

        if (!target.alive) return ctx.reply("Target is dead.");

        game.night.save = target.jid;
        game.nightActions.add(me.jid);

        await ctx.reply(`Save locked on ${target.name}.`);
        await maybeResolveNight(game, ctx);
        return;
      }

      if (sub === "check" && me.role === "sheriff") {
        const target = resolveTarget(game, ctx);
        if (!target) {
          await sendAliveList(ctx, game);
          return ctx.reply("Select a valid target.");
        }
        if (!target.alive) return ctx.reply("Target is dead.");

        game.nightActions.add(me.jid);

        await ctx.reply(
          `${target.name} is ${
            target.role === "murderer"
              ? "the Murderer"
              : "not the Murderer"
          }.`
        );

        await maybeResolveNight(game, ctx);
        return;
      }

      return ctx.reply("Invalid or unavailable night action.");
    }

    // --- GROUP MODE ---
    if (!ctx.groupId)
      return ctx.reply("Mafia must be used in a group.");
    const groupId = ctx.groupId;

    let game = ensureGroupGame(groupId);
    const myJid = ctx.sender.jid; // already @lid

    if (sub === "start") {
      if (game && game.phase !== "ended")
        return ctx.reply("A game is already running.");
      game = startLobby(groupId, myJid);
      return ctx.reply(
        "Mafia lobby opened. Join with !mafia join. Host begins with !mafia begin."
      );
    }

    if (!game)
      return ctx.reply("No Mafia game here. Use !mafia start.");

    if (sub === "join") {
      if (!game.lobbyOpen)
        return ctx.reply("Lobby closed.");
      if (game.players.some((p) => p.jid === myJid))
        return ctx.reply("You already joined.");

      game.players.push({
        jid: myJid,
        name: ctx.sender.pushName || "Player",
        seat: game.players.length + 1,
        alive: true,
      });

      linkPlayerToGame(myJid, game.groupId);
      return ctx.reply(
        `Joined lobby (${game.players.length} players).`
      );
    }

    if (sub === "leave") {
      if (!game.lobbyOpen)
        return ctx.reply("Game already started.");

      game.players = game.players.filter((p) => p.jid !== myJid);
      clearPlayerLinks(myJid);

      // Reassign host if leaving player was host
      await assignNewHost(game, ctx);

      return ctx.reply("You left the lobby.");
    }

    if (sub === "begin") {
      if (!game.lobbyOpen)
        return ctx.reply("Game already started.");
      if (myJid !== game.host)
        return ctx.reply("Only the host can start.");
      if (game.players.length < MIN_PLAYERS)
        return ctx.reply(`Need at least ${MIN_PLAYERS} players.`);

      await startGame(game, ctx);
      return;
    }

    if (sub === "status") {
      return ctx.reply(
        `Phase: ${game.phase}\nHost: ${game.players.find(p => p.jid === game.host)?.name}\n\n${game.players
          .map(
            (p) =>
              `${p.seat}. ${p.name} ${p.alive ? "✅" : "❌"}`
          )
          .join("\n")}`
      );
    }

    if (sub === "vote") {
      if (game.phase !== "day")
        return ctx.reply("You can only vote during the day.");

      const voter = game.players.find(
        (p) => p.jid === myJid && p.alive
      );
      if (!voter) return ctx.reply("You are not alive.");

      const target = resolveTarget(game, ctx);
      if (!target) return ctx.reply("Invalid target.");
      if (!target.alive) return ctx.reply("Target is dead.");

      game.votes[voter.jid] = target.jid;
      return ctx.reply(`Vote recorded for ${target.name}.`);
    }

    if (sub === "next") {
      if (game.phase === "night")
        return await resolveNight(game, ctx);
      if (game.phase === "day")
        return await resolveDay(game, ctx);

      return ctx.reply("Game is not active.");
    }

    if (sub === "stop") {
      if (myJid !== game.host)
        return ctx.reply("Only host can stop.");
      await endGame(game, ctx, "Game stopped by host.");
      return;
    }

    return ctx.reply(
      "Mafia commands:\n" +
        "!mafia start\n" +
        "!mafia join/leave\n" +
        "!mafia begin\n" +
        "!mafia status\n" +
        "!mafia vote\n" +
        "!mafia next\n" +
        "!mafia stop\n" +
        "\nNight (DM): kill/check/save"
    );
  },
};
