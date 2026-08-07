import React, { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Button, InputTag, Select, Statistic, Table, Tabs, Tag, Tooltip } from '@tod-m/materials/es/ve-o';

type SummaryCard = {
  label: string;
  value: string;
  subtext?: string;
};

type AggregateTableRow = {
  key: string;
  name: string;
  costAmount: string;
  incomeAmount: string;
  upstreamNodes?: string[];
  downstreamNodes?: string[];
  nextLevelNodes: string[];
};

type NodeTableRow = {
  key: string;
  nodeType: string;
  name: string;
  costAmount: string;
  incomeAmount: string;
  diffAmount: string;
  diffRate: string;
};

type DrawerTablePayload =
  | {
      mode: 'aggregate';
      primaryColumnTitle: string;
      nextColumnTitle?: string;
      showNextLevelColumn?: boolean;
      showRelationColumns?: boolean;
      rows: AggregateTableRow[];
    }
  | {
      mode: 'node';
      rows: NodeTableRow[];
    };

type BudgetUnitOption = {
  key: string;
  label: string;
  role: string;
};

type BudgetDetailRow = {
  key: string;
  demandFirst: string;
  demandChild: string;
  supplyFirst: string;
  supplyChild: string;
  product: string;
  billingUnit: string;
  saleRegion: string;
  amount: string;
  monthlyAmounts?: Record<string, string>;
  type: 'cost' | 'income';
};

type BudgetTablePayload = {
  title: string;
  selectedKey?: string;
  activeTab?: BudgetDetailTabKey;
  options: BudgetUnitOption[];
  detailsByUnit: Record<
    string,
    {
      title: string;
      role: string;
      demandCount: number;
      supplyCount: number;
      costAmount: string;
      incomeAmount: string;
      rows: BudgetDetailRow[];
    }
  >;
};

const roots = new WeakMap<Element, Root>();
const RELATION_TAG_VISIBLE_COUNT = 2;
type TopologyViewKey = 'table' | 'topology';
type BudgetDetailTabKey = 'cost' | 'income';
const BUDGET_DETAIL_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

function parseSummaryValue(rawValue: string) {
  const text = String(rawValue || '').trim();
  const matched = text.match(/^([+-]?[\d,]+(?:\.\d+)?)(亿元|万元|元|%)?$/);

  if (!matched) {
    return { value: text || '0', suffix: '' };
  }

  const numericValue = Number(matched[1].replace(/,/g, ''));
  return {
    value: Number.isFinite(numericValue) ? numericValue : matched[1],
    suffix: matched[2] || '',
  };
}

function renderSummaryValue(value: string) {
  const text = String(value || '').trim();
  const matched = text.match(/^([+-]?[\d,]+(?:\.\d+)?)(亿元|万元|元|%)?$/);
  const valueText = matched ? matched[1] : text || '0';
  const suffix = matched?.[2] || '';

  return (
    <>
      <span>{valueText}</span>
      {suffix ? <span className="aggregate-summary-unit">{suffix}</span> : null}
    </>
  );
}

function TodDrawerSummaryCard({ label, value, subtext }: SummaryCard) {
  if (subtext) {
    return (
      <div className="aggregate-summary-card tod-summary-card is-diff">
        <div className="aggregate-summary-label">{label}</div>
        <div className="aggregate-summary-metric-row">
          <div className="aggregate-summary-value">{renderSummaryValue(value)}</div>
          <span className="aggregate-summary-divider" aria-hidden="true" />
          <span className="aggregate-summary-subtext">{subtext}</span>
        </div>
      </div>
    );
  }

  const parsed = parseSummaryValue(value);

  return (
    <div className="aggregate-summary-card tod-summary-card">
      <Statistic
        title={label}
        value={parsed.value}
        suffix={parsed.suffix}
        precision={typeof parsed.value === 'number' ? 2 : undefined}
        groupSeparator
        className="tod-summary-statistic"
      />
    </div>
  );
}

function TodDrawerSummary({ cards }: { cards: SummaryCard[] }) {
  return (
    <>
      {cards.map((card) => (
        <TodDrawerSummaryCard key={`${card.label}-${card.value}`} {...card} />
      ))}
    </>
  );
}

