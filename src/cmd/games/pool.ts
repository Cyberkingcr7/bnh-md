import { Ctx } from "../../lib/ctx";
import Jimp from "jimp";

type BallType = "cue" | "solid" | "stripe" | "eight";

type Ball = {
  id: number;
  type: BallType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pocketed: boolean;
  color: string;
  label: string;
};

type Player = {
  jid: string;
  name: string;
  set?: Exclude<BallType, "cue" | "eight">;
};

type GameState = {
  chatId: string;
  host: string;
  started: boolean;
  current: number;
  players: Player[];
  balls: Ball[];
};

const TABLE_W = 900;
const TABLE_H = 450;
const BALL_R = 12;
const POCKET_R = 26;
const STEP = 0.016;
const MAX_STEPS = 850;
const FRICTION = 0.992;
const RESTITUTION = 0.98;
const STOP_SPEED2 = 2.5;

const games = new Map<string, GameState>();

const BALL_COLORS: Record<number, string> = {
  0: "#ffffff",
  1: "#f5c400",
  2: "#0033a0",
  3: "#c20f1f",
  4: "#5c0fc2",
  5: "#f66900",
  6: "#007a3d",
  7: "#7c3f20",
  8: "#111111",
  9: "#f5c400",
  10: "#0033a0",
  11: "#c20f1f",
  12: "#5c0fc2",
  13: "#f66900",
  14: "#007a3d",
  15: "#7c3f20",
};

const numberRackOrder = [1, 10, 2, 13, 3, 12, 8, 11, 4, 15, 5, 14, 6, 9, 7];

const pockets: { x: number; y: number }[] = [
  { x: BALL_R + 4, y: BALL_R + 4 },
  { x: TABLE_W / 2, y: BALL_R + 2 },
  { x: TABLE_W - BALL_R - 4, y: BALL_R + 4 },
  { x: BALL_R + 4, y: TABLE_H - BALL_R - 4 },
  { x: TABLE_W / 2, y: TABLE_H - BALL_R - 2 },
  { x: TABLE_W - BALL_R - 4, y: TABLE_H - BALL_R - 4 },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const ballTypeFromNumber = (n: number): BallType => n === 0 ? "cue" : n === 8 ? "eight" : n <= 7 ? "solid" : "stripe";

const createBalls = (): Ball[] => {
  const balls: Ball[] = [];
  const spacing = BALL_R * 2 + 1;
  const rackX = TABLE_W * 0.72;
  const rackY = TABLE_H / 2;
  let idx = 0;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const n = numberRackOrder[idx++];
      const x = rackX + row * spacing;
      const y = rackY + (col - row / 2) * spacing;
      balls.push({
        id: n,
        type: ballTypeFromNumber(n),
        x, y, vx: 0, vy: 0,
        pocketed: false,
        color: BALL_COLORS[n],
        label: `${n}`,
      });
    }
  }

  const cueX = TABLE_W * 0.24;
  const cueY = TABLE_H / 2;
  balls.push({
    id: 0,
    type: "cue",
    x: cueX,
    y: cueY,
    vx: 0,
    vy: 0,
    pocketed: false,
    color: BALL_COLORS[0],
    label: "C",
  });

  return balls;
};

const drawCircle = (img: Jimp, cx: number, cy: number, r: number, color: string) => {
  const hex = Jimp.cssColorToHex(color);
  const x0 = Math.floor(cx - r);
  const y0 = Math.floor(cy - r);
  const d = Math.floor(r * 2);
  img.scan(x0, y0, d, d, function (x, y, idx) {
    const dx = x - cx + 0.5;
    const dy = y - cy + 0.5;
    if (dx * dx + dy * dy <= r * r) {
      this.bitmap.data.writeUInt32BE(hex, idx);
    }
  });
};

