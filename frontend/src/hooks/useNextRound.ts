import { Modal } from 'antd';
import { useTreeStore } from '../stores/treeStore';
import { planNextRound } from '../utils/nextRound';
import type { Plot } from '../types/plot';

/**
 * 「开始下一期」：先校验可否进入下一复查期（不可行时直接回报原因），
 * 确认后把当前期活立木带入新期，胸径/树高置为未测，上一期记录照旧保留。
 */
export function useStartNextRound() {
  const startNextRound = useTreeStore((s) => s.startNextRound);

  return (plot: Plot, onResult: (ok: boolean, message: string) => void) => {
    const plan = planNextRound(plot, useTreeStore.getState().items);
    if (!plan.ok) {
      onResult(false, plan.reason);
      return;
    }
    Modal.confirm({
      title: `开始第 ${plan.nextRound} 期复查`,
      content: `将把第 ${plot.surveyRound} 期的 ${plan.alive.length} 株活立木带入第 ${plan.nextRound} 期：树号、树种、起源与位置保留，胸径与树高置为「未测」，逐株补测后才计入林分汇总；上一期记录照旧保留。`,
      okText: '开始新一期',
      cancelText: '取消',
      onOk: async () => {
        const result = await startNextRound(plot);
        onResult(result.ok, result.message);
      },
    });
  };
}
