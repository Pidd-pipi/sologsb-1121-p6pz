import type { Plot } from '../types/plot';
import type { TreeRecord, TreeRecordDraft } from '../types/tree';

export interface NextRoundPlan {
  ok: boolean;
  /** 不可进入下一期时的原因说明 */
  reason: string;
  /** 当前期活立木（可带入下一期） */
  alive: TreeRecord[];
  nextRound: number;
}

/**
 * 检查样地是否可进入下一复查期：
 * 已存在更高期次、或当前期没有活立木时，说明原因且不应产生新记录。
 */
export function planNextRound(plot: Plot, trees: TreeRecord[]): NextRoundPlan {
  const current = plot.surveyRound;
  const nextRound = current + 1;
  const plotTrees = trees.filter((t) => t.plotId === plot.id);
  const maxRound = plotTrees.reduce((m, t) => Math.max(m, t.round), 0);
  if (maxRound > current) {
    return {
      ok: false,
      reason: `已存在第 ${maxRound} 期样木记录（高于当前第 ${current} 期），请直接在该期补测，未产生新记录`,
      alive: [],
      nextRound,
    };
  }
  const alive = plotTrees
    .filter((t) => t.round === current && t.status === '活立木')
    .sort((a, b) => a.treeNo.localeCompare(b.treeNo, 'zh-Hans-CN', { numeric: true }));
  if (alive.length === 0) {
    return {
      ok: false,
      reason: `第 ${current} 期没有活立木可带入下一期，未产生新记录`,
      alive: [],
      nextRound,
    };
  }
  return { ok: true, reason: '', alive, nextRound };
}

/** 把当前期活立木转为新期待补测记录：树号、树种、起源与位置保留，胸径与树高置为未测 */
export function carryOverDrafts(plot: Plot, alive: TreeRecord[], nextRound: number): TreeRecordDraft[] {
  return alive.map((t) => ({
    plotId: plot.id,
    treeNo: t.treeNo,
    species: t.species,
    dbhCm: undefined,
    heightM: undefined,
    underBranchH: t.underBranchH,
    crownWidth: t.crownWidth,
    status: '活立木',
    origin: t.origin,
    healthClass: t.healthClass,
    tiltDeg: t.tiltDeg,
    remark: t.remark,
    round: nextRound,
  }));
}
