import { create } from 'zustand';
import { db } from '../utils/db';
import { newId } from '../utils/id';
import type { TreeRecord, TreeRecordDraft } from '../types/tree';
import type { Plot } from '../types/plot';
import { carryOverDrafts, planNextRound } from '../utils/nextRound';
import { usePlotStore } from './plotStore';

export interface NextRoundResult {
  ok: boolean;
  message: string;
  /** 带入新期的活立木株数 */
  created: number;
}

interface TreeState {
  items: TreeRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (draft: TreeRecordDraft) => Promise<TreeRecord>;
  addMany: (drafts: TreeRecordDraft[]) => Promise<TreeRecord[]>;
  update: (id: string, patch: Partial<TreeRecord>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  byPlot: (plotId: string, round?: number) => TreeRecord[];
  /** 开始下一复查期：把当前期活立木带入新期（胸径/树高置为未测），上一期记录保留 */
  startNextRound: (plot: Plot) => Promise<NextRoundResult>;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  items: [],
  loaded: false,
  async load() {
    const rows = await db.trees.toArray();
    rows.sort((a, b) => a.round - b.round || a.treeNo.localeCompare(b.treeNo));
    set({ items: rows, loaded: true });
  },
  async add(draft) {
    const record: TreeRecord = { ...draft, id: newId('tree'), measuredAt: Date.now() };
    await db.trees.put(record);
    set({ items: [...get().items, record] });
    return record;
  },
  async addMany(drafts) {
    const records: TreeRecord[] = drafts.map((d) => ({
      ...d,
      id: newId('tree'),
      measuredAt: Date.now(),
    }));
    await db.trees.bulkPut(records);
    set({ items: [...get().items, ...records] });
    return records;
  },
  async update(id, patch) {
    await db.trees.update(id, patch);
    set({ items: get().items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  },
  async remove(id) {
    await db.trees.delete(id);
    set({ items: get().items.filter((it) => it.id !== id) });
  },
  byPlot(plotId, round) {
    return get()
      .items.filter((it) => it.plotId === plotId && (round === undefined || it.round === round))
      .sort((a, b) => a.treeNo.localeCompare(b.treeNo, 'zh-Hans-CN', { numeric: true }));
  },
  async startNextRound(plot) {
    const plan = planNextRound(plot, get().items);
    if (!plan.ok) return { ok: false, message: plan.reason, created: 0 };
    const records = await get().addMany(carryOverDrafts(plot, plan.alive, plan.nextRound));
    await usePlotStore
      .getState()
      .update(plot.id, { surveyRound: plan.nextRound, surveyedAt: Date.now() });
    return {
      ok: true,
      message: `已开始第 ${plan.nextRound} 期：带入 ${records.length} 株活立木，胸径与树高待逐株补测`,
      created: records.length,
    };
  },
}));
