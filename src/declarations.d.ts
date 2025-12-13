// src/declarations.d.ts
declare module "mumaker" {
  export function ephoto(url: string, text: string): Promise<{ image: string }>;
}