const renderTable = async (game: GameState, caption?: string): Promise<Buffer> => {
  const pad = 60;
  const img = new Jimp(TABLE_W + pad * 2, TABLE_H + pad * 2, "#0b3d2b");
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  const tableX = pad, tableY = pad;

  const felt = new Jimp(TABLE_W, TABLE_H, "#156d47");
  img.composite(felt, tableX, tableY);

  const cushion = new Jimp(TABLE_W + 8, TABLE_H + 8, "#0a2d20");
  img.composite(cushion, tableX - 4, tableY - 4);

  // Safe fillRect to avoid out-of-range errors
  const safeFillRect = (dest: Jimp, x: number, y: number, w: number, h: number, color: string) => {
    const ix = Math.max(0, Math.min(dest.bitmap.width - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(dest.bitmap.height - 1, Math.floor(y)));
    const iw = Math.min(dest.bitmap.width - ix, Math.floor(w));
    const ih = Math.min(dest.bitmap.height - iy, Math.floor(h));
    if (iw <= 0 || ih <= 0) return;
    const hex = Jimp.cssColorToHex(color);
    dest.scan(ix, iy, iw, ih, function (_sx, _sy, idx) {
      this.bitmap.data.writeUInt32BE(hex, idx);
    });
  };

  // Circular degree ruler
  const centerX = tableX + TABLE_W / 2;
  const centerY = tableY + TABLE_H / 2;
  const radius = Math.min(TABLE_W, TABLE_H) / 2 + 25; // safe radius within image

  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const tickLength = deg % 30 === 0 ? 12 : 6;
    const innerX = centerX + (radius - tickLength) * Math.cos(rad);
    const innerY = centerY + (radius - tickLength) * Math.sin(rad);
    const outerX = centerX + radius * Math.cos(rad);
    const outerY = centerY + radius * Math.sin(rad);

    // Draw tick line
    safeFillRect(img, innerX, innerY, 2, 2, "#ffffff");

    // Label every 30°
    if (deg % 30 === 0) {
      const labelX = centerX + (radius + 8) * Math.cos(rad) - 8;
      const labelY = centerY + (radius + 8) * Math.sin(rad) - 8;
      const labelXClamped = Math.max(0, Math.min(img.bitmap.width - 20, labelX));
      const labelYClamped = Math.max(0, Math.min(img.bitmap.height - 20, labelY));
      img.print(font, labelXClamped, labelYClamped, `${deg}`);
    }
  }

  // Draw pockets
  for (const p of pockets) drawCircle(img, tableX + p.x, tableY + p.y, POCKET_R, "#0a0a0a");

  // Draw balls
  for (const b of game.balls) {
    if (b.pocketed) continue;
    const px = tableX + b.x, py = tableY + b.y;
    if (b.type === "stripe") {
      drawCircle(img, px, py, BALL_R, "#ffffff");
      drawCircle(img, px, py, BALL_R * 0.78, b.color);
      drawCircle(img, px, py, BALL_R * 0.42, "#ffffff");
    } else {
      drawCircle(img, px, py, BALL_R, b.color);
      drawCircle(img, px, py, BALL_R * 0.6, "#fefefe");
    }
    img.print(font, px - 7, py - 8, b.type === "cue" ? "C" : b.label);
  }

  if (caption) img.print(font, 8, 8, caption);

  return img.getBufferAsync(Jimp.MIME_PNG);
};


const resetCueBall = (game: GameState) => {
  const cue = game.balls.find((b) => b.type === "cue");
  if (!cue) return;
  cue.pocketed = false; cue.vx = 0; cue.vy = 0;
  let x = TABLE_W * 0.24, y = TABLE_H / 2;
  for (let tries = 0; tries < 6; tries++) {
    const overlap = game.balls.some(b => b !== cue && !b.pocketed && distance({x, y}, b) < BALL_R*2.2);
    if (!overlap) break;
    x += BALL_R*2.4;
  }
  cue.x = clamp(x, BALL_R+2, TABLE_W/2 - BALL_R -4);
  cue.y = clamp(y, BALL_R+2, TABLE_H - BALL_R -2);
};

const remainingForSet = (game: GameState, set: Exclude<BallType, "cue" | "eight">) => 
  game.balls.filter(b => b.type === set && !b.pocketed).length;

const findFirstCollision = (cue: Ball, others: Ball[], first: { hit?: BallType }) => {
  for (const b of others) {
    if (b.pocketed || b.type === "cue") continue;
    if (distance(cue, b) < BALL_R*2 +1) { first.hit = b.type; return; }
  }
};

