import * as React from 'react';
import { Wallet, CreditCard, Percent, Activity, Calendar, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

import { StatsTile } from '@/components/ui/stats-tile';
import TerminalSelector from '@/components/TerminalSelector';
import { retailers, vouchers } from '@/lib/MockData';
import { cn } from '@/utils/cn';
import useRequireRole from '@/hooks/useRequireRole';
import { SalesTable, SalesReport } from '../../components/retailer/SalesTable';

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
  const { isLoading } = useRequireRole('retailer');

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Get the first active retailer for demo purposes
  const retailer = retailers.find(r => r.status === 'active') || retailers[0];

  // Mock data for the retailer dashboard
  // In a real application, these would come from API calls
  const todaySales = 2350.75;
  const todaySalesCount = 15;
  const weekSales = 15420.3;
  const monthSales = 42689.5;

  // Mock sales data for charts
  const salesTimeData: SalesDataPoint[] = [
    { date: '2023-05-01', amount: 1200 },
    { date: '2023-05-02', amount: 1500 },
    // More data points would be here
  ];

  const voucherTypeData: VoucherTypeSales[] = [
    { type: 'Mobile', value: 5200 },
    { type: 'OTT', value: 3100 },
    { type: 'Hollywoodbets', value: 2400 },
    // More data here
  ];

  // Mock sales data for the table
  const recentSales = [
    { date: 'May 12, 2023, 14:25', type: 'Mobile', amount: 200, commission: 10 },
    { date: 'May 12, 2023, 11:30', type: 'OTT', amount: 150, commission: 7.5 },
    { date: 'May 11, 2023, 17:15', type: 'Hollywoodbets', amount: 300, commission: 15 },
    { date: 'May 11, 2023, 09:45', type: 'Ringa', amount: 120, commission: 6 },
    { date: 'May 10, 2023, 16:20', type: 'Mobile', amount: 250, commission: 12.5 },
  ];

  // Prepare data for SalesTable
  // Convert recentSales to SalesReport[] shape for demo
  const salesData: SalesReport[] = [
    {
      id: '1',
      created_at: '2025-06-05T19:56:00Z',
      voucher_type: 'Telkom',
      retailer_name: retailer.name,
      amount: 10,
      supplier_commission_pct: 5,
      retailer_commission: 0.02,
      agent_commission: 0.03,
      profit: 0.45,
    },
    // ... add more mock sales in the same shape as needed ...
  ];
  const voucherTypes = Array.from(new Set(salesData.map(s => s.voucher_type)));
  const retailerNames = [retailer.name];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Retailer Dashboard</h1>
          <p className="text-muted-foreground">View your sales performance and statistics</p>
        </div>
        <div className="absolute right-0 top-0">
          <TerminalSelector />
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsTile
          label="Today's Sales"
          value={`R ${todaySales.toFixed(2)}`}
          icon={Activity}
          intent="primary"
          subtitle={`${todaySalesCount} transactions`}
        />
        <StatsTile
          label="Weekly Sales"
          value={`R ${weekSales.toFixed(2)}`}
          icon={Calendar}
          intent="success"
          subtitle="Last 7 days"
        />
        <StatsTile
          label="Monthly Sales"
          value={`R ${monthSales.toFixed(2)}`}
          icon={ShoppingBag}
          intent="info"
          subtitle="Current month"
        />
        <StatsTile
          label="Commission Earned"
          value={`R ${retailer.commission.toFixed(2)}`}
          icon={Percent}
          intent="warning"
          subtitle="Total earned to date"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RetailerSalesChart data={salesTimeData} />
        <VoucherTypeChart data={voucherTypeData} />
      </div>

      {/* Recent Sales Table */}
      <SalesTable salesData={salesData} voucherTypes={voucherTypes} retailerNames={retailerNames} />
    </div>
  );
}
