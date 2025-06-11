import { motion } from 'framer-motion';

interface SalesFilterPanelProps {
  voucherTypeFilter: string;
  setVoucherTypeFilter: (value: string) => void;
  terminalFilter: string;
  setTerminalFilter: (value: string) => void;
  voucherTypes: string[];
  terminalNames: string[];
}

export function SalesFilterPanel({
  voucherTypeFilter,
  setVoucherTypeFilter,
  terminalFilter,
  setTerminalFilter,
  voucherTypes,
  terminalNames,
}: SalesFilterPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="mb-3 font-medium">Filter Options</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="voucherTypeFilter" className="mb-1 block text-sm font-medium">
            Voucher Type
          </label>
          <select
            id="voucherTypeFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={voucherTypeFilter}
            onChange={e => setVoucherTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {voucherTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="terminalFilter" className="mb-1 block text-sm font-medium">
            Terminal
          </label>
          <select
            id="terminalFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={terminalFilter}
            onChange={e => setTerminalFilter(e.target.value)}
          >
            <option value="all">All Terminals</option>
            {terminalNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}
