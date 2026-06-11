/**
 * Bot casuale-legale: baseline per i test e sparring partner debole.
 * Sceglie uniformemente tra le mosse concrete; per lo scarto costruisce un
 * payload valido scartando dalle risorse più abbondanti.
 */
import {
  RESOURCES,
  nextInt,
  seedRng,
  zeroResources,
  type Action,
  type Resource,
  type ResourceCount,
} from '@vikiland/engine';
import type { Bot, BotInput } from './types';

export function buildGreedyDiscard(hand: ResourceCount, amount: number): ResourceCount {
  const out = zeroResources();
  const left = { ...hand };
  for (let i = 0; i < amount; i++) {
    let best: Resource = RESOURCES[0]!;
    for (const r of RESOURCES) if (left[r] > left[best]) best = r;
    out[best] += 1;
    left[best] -= 1;
  }
  return out;
}

export function createRandomBot(): Bot {
  return {
    name: 'random',
    decide(input: BotInput): Action {
      const concrete: Action[] = [];
      for (const m of input.legalActions) {
        if (m.type === 'scartaDescr') {
          concrete.push({
            type: 'scarta',
            player: m.player,
            resources: buildGreedyDiscard(input.view.me!.resources, m.amount),
          });
        } else if (m.type !== 'proponiScambioDescr') {
          concrete.push(m);
        }
      }
      if (concrete.length === 0) {
        throw new Error('randomBot: nessuna mossa concreta disponibile');
      }
      const [idx] = nextInt(seedRng(input.rngSeed), concrete.length);
      return concrete[idx]!;
    },
  };
}