const simulateShot = (game: GameState, dirX: number, dirY: number, power: number) => {
  const cue = game.balls.find(b => b.type==="cue");
  if(!cue) throw new Error("Cue ball missing");
  cue.vx=0; cue.vy=0;
  const len = Math.hypot(dirX, dirY);
  if(!len || !isFinite(len)) return { pocketed:[], scratch:false, eightPocketed:false };
  const speed = clamp(power,10,100);
  const impulse = (speed/100)*1100;
  cue.vx = (dirX/len)*impulse;
  cue.vy = (dirY/len)*impulse;

  const pocketed:Ball[] = [];
  let scratch=false, firstHit:BallType|undefined, eightPocketed=false;

  for(let step=0; step<MAX_STEPS; step++){
    for(const b of game.balls){
      if(b.pocketed) continue;
      b.x+=b.vx*STEP; b.y+=b.vy*STEP;
      if(b.x<=BALL_R){ b.x=BALL_R; b.vx=-b.vx*RESTITUTION; }
      if(b.x>=TABLE_W-BALL_R){ b.x=TABLE_W-BALL_R; b.vx=-b.vx*RESTITUTION; }
      if(b.y<=BALL_R){ b.y=BALL_R; b.vy=-b.vy*RESTITUTION; }
      if(b.y>=TABLE_H-BALL_R){ b.y=TABLE_H-BALL_R; b.vy=-b.vy*RESTITUTION; }
    }

    for(let i=0;i<game.balls.length;i++){
      for(let j=i+1;j<game.balls.length;j++){
        const a=game.balls[i], b=game.balls[j];
        if(a.pocketed||b.pocketed) continue;
        const dx=b.x-a.x, dy=b.y-a.y;
        const dist=Math.hypot(dx,dy)||1;
        if(dist>=BALL_R*2) continue;
        const nx=dx/dist, ny=dy/dist;
        const relVel=(a.vx-b.vx)*nx + (a.vy-b.vy)*ny;
        if(relVel>0) continue;
        if(!firstHit && (a.type==="cue" || b.type==="cue")){
          const other=a.type==="cue"?b:a;
          firstHit=other.type;
        }
        const jImpulse = (-(1+RESTITUTION)*relVel)/2;
        a.vx+=jImpulse*nx; a.vy+=jImpulse*ny;
        b.vx-=jImpulse*nx; b.vy-=jImpulse*ny;
        const overlap = BALL_R*2-dist;
        const sep=overlap/2+0.1;
        a.x-=nx*sep; a.y-=ny*sep;
        b.x+=nx*sep; b.y+=ny*sep;
      }
    }

    for(const b of game.balls){ if(!b.pocketed){ b.vx*=FRICTION; b.vy*=FRICTION; } }

    for(const b of game.balls){
      if(b.pocketed) continue;
      for(const p of pockets){
        if(distance(b,p)<=POCKET_R-4){
          b.pocketed=true; b.vx=0; b.vy=0;
          pocketed.push(b);
          if(b.type==="cue") scratch=true;
          if(b.type==="eight") eightPocketed=true;
          break;
        }
      }
    }

    const moving = game.balls.some(b=>!b.pocketed && (b.vx*b.vx + b.vy*b.vy > STOP_SPEED2));
    if(!moving) break;
  }

  return { pocketed, scratch, firstHit, eightPocketed };
};

const describePocketed = (balls:Ball[]) => {
  if(!balls.length) return "No balls pocketed.";
  return "Pocketed: "+balls.map(b=>b.type==="cue"?"Cue":b.type==="eight"?"8":`${b.id} (${b.type})`).join(", ");
};

const ensureGame = (chatId:string) => games.get(chatId) || null;
const ensurePlayer = (game:GameState,jid:string,name?:string) => {
  let p = game.players.find(pl=>pl.jid===jid);
  if(!p){ p={jid,name:name||"Player"}; game.players.push(p); }
  return p;
};

const assignSetsIfNeeded = (game:GameState,shooter:Player,pocketed:Ball[])=>{
  if(game.players.some(p=>p.set)) return;
  const claim = pocketed.find((b):b is Ball & {type:"solid"|"stripe"}=>b.type==="solid"||b.type==="stripe");
  if(!claim) return;
  shooter.set=claim.type;
  for(const p of game.players) if(p!==shooter) p.set=claim.type==="solid"?"stripe":"solid";
};

const resolveWin = (game:GameState,shooter:Player,eightPocketed:boolean):Player|null=>{
  if(!eightPocketed) return null;
  if(!shooter.set) return game.players.find(p=>p!==shooter)||null;
  const remaining=remainingForSet(game,shooter.set);
  if(remaining===0) return shooter;
  return game.players.find(p=>p!==shooter)||null;
};

