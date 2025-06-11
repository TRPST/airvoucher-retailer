import * as React from 'react';
import { Wallet, CreditCard, Percent, Activity, Calendar, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

import { StatsTile } from '@/components/ui/stats-tile';
import TerminalSelector from '@/components/TerminalSelector';
import { retailers, vouchers } from '@/lib/MockData';
import { cn } from '@/utils/cn';
import useRequireRole from '@/hooks/useRequireRole';
import { SalesTable, SalesReport } from '../../components/retailer/SalesTable';
import {
  fetchMyRetailer,
  fetchTerminals,
  fetchSalesHistory,
  type RetailerProfile,
  type Terminal,
  type Sale,
} from '@/actions/retailerActions';

// Type definitions for chart data
type SalesDataPoint = {
  date: string;
  amount: number;
};

type VoucherTypeSales = {
  type: string;
  value: number;
};

// Component for the retailer's sales chart
const RetailerSalesChart = ({ data }: { data: SalesDataPoint[] }) => (
  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
    <h3 className="mb-4 font-medium">Sales Over Time</h3>
    <div className="h-64 w-full">
      {/* Replace with actual chart implementation */}
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="space-y-2 text-center">
          <Activity className="mx-auto h-10 w-10 text-primary" />
          <p>Sales activity visualization</p>
          <p className="text-sm">Last 30 days of sales</p>
        </div>
      </div>
    </div>
  </div>
);

// Component for the voucher type breakdown chart
const VoucherTypeChart = ({ data }: { data: VoucherTypeSales[] }) => (
  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
    <h3 className="mb-4 font-medium">Sales by Voucher Type</h3>
    <div className="h-64 w-full">
      {/* Replace with actual chart implementation */}
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="space-y-2 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-primary" />
          <p>Voucher type breakdown</p>
          <p className="text-sm">Distribution of sales by product</p>
        </div>
      </div>
    </div>
  </div>
);

export default function RetailerDashboard() {
  // Protect this route - only allow retailer role
  const { isLoading, user } = useRequireRole('retailer');

  // State for real data
  const [retailer, setRetailer] = React.useState<RetailerProfile | null>(null);
  const [terminals, setTerminals] = React.useState<Terminal[]>([]);
  const [salesData, setSalesData] = React.useState<Sale[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const [dataError, setDataError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setIsDataLoading(true);
      setDataError(null);
      try {
        // 1. Fetch retailer profile
        const { data: retailerProfile, error: retailerError } = await fetchMyRetailer(user.id);
        if (retailerError || !retailerProfile) throw new Error('Could not load retailer profile');
        setRetailer(retailerProfile);

        // 2. Fetch terminals for this retailer
        const { data: terminalList, error: terminalError } = await fetchTerminals(
          retailerProfile.id
        );
        if (terminalError || !terminalList) throw new Error('Could not load terminals');
        setTerminals(terminalList);

        // 3. Fetch sales for all terminals
        let allSales: Sale[] = [];
        for (const terminal of terminalList) {
          const { data: terminalSales, error: salesError } = await fetchSalesHistory({
            terminalId: terminal.id,
          });
          if (salesError) throw new Error('Could not load sales');
          if (terminalSales) allSales = allSales.concat(terminalSales);
        }
        console.log(allSales);
        setSalesData(allSales);
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsDataLoading(false);
      }
    };
    if (!isLoading) loadData();
  }, [user, isLoading]);

  // Loading and error states
  if (isLoading || isDataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  if (dataError) {
    return <div className="p-8 text-center text-red-500">{dataError}</div>;
  }

  // Prepare data for SalesTable
  const voucherTypes = Array.from(new Set(salesData.map(s => s.voucher_type)));
  const retailerNames = retailer ? [retailer.name] : [];

  // Stats calculations (example: today, week, month, commission)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(now.getDate() - 30);

  const todaySales = salesData.filter(s => s.created_at.startsWith(todayStr));
  const weekSales = salesData.filter(s => new Date(s.created_at) >= weekAgo);
  const monthSales = salesData.filter(s => new Date(s.created_at) >= monthAgo);
  const commissionEarned = salesData.reduce((sum, s) => sum + (s.retailer_commission || 0), 0);

  // Map salesData (Sale[]) to SalesReport[] for the SalesTable
  const salesTableData: SalesReport[] = salesData.map(s => ({
    id: s.id,
    created_at: s.created_at,
    voucher_type: s.voucher_type,
    retailer_name: retailer ? retailer.name : '',
    amount: s.sale_amount ?? s.voucher_amount ?? 0,
    terminal_name: s.terminal_name || '',
    supplier_commission_pct: 0, // Not available in Sale, set to 0 or fetch if needed
    retailer_commission: s.retailer_commission ?? 0,
    agent_commission: 0, // Not available in Sale, set to 0 or fetch if needed
    profit: 0, // Not available in Sale, set to 0 or fetch if needed
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Retailer Dashboard</h1>
          <p className="text-muted-foreground">View your sales performance and statistics</p>
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsTile
          label="Today's Sales"
          value={`R ${todaySales.reduce((sum, s) => sum + (s.sale_amount || 0), 0).toFixed(2)}`}
          icon={Activity}
          intent="primary"
          subtitle={`${todaySales.length} transactions`}
        />
        <StatsTile
          label="Total Sales"
          value={`R ${salesData.reduce((sum, s) => sum + (s.sale_amount || 0), 0).toFixed(2)}`}
          icon={ShoppingBag}
          intent="success"
          subtitle={`${salesData.length} total transactions`}
        />
        <StatsTile
          label="Commission Earned"
          value={`R ${commissionEarned.toFixed(2)}`}
          icon={Percent}
          intent="warning"
          subtitle="Total earned to date"
        />
      </div>

      {/* Charts Section (still using mock/placeholder for now) */}
      {/* <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RetailerSalesChart data={[]} />
        <VoucherTypeChart data={[]} />
      </div> */}

      {/* Recent Sales Table */}
      <SalesTable
        salesData={salesTableData}
        voucherTypes={voucherTypes}
        retailerNames={retailerNames}
      />
    </div>
  );
}
