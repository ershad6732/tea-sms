import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Expense } from '../types';
import { 
  Receipt, 
  Plus, 
  Search, 
  TrendingDown,
  X,
  Loader2,
  Calendar,
  Tag
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Expenses() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    }
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (newExpense: Partial<Expense>) => {
      const { data, error } = await supabase.from('expenses').insert([newExpense]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsAddModalOpen(false);
    }
  });

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-2xl">
          <TrendingDown className="h-6 w-6 text-red-600" />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Expense History</h2>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="p-2 bg-indigo-600 text-white rounded-xl shadow-md active:scale-95 transition-all"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : expenses?.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-gray-100">
            <p className="text-gray-500">No expenses recorded yet</p>
          </div>
        ) : (
          expenses?.map((expense, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              key={expense.id}
              className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{expense.title}</p>
                  <div className="flex items-center text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                    <Tag className="h-2.5 w-2.5 mr-1" /> {expense.category}
                    <span className="mx-1.5">•</span>
                    <Calendar className="h-2.5 w-2.5 mr-1" /> {expense.date}
                  </div>
                </div>
              </div>
              <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Expense</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addExpenseMutation.mutate({
                  title: formData.get('title') as string,
                  amount: Number(formData.get('amount')),
                  category: formData.get('category') as string,
                  date: formData.get('date') as string,
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                  <input name="title" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Electricity Bill, Stationery" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₹)</label>
                  <input name="amount" type="number" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select name="category" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="Utility">Utility</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Events">Events</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <button
                  type="submit"
                  disabled={addExpenseMutation.isPending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {addExpenseMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Expense'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
