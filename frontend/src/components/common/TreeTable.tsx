import { InputNumber, Table, Tag, Tooltip, Typography, type TableProps } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { diameterClassLabel } from '../../utils/forestCalc';
import { isDbhAbnormal, isDbhMeasured, isHeightMeasured, type TreeRecord } from '../../types/tree';

export interface TreeTableProps {
  /** 本期样木 */
  items: TreeRecord[];
  /** 同批全部样木（用于胸径异常值比较） */
  peers?: TreeRecord[];
  /** 行内改胸径；清空（null）表示该株尚未补测，不计入林分汇总 */
  onDbhChange?: (id: string, dbhCm: number | null) => void;
  /** 行内改树高（逐株补测时使用）；不传则树高只读 */
  onHeightChange?: (id: string, heightM: number | null) => void;
  /** 是否展示径阶分组统计 */
  showClassSummary?: boolean;
  emptyText?: string;
}

type Columns = NonNullable<TableProps<TreeRecord>['columns']>;

/** 样木表格：径阶分组、行内编辑胸径/树高、胸径异常值提示；未补测样木单列「待补测」 */
export default function TreeTable({
  items,
  peers,
  onDbhChange,
  onHeightChange,
  showClassSummary = true,
  emptyText = '暂无样木记录',
}: TreeTableProps) {
  const reference = peers && peers.length > 0 ? peers : items;

  const sorted = [...items].sort((a, b) => {
    // 待补测（胸径未测）沉到表尾，便于逐株补测时依次处理
    if (isDbhMeasured(a) !== isDbhMeasured(b)) return isDbhMeasured(a) ? -1 : 1;
    const ca = isDbhMeasured(a) ? diameterClassLabel(a.dbhCm as number) : '未测';
    const cb = isDbhMeasured(b) ? diameterClassLabel(b.dbhCm as number) : '未测';
    if (ca !== cb) return ca.localeCompare(cb, 'zh-Hans-CN', { numeric: true });
    return a.treeNo.localeCompare(b.treeNo, 'zh-Hans-CN', { numeric: true });
  });

  const columns: Columns = [
    { title: '树号', dataIndex: 'treeNo', width: 80, fixed: 'left' },
    { title: '树种', dataIndex: 'species', width: 110 },
    {
      title: '径阶 cm',
      width: 110,
      render: (_: unknown, row: TreeRecord) =>
        isDbhMeasured(row) ? <Tag color="green">{diameterClassLabel(row.dbhCm as number)}</Tag> : <Tag>未测</Tag>,
    },
    {
      title: '胸径 cm',
      width: 150,
      render: (_: unknown, row: TreeRecord) => {
        const measured = isDbhMeasured(row);
        const abnormal = isDbhAbnormal(row, reference);
        return (
          <span>
            {onDbhChange ? (
              <InputNumber
                size="small"
                min={0}
                max={200}
                step={0.1}
                value={measured ? (row.dbhCm as number) : null}
                placeholder={measured ? undefined : '未测'}
                status={abnormal ? 'warning' : undefined}
                onChange={(v) => onDbhChange(row.id, v === null ? null : Number(v))}
                style={{ width: 96 }}
              />
            ) : measured ? (
              row.dbhCm
            ) : (
              <Tag color="orange">未测</Tag>
            )}
            {abnormal ? (
              <Tooltip title="胸径异常：超出 0~200 cm 或与本树种同期均值偏离超过 60%">
                <WarningOutlined style={{ color: '#d4380d', marginLeft: 6 }} />
              </Tooltip>
            ) : null}
          </span>
        );
      },
    },
    {
      title: '树高 m',
      width: 130,
      render: (_: unknown, row: TreeRecord) => {
        const measured = isHeightMeasured(row);
        if (onHeightChange) {
          return (
            <InputNumber
              size="small"
              min={0}
              max={60}
              step={0.1}
              value={measured ? (row.heightM as number) : null}
              placeholder={measured ? undefined : '未测'}
              onChange={(v) => onHeightChange(row.id, v === null ? null : Number(v))}
              style={{ width: 96 }}
            />
          );
        }
        return measured ? row.heightM : <Tag color="orange">未测</Tag>;
      },
    },
    { title: '枝下高 m', dataIndex: 'underBranchH', width: 100 },
    { title: '冠幅 m', dataIndex: 'crownWidth', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => (
        <Tag color={value === '活立木' ? 'green' : value === '采伐' ? 'red' : 'orange'}>{value}</Tag>
      ),
    },
    { title: '起源', dataIndex: 'origin', width: 80 },
    { title: '健康等级', dataIndex: 'healthClass', width: 100 },
    { title: '倾斜 °', dataIndex: 'tiltDeg', width: 90 },
    { title: '位置描述', dataIndex: 'remark', ellipsis: true },
    {
      title: '补测',
      width: 100,
      render: (_: unknown, row: TreeRecord) =>
        isDbhMeasured(row) && isHeightMeasured(row) ? (
          <Tag color="green">已补测</Tag>
        ) : (
          <Tooltip title="由上一期带入，胸径/树高补测后才计入林分汇总">
            <Tag color="orange">待补测</Tag>
          </Tooltip>
        ),
    },
    {
      title: '期次',
      dataIndex: 'round',
      width: 90,
      render: (value: number) => `第 ${value} 期`,
    },
  ];

  const classStats = showClassSummary
    ? Array.from(
        sorted
          .filter(isDbhMeasured)
          .reduce((map, tree) => {
            const label = diameterClassLabel(tree.dbhCm as number);
            map.set(label, (map.get(label) ?? 0) + 1);
            return map;
          }, new Map<string, number>()),
      )
    : [];

  const pendingCount = sorted.filter((t) => !isDbhMeasured(t) || !isHeightMeasured(t)).length;

  return (
    <div data-testid="tree-table">
      {showClassSummary && (classStats.length > 0 || pendingCount > 0) ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          径阶分组：
          {classStats.map(([label, count]) => (
            <Tag key={label} style={{ marginLeft: 6 }}>
              {label} cm · {count} 株
            </Tag>
          ))}
          {pendingCount > 0 ? (
            <Tag color="orange" style={{ marginLeft: 6 }}>
              待补测 · {pendingCount} 株
            </Tag>
          ) : null}
        </Typography.Paragraph>
      ) : null}
      <Table<TreeRecord>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={sorted}
        pagination={false}
        scroll={{ x: 1400 }}
        locale={{ emptyText }}
        rowClassName={(row) => {
          if (isDbhAbnormal(row, reference)) return 'tree-row-abnormal';
          if (!isDbhMeasured(row) || !isHeightMeasured(row)) return 'tree-row-pending';
          return '';
        }}
      />
    </div>
  );
}
