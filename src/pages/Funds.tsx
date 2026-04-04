import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { FundTransaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Minus, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  User,
  Filter,
  Download,
  Search,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  X
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

type TabType = 'overview' | 'add' | 'withdraw' | 'history';

export default function Funds() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['fund-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fund_transactions')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FundTransaction[];
    }
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: Partial<FundTransaction>) => {
      const { data, error } = await supabase
        .from('fund_transactions')
        .insert([transaction])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['fund-transactions'] });
      setActiveTab('history');
      const isCredit = data?.[0]?.type === 'CREDIT';
      toast.success(isCredit ? 'Funds added successfully!' : 'Funds withdrawn successfully!');
    }
  });

  const totalAdded = transactions
    ?.filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const totalWithdrawn = transactions
    ?.filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const balance = totalAdded - totalWithdrawn;

  const filteredTransactions = transactions?.filter(t => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
    const matchesSearch = t.remark.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  const chartData = transactions ? (() => {
    const months: Record<string, { month: string, credit: number, debit: number }> = {};
    transactions.forEach(t => {
      const date = new Date(t.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, credit: 0, debit: 0 };
      }
      if (t.type === 'CREDIT') months[monthKey].credit += Number(t.amount);
      else months[monthKey].debit += Number(t.amount);
    });
    return Object.values(months).reverse().slice(-6);
  })() : [];

  const exportToCSV = () => {
    if (!transactions) return;
    const headers = ['Date', 'Type', 'Amount', 'Category', 'Remark', 'Performed By'];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.type,
      t.amount,
      t.category || 'N/A',
      t.remark,
      t.profiles?.full_name || 'Unknown'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fund_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Only administrators have access to the Fund Management module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Wallet className="h-6 w-6" />
            </div>
            <TrendingUp className="h-5 w-5 text-indigo-200" />
          </div>
          <p className="text-indigo-100 text-sm font-medium">Total Fund Balance</p>
          <h3 className="text-3xl font-bold mt-1">{formatCurrency(balance)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 rounded-2xl">
              <ArrowUpRight className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Inflow</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">Total Added Amount</p>
          <h3 className="text-3xl font-bold mt-1 text-gray-900">{formatCurrency(totalAdded)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-2xl">
              <ArrowDownRight className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">Outflow</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">Total Withdrawn Amount</p>
          <h3 className="text-3xl font-bold mt-1 text-gray-900">{formatCurrency(totalWithdrawn)}</h3>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-[#f8fafc]/80 backdrop-blur-md -mx-4 px-4 py-2 mb-2 md:static md:bg-transparent md:p-0 md:mb-0">
        <div className="flex p-1.5 bg-white/50 border border-gray-100 rounded-[2rem] overflow-x-auto no-scrollbar shadow-sm">
          {(['overview', 'add', 'withdraw', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 px-6 text-[11px] font-black rounded-[1.5rem] transition-all whitespace-nowrap capitalize tracking-widest flex items-center justify-center gap-2",
                activeTab === tab 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50"
              )}
            >
              {tab === 'overview' && <TrendingUp className="h-3.5 w-3.5" />}
              {tab === 'add' && <Plus className="h-3.5 w-3.5" />}
              {tab === 'withdraw' && <Minus className="h-3.5 w-3.5" />}
              {tab === 'history' && <History className="h-3.5 w-3.5" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Financial Analytics</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Last 6 Months Performance</p>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Inflow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Outflow</span>
                    </div>
                  </div>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                        tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc', radius: 8 }}
                        contentStyle={{ 
                          borderRadius: '20px', 
                          border: '1px solid #f1f5f9', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)',
                          padding: '12px 16px'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="credit" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={16} />
                      <Bar dataKey="debit" fill="#f87171" radius={[6, 6, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setActiveTab('add')}
                      className="flex flex-col items-center justify-center p-5 bg-green-50 text-green-700 rounded-[2rem] hover:bg-green-100 transition-all group border border-green-100/50"
                    >
                      <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">Add</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('withdraw')}
                      className="flex flex-col items-center justify-center p-5 bg-red-50 text-red-700 rounded-[2rem] hover:bg-red-100 transition-all group border border-red-100/50"
                    >
                      <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Minus className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">Withdraw</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Recent Activity</h4>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {transactions?.slice(0, 4).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-xl",
                            t.type === 'CREDIT' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          )}>
                            {t.type === 'CREDIT' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          </div>
                          <div className="max-w-[100px] sm:max-w-none">
                            <p className="text-xs font-bold text-gray-900 truncate">{t.remark}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <p className={cn(
                          "text-xs font-black",
                          t.type === 'CREDIT' ? "text-green-600" : "text-red-600"
                        )}>
                          {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'add' && (
          <motion.div
            key="add"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-green-50 rounded-[1.5rem] text-green-600 shadow-sm shadow-green-100/50">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Add Money</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Record New Inflow</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const amount = Number(formData.get('amount'));
                const category = formData.get('category') as any;
                const remark = formData.get('remark') as string;

                addTransactionMutation.mutate({
                  type: 'CREDIT',
                  amount,
                  category,
                  remark,
                  created_by: profile?.id
                });
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Amount (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input 
                        name="amount"
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Income Type</label>
                    <select 
                      name="category"
                      required
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    >
                      <option value="NEW_ADMISSION">New Admissions</option>
                      <option value="OLD_ADMISSION">Old Admissions</option>
                      <option value="MONTHLY_FEES">Monthly Fees</option>
                      <option value="OTHERS">Others</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Remark / Comment</label>
                  <textarea 
                    name="remark"
                    required
                    rows={3}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    placeholder="Describe the source of this fund..."
                  />
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl flex items-center gap-3">
                  <User className="h-5 w-5 text-indigo-600" />
                  <p className="text-xs text-indigo-700 font-medium">
                    Recorded by <span className="font-bold">{profile?.full_name}</span> on <span className="font-bold">{new Date().toLocaleString()}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={addTransactionMutation.isPending}
                  className="w-full py-5 bg-green-600 text-white rounded-[2rem] font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addTransactionMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <Plus className="h-5 w-5" />
                      Add to Fund
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'withdraw' && (
          <motion.div
            key="withdraw"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-red-50 rounded-[1.5rem] text-red-600 shadow-sm shadow-red-100/50">
                    <Minus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Withdraw</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Record New Outflow</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-500 font-medium mb-1">Available Balance</p>
                <h4 className="text-3xl font-black text-gray-900">{formatCurrency(balance)}</h4>
              </div>

              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const amount = Number(formData.get('amount'));
                const remark = formData.get('remark') as string;

                if (amount > balance) {
                  toast.error('Insufficient balance for this withdrawal.');
                  return;
                }

                addTransactionMutation.mutate({
                  type: 'DEBIT',
                  amount,
                  remark,
                  created_by: profile?.id
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input 
                      name="amount"
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      max={balance}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">Maximum withdrawal: {formatCurrency(balance)}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Withdrawal</label>
                  <textarea 
                    name="remark"
                    required
                    rows={3}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    placeholder="Why is this money being withdrawn?"
                  />
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl flex items-center gap-3">
                  <User className="h-5 w-5 text-indigo-600" />
                  <p className="text-xs text-indigo-700 font-medium">
                    Recorded by <span className="font-bold">{profile?.full_name}</span> on <span className="font-bold">{new Date().toLocaleString()}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={addTransactionMutation.isPending}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addTransactionMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <Minus className="h-5 w-5" />
                      Confirm Withdrawal
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Filters & Search */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search by remark or admin name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 lg:flex gap-3">
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600" />
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full pl-10 pr-8 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-black uppercase tracking-widest text-indigo-700 appearance-none"
                    >
                      <option value="ALL">All Types</option>
                      <option value="CREDIT">Inflow</option>
                      <option value="DEBIT">Outflow</option>
                    </select>
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600" />
                    <select 
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full pl-10 pr-8 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-black uppercase tracking-widest text-indigo-700 appearance-none"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="NEW_ADMISSION">New Admissions</option>
                      <option value="OLD_ADMISSION">Old Admissions</option>
                      <option value="MONTHLY_FEES">Monthly Fees</option>
                      <option value="OTHERS">Others</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions List (Mobile) & Table (Desktop) */}
            <div className="space-y-4">
              {/* Mobile List View */}
              <div className="md:hidden space-y-3">
                {filteredTransactions?.map((t) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={t.id}
                    className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-3 rounded-2xl",
                          t.type === 'CREDIT' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {t.type === 'CREDIT' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{t.remark}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            {new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(t.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <p className={cn(
                        "text-lg font-black",
                        t.type === 'CREDIT' ? "text-green-600" : "text-red-600"
                      )}>
                        {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-black border border-indigo-100">
                          {t.profiles?.full_name?.charAt(0)}
                        </div>
                        <span className="text-[11px] font-bold text-gray-500">{t.profiles?.full_name}</span>
                      </div>
                      <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-gray-100">
                        {t.category?.replace('_', ' ').toLowerCase() || 'N/A'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Remark</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Performed By</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTransactions?.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-bold text-gray-700">{new Date(t.created_at).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                              t.type === 'CREDIT' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              {t.type === 'CREDIT' ? 'Inflow' : 'Outflow'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-gray-500 capitalize">{t.category?.replace('_', ' ').toLowerCase() || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-gray-600 max-w-xs truncate">{t.remark}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-black">
                                {t.profiles?.full_name?.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-gray-700">{t.profiles?.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                              "text-sm font-black",
                              t.type === 'CREDIT' ? "text-green-600" : "text-red-600"
                            )}>
                              {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(!filteredTransactions || filteredTransactions.length === 0) && (
                <div className="bg-white py-16 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-6 bg-gray-50 rounded-full mb-4">
                      <History className="h-10 w-10 text-gray-300" />
                    </div>
                    <p className="text-base font-bold text-gray-400">No transactions found</p>
                    <p className="text-sm text-gray-300 mt-1">Try adjusting your filters or search query</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