const poolCommand = {
  name: "ball",
  category: "Games",
  code: async(ctx:Ctx)=>{
    const chatId = ctx.groupId || ctx.id;
    if(!chatId) return ctx.reply("Cannot determine chat id.");
    const sub = (ctx.args[0]||"").toLowerCase();
    const me = ctx.sender.jid;
    const meName = ctx.sender.pushName || "Player";

    if(sub==="start"){
      const existing = ensureGame(chatId);
      if(existing && existing.started) return ctx.reply("A pool game is already running here.");
      const game:GameState = { chatId, host:me, started:false, current:0, players:[{jid:me,name:meName}], balls:createBalls() };
      games.set(chatId,game);
      return ctx.reply("8-ball lobby opened. Join with !ball join, host begins with !ball begin.");
    }

    const game = ensureGame(chatId);
    if(!game) return ctx.reply("No pool game here. Use !ball start.");

    if(sub==="join"){
      if(game.started) return ctx.reply("Game already started.");
      if(game.players.length>=2) return ctx.reply("Lobby full (max 2).");
      if(game.players.some(p=>p.jid===me)) return ctx.reply("You already joined.");
      game.players.push({jid:me,name:meName});
      return ctx.reply(`Joined lobby (${game.players.length}/2).`);
    }

    if(sub==="leave"){
      if(game.started) return ctx.reply("Cannot leave after start.");
      game.players = game.players.filter(p=>p.jid!==me);
      if(!game.players.length) games.delete(chatId);
      return ctx.reply("Left the lobby.");
    }

    if(sub==="begin"){
      if(game.started) return ctx.reply("Game already started.");
      if(game.host!==me) return ctx.reply("Only host can begin.");
      if(game.players.length<2) return ctx.reply("Need 2 players.");
      game.started=true;
      game.current=0;
      game.balls=createBalls();
      const img = await renderTable(game, `Break: ${game.players[0].name}`);
      return ctx.reply({image:img, caption:"Game on! Shooter: "+game.players[game.current].name});
    }

    if(!game.started) return ctx.reply("Game not active. Host must !ball begin.");

    if(sub==="end" || sub==="stop"){
      if(me!==game.host) return ctx.reply("Only host can end.");
      games.delete(chatId);
      return ctx.reply("Pool game ended.");
    }

    if(sub==="table" || sub==="status"){
      const shooter = game.players[game.current];
      const img = await renderTable(game, `Turn: ${shooter.name}`);
      return ctx.reply({image:img, caption:`Turn: ${shooter.name}`});
    }

    if(sub==="help"){
      return ctx.reply("Commands: !ball start | join | begin | table | end | move <direction 0-360> <power 10-100>\nAim using degrees, clockwise from right; power 10-100.");
    }

    if(sub==="move"){
      const shooter = ensurePlayer(game, me, meName);
      if(game.players[game.current]?.jid !== shooter.jid) return ctx.reply("Not your turn.");

      const degArg = Number(ctx.args[1]);
      if(!isFinite(degArg)) return ctx.reply("Provide shot direction in degrees: !ball move <0-360> [power 10-100].");
      const powerArg = ctx.args[2] ? Number(ctx.args[2]) : 65;
      if(!isFinite(powerArg)) return ctx.reply("Invalid power. Must be 10-100.");

      const deg = ((degArg%360)+360)%360;
      const power = clamp(powerArg,10,100);
      const rad = deg * Math.PI / 180;
      const dirX = Math.cos(rad);
      const dirY = Math.sin(rad);

      const cue = game.balls.find(b=>b.type==="cue");
      if(!cue) return ctx.reply("Cue ball missing.");
      if(cue.pocketed) resetCueBall(game);

      const { pocketed, scratch, firstHit, eightPocketed } = simulateShot(game, dirX, dirY, power);
      assignSetsIfNeeded(game, shooter, pocketed);

      let foul=false;
      if(shooter.set && firstHit && firstHit!==shooter.set && firstHit!=="eight") foul=true;
      if(scratch) foul=true;

      const winner = resolveWin(game, shooter, eightPocketed);
      if(scratch) resetCueBall(game);

      const opponent = game.players[(game.current+1)%game.players.length];
      const ownType = shooter.set;
      const pocketedOwn = ownType ? pocketed.some(b=>b.type===ownType) : pocketed.length>0;

      let keepTurn = pocketedOwn && !foul;
      if(winner) keepTurn=false;
      if(!keepTurn) game.current=(game.current+1)%game.players.length;

      if(winner){
        games.delete(chatId);
        const img = await renderTable(game, `${shooter.name} wins!`);
        return ctx.reply({image:img, caption:`${winner.name} wins the rack!`});
      }

      const summaryParts = [
        `Shooter: ${shooter.name}${shooter.set?` (${shooter.set})`:""}`,
        describePocketed(pocketed),
        foul?"Foul committed.":"",
        firstHit?`First contact: ${firstHit}`:"",
        `Next: ${game.players[game.current].name}`
      ].filter(Boolean);

      const img = await renderTable(game, `Next: ${game.players[game.current].name}`);
      return ctx.reply({image:img, caption:summaryParts.join(" | ")});
    }

    return ctx.reply("Unknown subcommand. Use !ball help.");
  }
};

export { poolCommand as default };
if(typeof module!=="undefined"){ (module as any).exports = poolCommand; }