function TableViewIcon() {
  return (
    <svg className="topology-view-tab-icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 2.25h10v9.5H2v-9.5Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 5.25h10M5.5 2.25v9.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function TopologyViewIcon() {
  return <span className="topology-view-tab-icon topology-view-subordinates-icon" aria-hidden="true" />;
}

function FilterIcon() {
  return (
    <svg className="budget-table-filter-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 4.25h10L9.25 8.5v2.65l-2.5 1.1V8.5L3 4.25Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopologyViewTabTitle({
  view,
  children,
}: {
  view: TopologyViewKey;
  children: React.ReactNode;
}) {
  return (
    <span className={`topology-view-tab-title is-${view}`}>
      {view === 'table' ? <TableViewIcon /> : <TopologyViewIcon />}
      <span>{children}</span>
    </span>
  );
}

function TopologyViewTabs() {
  const [activeView, setActiveView] = useState<TopologyViewKey>('topology');

  useEffect(() => {
    function handleSetView(event: Event) {
      const nextView = (event as CustomEvent<{ view?: TopologyViewKey }>).detail?.view;
      if (nextView === 'table' || nextView === 'topology') {
        setActiveView(nextView);
        window.dispatchEvent(new CustomEvent('topology-view:change', { detail: { view: nextView } }));
      }
    }

    window.addEventListener('topology-view:set', handleSetView);
    return () => window.removeEventListener('topology-view:set', handleSetView);
  }, []);

  function handleChange(key: string) {
    const nextView = key === 'table' ? 'table' : 'topology';
    setActiveView(nextView);
    window.dispatchEvent(new CustomEvent('topology-view:change', { detail: { view: nextView } }));
  }

  return (
    <div className="topology-view-fallback" role="tablist" aria-label="视图切换">
      <button
        className={`topology-view-tab ${activeView === 'table' ? 'is-active' : ''}`}
        type="button"
        role="tab"
        aria-selected={activeView === 'table'}
        onClick={() => handleChange('table')}
      >
        <TopologyViewTabTitle view="table">表格视图</TopologyViewTabTitle>
      </button>
      <span className="topology-view-separator" aria-hidden="true" />
      <button
        className={`topology-view-tab ${activeView === 'topology' ? 'is-active' : ''}`}
        type="button"
        role="tab"
        aria-selected={activeView === 'topology'}
        onClick={() => handleChange('topology')}
      >
        <TopologyViewTabTitle view="topology">拓扑图视图</TopologyViewTabTitle>
      </button>
    </div>
  );
}

function TopologyBackBreadcrumb({ currentTitle }: { currentTitle: string }) {
  return (
    <div className="topology-back-breadcrumb-wrap">
      <div className="topology-back-breadcrumb topology-back-breadcrumb-visible">
        <button className="topology-back-breadcrumb-action" type="button">拓扑图全局</button>
        <span className="topology-back-breadcrumb-separator" aria-hidden="true">
          <span className="topology-back-breadcrumb-separator-line" />
        </span>
        <span className="topology-back-breadcrumb-current">{currentTitle || '当前发起方'}</span>
      </div>
    </div>
  );
}

function renderFallbackBackBreadcrumb(container: HTMLElement, currentTitle: string) {
  container.innerHTML = `
    <div class="topology-back-breadcrumb topology-back-breadcrumb-fallback">
      <button class="topology-back-breadcrumb-action" type="button">拓扑图全局</button>
      <span class="topology-back-breadcrumb-separator" aria-hidden="true">
        <span class="topology-back-breadcrumb-separator-line"></span>
      </span>
      <span class="topology-back-breadcrumb-current">${escapeHtml(currentTitle || '当前发起方')}</span>
    </div>
  `;
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCards(container: HTMLElement): SummaryCard[] {
  try {
    const cards = JSON.parse(container.dataset.todSummaryCards || '[]');
    return Array.isArray(cards) ? cards : [];
  } catch {
    return [];
  }
}

function getTablePayload(container: HTMLElement): DrawerTablePayload | null {
  try {
    const payload = JSON.parse(container.dataset.todTable || 'null');
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function getBudgetTablePayload(container: HTMLElement): BudgetTablePayload | null {
  try {
    const payload = JSON.parse(container.dataset.todBudgetTableView || 'null');
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function splitAmountUnit(rawValue: string) {
  const text = String(rawValue || '-');
  const matched = text.match(/^(.*?)(亿元|万元|元|%)$/);
  if (!matched) {
    return { value: text, unit: '' };
  }

  return {
    value: matched[1],
    unit: matched[2],
  };
}

function isZeroAmountText(rawValue: string) {
  const amount = splitAmountUnit(rawValue);
  const numericText = amount.value.replace(/,/g, '').trim();
  const numericValue = Number(numericText);
  return Number.isFinite(numericValue) && numericValue === 0;
}

function AmountCell({
  value,
  unitKey,
  budgetTab,
}: {
  value: string;
  unitKey?: string;
  budgetTab?: BudgetDetailTabKey;
}) {
  const amount = splitAmountUnit(value);

  if (isZeroAmountText(value)) {
    return <PlainValueCell value={value} />;
  }

  return (
    <Tooltip content="在表格中查看明细" trigger="hover" position="top">
      <span
        className="tod-drawer-table-amount"
        data-budget-unit-key={unitKey}
        data-budget-tab={budgetTab}
      >
        <span>{amount.value}</span>
        {amount.unit ? <span className="tod-drawer-table-amount-unit">{amount.unit}</span> : null}
      </span>
    </Tooltip>
  );
}

function PlainValueCell({ value }: { value: string }) {
  const amount = splitAmountUnit(value);

  return (
    <span className="tod-drawer-table-plain-value">
      <span>{amount.value}</span>
      {amount.unit ? <span className="tod-drawer-table-plain-value-unit">{amount.unit}</span> : null}
    </span>
  );
}

function NameCell({ value }: { value: string }) {
  return (
    <span className="tod-drawer-table-name" title={value}>
      {value || '-'}
    </span>
  );
}

function getRoleTagVariant(text: string) {
  if (/供给方/.test(text || '')) {
    return 'supply';
  }
  if (/发起方/.test(text || '')) {
    return 'initiator';
  }
  return 'demand';
}

function NodeTypeTag({ value }: { value: string }) {
  const variant = getRoleTagVariant(value);

  return (
    <span className={`tod-drawer-table-node-type-tag is-${variant}`}>
      {value || '-'}
    </span>
  );
}

function RelationNodesCell({ nodes }: { nodes?: string[] }) {
  if (!nodes?.length) {
    return <span className="tod-drawer-table-empty">-</span>;
  }

  const visibleNodes = nodes.slice(0, RELATION_TAG_VISIBLE_COUNT);
  const hiddenCount = Math.max(0, nodes.length - visibleNodes.length);

  return (
    <div className="tod-drawer-tag-list" title={nodes.join('、')}>
      {visibleNodes.map((node) => (
        <Tag key={node} size="small" color="gray" bordered={false} fill className="tod-drawer-table-tag">
          {node}
        </Tag>
      ))}
      {hiddenCount > 0 && (
        <Tag size="small" color="gray" bordered={false} fill className="tod-drawer-table-tag is-more">
          +{hiddenCount}
        </Tag>
      )}
    </div>
  );
}

function TodAggregateTable({ payload }: { payload: Extract<DrawerTablePayload, { mode: 'aggregate' }> }) {
  const showRelationColumns = payload.showRelationColumns !== false && payload.showNextLevelColumn !== false;
  const columns = [
    {
      title: payload.primaryColumnTitle,
      dataIndex: 'name',
      fixed: 'left' as const,
      width: 200,
      render: (value: string) => <NameCell value={value} />,
    },
    {
      title: '成本调整总金额',
      dataIndex: 'costAmount',
      align: 'right' as const,
      render: (value: string, row: AggregateTableRow) => (
        <AmountCell value={value} unitKey={row.key} budgetTab="cost" />
      ),
    },
    {
      title: '收入调整总金额',
      dataIndex: 'incomeAmount',
      align: 'right' as const,
      render: (value: string, row: AggregateTableRow) => (
        <AmountCell value={value} unitKey={row.key} budgetTab="income" />
      ),
    },
    ...(showRelationColumns
      ? [
          {
            title: '上游',
            dataIndex: 'upstreamNodes',
            render: (value: string[]) => <RelationNodesCell nodes={value || []} />,
          },
          {
            title: '下游',
            dataIndex: 'downstreamNodes',
            render: (value: string[]) => <RelationNodesCell nodes={value || []} />,
          },
        ]
      : payload.showNextLevelColumn === false
      ? []
      : [
          {
            title: payload.nextColumnTitle || '上下游节点',
            dataIndex: 'nextLevelNodes',
            render: (value: string[]) => <RelationNodesCell nodes={value || []} />,
          },
        ]),
  ];

  return (
    <Table
      rowKey="key"
      columns={columns}
      data={payload.rows}
      pagination={false}
      scroll={{ x: showRelationColumns ? 860 : payload.showNextLevelColumn === false ? 540 : 720 }}
      className="tod-drawer-table"
    />
  );
}

function TodNodeTable({ payload }: { payload: Extract<DrawerTablePayload, { mode: 'node' }> }) {
  const columns = [
    {
      title: '节点类型',
      dataIndex: 'nodeType',
      width: 96,
      render: (value: string) => <NodeTypeTag value={value} />,
    },
    {
      title: '预算单元名称',
      dataIndex: 'name',
      fixed: 'left' as const,
      width: 200,
      render: (value: string) => <NameCell value={value} />,
    },
    {
      title: '成本调整总金额',
      dataIndex: 'costAmount',
      align: 'right' as const,
      render: (value: string, row: NodeTableRow) => (
        <AmountCell value={value} unitKey={row.key} budgetTab="cost" />
      ),
    },
    {
      title: '收入调整总金额',
      dataIndex: 'incomeAmount',
      align: 'right' as const,
      render: (value: string, row: NodeTableRow) => (
        <AmountCell value={value} unitKey={row.key} budgetTab="income" />
      ),
    },
    {
      title: '收支偏差金额',
      dataIndex: 'diffAmount',
      align: 'right' as const,
      render: (value: string) => <PlainValueCell value={value} />,
    },
    {
      title: '收支偏差比例',
      dataIndex: 'diffRate',
      align: 'right' as const,
      render: (value: string) => <PlainValueCell value={value} />,
    },
  ];

  return (
    <Table
      rowKey="key"
      columns={columns}
      data={payload.rows}
      pagination={false}
      scroll={{ x: 920 }}
      className="tod-drawer-table"
    />
  );
}

function TodDrawerTable({ payload }: { payload: DrawerTablePayload }) {
  if (payload.mode === 'aggregate') {
    return <TodAggregateTable payload={payload} />;
  }

  return <TodNodeTable payload={payload} />;
}

function BudgetRoleTag({ role }: { role: string }) {
  const isSupply = /供给方/.test(role);
  const isInitiator = /发起方/.test(role);
  const variant = isInitiator ? 'initiator' : isSupply ? 'supply' : 'demand';
  return (
    <Tag
      size="small"
      className={`budget-table-role-tag is-${variant}`}
    >
      {role || '预算单元'}
    </Tag>
  );
}

function BillingCell({ row }: { row: BudgetDetailRow }) {
  return (
    <div className="budget-table-billing-cell">
      <Tag size="small" className="budget-table-billing-tag">
        组合计费单元：{row.billingUnit}
      </Tag>
      <div className="budget-table-attribute-row">
        <Tag size="small" className="budget-table-billing-tag">
          售卖区域：{row.saleRegion}
        </Tag>
        <Tag size="small" color="gray" className="budget-table-more-tag">
          更多6项属性
        </Tag>
      </div>
    </div>
  );
}

function BudgetDetailTable({ rows }: { rows: BudgetDetailRow[] }) {
  const columns = [
    {
      title: (
        <span className="budget-table-header-title">
          <Tag size="small" color="gray">
            需求方
          </Tag>
          一级预算单元
        </span>
      ),
      dataIndex: 'demandFirst',
      width: 166,
      render: (value: string) => <NameCell value={value} />,
    },
    {
      title: (
        <span className="budget-table-header-title">
          <Tag size="small" color="gray">
            需求方
          </Tag>
          子预算单元
        </span>
      ),
      dataIndex: 'demandChild',
      width: 156,
      render: (value: string) => <NameCell value={value} />,
    },
    {
      title: (
        <span className="budget-table-header-title">
          <Tag size="small" color="arcoblue">
            供给方
          </Tag>
          一级预算单元
        </span>
      ),
      dataIndex: 'supplyFirst',
      width: 166,
      render: (value: string) => <NameCell value={value} />,
    },
    {
      title: (
        <span className="budget-table-header-title">
          <Tag size="small" color="arcoblue">
            供给方
          </Tag>
          子预算单元
        </span>
      ),
      dataIndex: 'supplyChild',
      width: 156,
      render: (value: string) => <NameCell value={value} />,
    },
    {
      title: '商品',
      dataIndex: 'product',
      width: 146,
      render: (value: string) => <NameCell value={value} />,
    },
    {
      title: '计费项',
      dataIndex: 'billingUnit',
      width: 282,
      render: (_value: string, row: BudgetDetailRow) => <BillingCell row={row} />,
    },
    ...BUDGET_DETAIL_MONTHS.map((month) => ({
      title: month,
      dataIndex: month,
      align: 'right' as const,
      width: 112,
      render: (_value: string, row: BudgetDetailRow) => (
        <span className="budget-table-month-amount">
          <PlainValueCell value={row.monthlyAmounts?.[month] || '-'} />
        </span>
      ),
    })),
  ];

  return (
    <Table
      rowKey="key"
      columns={columns}
      data={rows}
      pagination={{ pageSize: 10, sizeCanChange: true, sizeOptions: [10, 20, 50] }}
      scroll={{ x: 1744 }}
      className="budget-table-detail-table"
    />
  );
}

function BudgetTableView({ payload }: { payload: BudgetTablePayload }) {
  const firstKey = payload.selectedKey || payload.options[0]?.key || '';
  const [selectedKey, setSelectedKey] = useState(firstKey);
  const [activeTab, setActiveTab] = useState<BudgetDetailTabKey>(payload.activeTab === 'income' ? 'income' : 'cost');
  const filterLabels = ['需求方一级预算单元', '需求方子预算单元', '供给方一级预算单元', '供给方子预算单元'];

  const renderFilterControl = (label: string) => (
    <div className="budget-table-filter-control" key={label}>
      <span className="budget-table-filter-label">{label}</span>
      <Select placeholder="请选择" className="budget-table-filter-select" allowClear>
        <Select.Option value={label}>{label}</Select.Option>
      </Select>
    </div>
  );

  useEffect(() => {
    const nextKey = payload.selectedKey || payload.options[0]?.key || '';
    setSelectedKey(nextKey);
    setActiveTab(payload.activeTab === 'income' ? 'income' : 'cost');
  }, [payload]);

  const detail = payload.detailsByUnit[selectedKey] || payload.detailsByUnit[firstKey];
  const costRows = (detail?.rows || []).filter((row) => row.type === 'cost');
  const incomeRows = (detail?.rows || []).filter((row) => row.type === 'income');
  const tableRows = activeTab === 'income' ? incomeRows : costRows;
  const selectedOption = payload.options.find((option) => option.key === selectedKey);

  if (!detail) {
    return <div className="budget-table-empty">暂无预算单元调整明细</div>;
  }

  return (
    <div className="budget-table-view">
      <section className="budget-table-selector-card">
        <div className="budget-table-selector-label">一级预算单元</div>
        <Select
          value={selectedKey}
          onChange={(value) => {
            if (!value) {
              return;
            }
            setSelectedKey(String(value));
            setActiveTab('cost');
          }}
          className="budget-table-main-select"
          triggerElement={
            <div className="budget-table-main-tag-trigger">
              <InputTag
                value={selectedOption ? [selectedOption.label] : []}
                readOnly
                disableInput
                allowClear={false}
                suffix={<span className="budget-table-main-tag-arrow" aria-hidden />}
                onRemove={(_, __, event) => {
                  event?.preventDefault?.();
                  event?.stopPropagation?.();
                }}
              />
            </div>
          }
        >
          {payload.options.map((option) => (
            <Select.Option key={option.key} value={option.key}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      </section>

      <section className="budget-table-detail-card">
        <div className="budget-table-detail-head">
          <div>
            <div className="budget-table-title-row">
              <span className="budget-table-title">{detail.title}</span>
              <BudgetRoleTag role={detail.role} />
              <Tag size="small" color="green">
                自动生成
              </Tag>
            </div>
            <div className="budget-table-description">
              <span>共 {detail.demandCount} 个1级需求方</span>
              <span>金额调整：{detail.costAmount}</span>
              <span className="budget-table-desc-divider" />
              <span>共 {detail.supplyCount} 个1级供给方</span>
              <span>金额调整：{detail.incomeAmount}</span>
            </div>
          </div>
        </div>

        <div className="budget-table-tabs-row">
          <Tabs
            activeTab={activeTab}
            onChange={(key) => setActiveTab(key as BudgetDetailTabKey)}
            className="budget-table-tabs"
          >
            <Tabs.TabPane key="cost" title={`成本预算调整明细 ${costRows.length}`} />
            <Tabs.TabPane key="income" title={`收入预算调整明细 ${incomeRows.length}`} />
          </Tabs>
          <div className="budget-table-tip">
            <span className="budget-table-info-icon">i</span>
            正式开窗后，预算商品和优化目标变化会引起调整金额和填报方式的变更。
          </div>
        </div>

        <div className="budget-table-grid-card">
          <div className="budget-table-grid-header">
            <div className="budget-table-grid-title">
              <span className="budget-table-grid-icon">⌘</span>
              商品按量填报
              <Tag size="small" color="gray">
                按需求方子预算单元
              </Tag>
            </div>
          </div>

          <div className="budget-table-filters">
            <div className="budget-table-filter-row is-main">
              {filterLabels.map(renderFilterControl)}
            </div>
            <div className="budget-table-filter-row is-sub">
              {renderFilterControl('商品')}
              <Button size="small" type="outline" className="budget-table-filter-icon-button">
                <FilterIcon />
              </Button>
              <div className="budget-table-filter-actions">
                <Button size="small" type="outline">
                  批量导入
                </Button>
                <Button size="small" type="outline">
                  下载
                </Button>
              </div>
            </div>
          </div>

          <BudgetDetailTable rows={tableRows} />
        </div>
      </section>
    </div>
  );
}

function renderTodDrawerSummaryCards() {
  document.querySelectorAll<HTMLElement>('[data-tod-summary-cards]').forEach((container) => {
    const cards = getCards(container);
    if (!cards.length) {
      return;
    }

    let root = roots.get(container);
    if (!root) {
      root = createRoot(container);
      roots.set(container, root);
    }
    root.render(<TodDrawerSummary cards={cards} />);
  });
}

function renderTodDrawerTables() {
  document.querySelectorAll<HTMLElement>('[data-tod-table]').forEach((container) => {
    const payload = getTablePayload(container);
    if (!payload) {
      return;
    }

    let root = roots.get(container);
    if (!root) {
      root = createRoot(container);
      roots.set(container, root);
    }
    container.classList.add('is-tod-rendered');
    root.render(<TodDrawerTable payload={payload} />);
  });
}

function renderTodBudgetTableViews() {
  document.querySelectorAll<HTMLElement>('[data-tod-budget-table-view]').forEach((container) => {
    const payload = getBudgetTablePayload(container);
    if (!payload) {
      return;
    }

    let root = roots.get(container);
    if (!root) {
      root = createRoot(container);
      roots.set(container, root);
    }
    container.classList.add('is-tod-rendered');
    root.render(<BudgetTableView payload={payload} />);
  });
}

function renderTodViewTabs() {
  document.querySelectorAll<HTMLElement>('[data-tod-view-tabs]').forEach((container) => {
    let root = roots.get(container);
    if (!root) {
      root = createRoot(container);
      roots.set(container, root);
    }
    container.classList.add('is-tod-rendered');
    root.render(<TopologyViewTabs />);
  });
}

function renderTodBackBreadcrumb() {
  document.querySelectorAll<HTMLElement>('[data-tod-back-global]').forEach((container) => {
    const currentTitle = container.dataset.currentTitle || '';
    let root = roots.get(container);
    if (!root) {
      root = createRoot(container);
      roots.set(container, root);
    }
    container.classList.add('is-tod-rendered');
    renderFallbackBackBreadcrumb(container, currentTitle);
    root.render(<TopologyBackBreadcrumb currentTitle={currentTitle} />);
  });
}

function renderTodDrawerSidebar() {
  renderTodViewTabs();
  renderTodBackBreadcrumb();
  renderTodDrawerSummaryCards();
  renderTodDrawerTables();
  renderTodBudgetTableViews();
}

window.addEventListener('tod-drawer-summary:render', renderTodDrawerSidebar);
window.addEventListener('tod-back-breadcrumb:render', renderTodBackBreadcrumb);
renderTodDrawerSidebar();

declare global {
  interface Window {
    renderTodDrawerSummaryCards?: () => void;
    renderTodDrawerSidebar?: () => void;
    renderTodBudgetTableViews?: () => void;
    renderTodBackBreadcrumb?: () => void;
  }
}

window.renderTodDrawerSummaryCards = renderTodDrawerSidebar;
window.renderTodDrawerSidebar = renderTodDrawerSidebar;
window.renderTodBudgetTableViews = renderTodBudgetTableViews;
window.renderTodBackBreadcrumb = renderTodBackBreadcrumb;
