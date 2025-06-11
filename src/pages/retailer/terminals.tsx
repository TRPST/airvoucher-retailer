import * as React from 'react';
import {
  Terminal,
  Plus,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
  User,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  fetchMyRetailer,
  fetchTerminals,
  deleteTerminal,
  type RetailerProfile,
  type Terminal as TerminalType,
} from '@/actions/retailerActions';
import { AddTerminalDialog } from '@/components/retailer/AddTerminalDialog';
import useRequireRole from '@/hooks/useRequireRole';
import { cn } from '@/utils/cn';

export default function RetailerTerminals() {
  // Protect this route - only allow retailer role
  const { isLoading: isRoleLoading, user } = useRequireRole('retailer');

  // State for data
  const [retailer, setRetailer] = React.useState<RetailerProfile | null>(null);
  const [terminals, setTerminals] = React.useState<TerminalType[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  // State for add terminal dialog
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  // State for terminal deletion
  const [terminalToDelete, setTerminalToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Load retailer and terminals data
  React.useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setIsDataLoading(true);
      setDataError(null);

      try {
        // 1. Fetch retailer profile
        const { data: retailerProfile, error: retailerError } = await fetchMyRetailer(user.id);
        if (retailerError || !retailerProfile) {
          throw new Error('Could not load retailer profile');
        }
        setRetailer(retailerProfile);

        // 2. Fetch terminals for this retailer
        const { data: terminalList, error: terminalError } = await fetchTerminals(
          retailerProfile.id
        );
        if (terminalError) {
          throw new Error('Could not load terminals');
        }
        console.log('terminalList', terminalList);
        setTerminals(terminalList || []);
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsDataLoading(false);
      }
    };

    if (!isRoleLoading) loadData();
  }, [user, isRoleLoading]);

  // Filter terminals based on search term
  const filteredTerminals = React.useMemo(() => {
    if (!searchTerm) return terminals;

    return terminals.filter(terminal =>
      terminal.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [terminals, searchTerm]);

  // Handle terminal status toggle
  const handleToggleStatus = async (terminalId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      const response = await fetch('/api/retailer/terminals/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terminalId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update terminal status');
      }

      // Update terminal in the state
      setTerminals(prev =>
        prev.map(terminal =>
          terminal.id === terminalId ? { ...terminal, status: newStatus } : terminal
        )
      );
    } catch (err) {
      console.error('Error toggling terminal status:', err);
      // Show error to user
      alert(`Failed to update terminal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle terminal deletion
  const handleDeleteTerminal = async (terminalId: string) => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const { error } = await deleteTerminal(terminalId);

      if (error) {
        throw error;
      }

      // Update terminals list
      setTerminals(prev => prev.filter(t => t.id !== terminalId));
      setTerminalToDelete(null);
    } catch (err) {
      console.error('Error deleting terminal:', err);
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (isRoleLoading || isDataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading terminals...</span>
      </div>
    );
  }

  // Error state
  if (dataError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-red-500/10 p-3 text-red-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Error Loading Data</h2>
        <p className="max-w-md text-muted-foreground">{dataError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Terminals</h1>
          <p className="text-muted-foreground">Manage your terminals for voucher sales.</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Terminal
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search terminals..."
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Terminals List */}
      {filteredTerminals.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTerminals.map(terminal => (
            <motion.div
              key={terminal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-md font-medium">{terminal.name}</h3>
                    <div className="mt-1 flex items-center">
                      <div
                        className={cn(
                          'mr-2 h-2 w-2 rounded-full',
                          terminal.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        {terminal.status === 'active' ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={terminal.status === 'active'}
                    onCheckedChange={() => handleToggleStatus(terminal.id, terminal.status)}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <button
                    onClick={() => setTerminalToDelete(terminal.id)}
                    className={cn(
                      'rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                      terminal.has_sales &&
                        'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground'
                    )}
                    title={
                      terminal.has_sales
                        ? 'Cannot delete terminal with sales history'
                        : 'Delete terminal'
                    }
                    disabled={terminal.has_sales}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="pt-4">
                {terminal.user_profile && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Terminal User:</span>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{terminal.user_profile.full_name}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Active:</span>
                    <span>
                      {terminal.last_active
                        ? new Date(terminal.last_active).toLocaleString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Terminal className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-medium">No terminals found</h3>
          <p className="mb-4 text-muted-foreground">
            {searchTerm
              ? 'No terminals match your search criteria.'
              : "You haven't created any terminals yet."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Terminal
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!terminalToDelete}
        onOpenChange={() => {
          setTerminalToDelete(null);
          setDeleteError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Terminal</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {deleteError}
                </div>
              ) : (
                'Are you sure you want to delete this terminal? This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => terminalToDelete && handleDeleteTerminal(terminalToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Terminal Dialog */}
      {retailer && (
        <AddTerminalDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          retailerId={retailer.id}
          onTerminalAdded={() => {
            // Refresh terminals list
            fetchTerminals(retailer.id).then(({ data, error }) => {
              if (!error && data) {
                setTerminals(data);
              }
            });
          }}
        />
      )}
    </div>
  );
}
