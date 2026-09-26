/** 样木状态 */
export type TreeStatus = '活立木' | '枯立木' | '倒木' | '采伐';

export const TREE_STATUSES: TreeStatus[] = ['活立木', '枯立木', '倒木', '采伐'];

/** 起源 */
export type TreeOrigin = '天然' | '人工';

export const TREE_ORIGINS: TreeOrigin[] = ['天然', '人工'];

/** 健康等级 */
export type HealthClass = '健康' | '亚健康' | '不健康';

export const HEALTH_CLASSES: HealthClass[] = ['健康', '亚健康', '不健康'];

/** 样木记录（按复查期次分行，便于逐株比对） */
export interface TreeRecord {
  id: string;
  plotId: string;
  /** 树号 */
  treeNo: string;
  species: string;
  /** 胸径 cm；「开始下一期」带入的待补测样木先为空（未测），逐株补测后填入 */
  dbhCm: number | null;
  /** 树高 m；未测时为空 */
  heightM: number | null;
  /** 枝下高 m */
  underBranchH: number;
  /** 冠幅 m */
  crownWidth: number;
  status: TreeStatus;
  origin: TreeOrigin;
  healthClass: HealthClass;
  /** 倾斜度 ° */
  tiltDeg: number;
  /** 位置描述 */
  remark: string;
  /** 所属复查期次 */
  round: number;
  measuredAt: number;
}

export type TreeRecordDraft = Omit<TreeRecord, 'id' | 'measuredAt'>;

/** 胸径是否已测（空值视为带入新期、尚未补测） */
export function isDbhMeasured(tree: TreeRecord): boolean {
  return tree.dbhCm !== null && Number.isFinite(tree.dbhCm);
}

/** 树高是否已测 */
export function isHeightMeasured(tree: TreeRecord): boolean {
  return tree.heightM !== null && Number.isFinite(tree.heightM);
}

/** 是否已完成本期补测：胸径与树高均已测 */
export function isFullyMeasured(tree: TreeRecord): boolean {
  return isDbhMeasured(tree) && isHeightMeasured(tree);
}

/** 胸径是否异常（相对同树种同径阶偏离过大或数值不合理）；未测样木不参与异常判定 */
export function isDbhAbnormal(tree: TreeRecord, peers: TreeRecord[]): boolean {
  if (!isDbhMeasured(tree)) return false;
  const dbh = tree.dbhCm as number;
  if (dbh <= 0 || dbh > 200) return true;
  const sameSpecies = peers.filter(
    (p) => p.species === tree.species && p.round === tree.round && isDbhMeasured(p),
  );
  if (sameSpecies.length < 3) return false;
  const avg = sameSpecies.reduce((s, p) => s + (p.dbhCm as number), 0) / sameSpecies.length;
  return Math.abs(dbh - avg) / avg > 0.6;
}
