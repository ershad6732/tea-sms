import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Student, Payment, ClassFee } from '../types';
import { 
  IndianRupee, 
  Search, 
  Plus, 
  History, 
  TrendingUp, 
  AlertCircle,
  X,
  Loader2,
  Calendar,
  Settings,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Fees() {
  const [search, setSearch] = useState('');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const queryClient = useQueryClient();

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-fees', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, payments(*)');
      if (error) throw error;
      return data as (Student & { payments: Payment[] })[];
    }
  });

  const { data: classFees } = useQuery({
    queryKey: ['class-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_fees')
        .select('*');
      if (error) throw error;
      return data as ClassFee[];
    }
  });

  const updateClassFeeMutation = useMutation({
    mutationFn: async (fee: Partial<ClassFee>) => {
      const { data, error } = await supabase
        .from('class_fees')
        .upsert([fee], { onConflict: 'class_name' })
        .select();
      if (error) {
        console.error('Error updating class fee:', error);
        alert(`Failed to update fee: ${error.message}. Make sure you have applied the SQL schema and have admin permissions.`);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-fees'] });
      setIsSettingsModalOpen(false);
    }
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (payment: Partial<Payment>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert([payment])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-fees'] });
      setIsPayModalOpen(false);
      setSelectedStudent(null);
    }
  });

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.parent_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getPaymentForMonth = (student: Student & { payments: Payment[] }, month: string) => {
    return student.payments.find(p => p.month_year === month && p.category === 'Tuition Fee');
  };

  const getClassFee = (className: string) => {
    return classFees?.find(cf => cf.class_name === className)?.monthly_amount || 0;
  };

  const totalCollectedThisMonth = students?.reduce((sum, s) => {
    const payment = getPaymentForMonth(s, selectedMonth);
    return sum + (payment ? Number(payment.amount) : 0);
  }, 0) || 0;

  const totalPendingThisMonth = students?.reduce((sum, s) => {
    const payment = getPaymentForMonth(s, selectedMonth);
    if (payment) return sum;
    return sum + getClassFee(s.class_name);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <button 
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-600 active:scale-95 transition-all"
        >
          <Settings className="h-6 w-6" />
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-sm whitespace-nowrap">
          <Calendar className="h-4 w-4" />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.currentTarget.value)}
            className="bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="bg-green-100 w-8 h-8 rounded-xl flex items-center justify-center mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Collected ({selectedMonth})</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalCollectedThisMonth)}</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="bg-red-100 w-8 h-8 rounded-xl flex items-center justify-center mb-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending ({selectedMonth})</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPendingThisMonth)}</p>
        </div>
      </div>

      {/* Student List for Fees */}
      <div className="space-y-3">
        {isLoadingStudents ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          filteredStudents?.map((student, index) => {
            const payment = getPaymentForMonth(student, selectedMonth);
            const isPaid = !!payment;
            const feeAmount = getClassFee(student.class_name);

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                key={student.id}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      isPaid ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    )}>
                      {isPaid ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{student.name}</h3>
                      <p className="text-xs text-gray-500">Class {student.class_name}{student.section}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                        Monthly Fee: {formatCurrency(feeAmount)}
                      </p>
                    </div>
                  </div>
                  {!isPaid ? (
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsPayModalOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all"
                    >
                      Collect
                    </button>
                  ) : (
                    <div className="text-right">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">
                        Paid
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{payment.date}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPayModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPayModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Collect Fees</h2>
                  <p className="text-sm text-gray-500">For {selectedStudent.name} ({selectedMonth})</p>
                </div>
                <button onClick={() => setIsPayModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addPaymentMutation.mutate({
                  student_id: selectedStudent.id,
                  amount: Number(formData.get('amount')),
                  category: formData.get('category') as string,
                  month_year: selectedMonth,
                  date: formData.get('date') as string,
                  remarks: formData.get('remarks') as string,
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₹)</label>
                  <input 
                    name="amount" 
                    type="number" 
                    required 
                    autoFocus
                    defaultValue={getClassFee(selectedStudent.class_name)}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-2xl font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select name="category" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="Tuition Fee">Tuition Fee</option>
                    <option value="Exam Fee">Exam Fee</option>
                    <option value="Transport Fee">Transport Fee</option>
                    <option value="Admission Fee">Admission Fee</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Remarks</label>
                  <input name="remarks" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Optional note" />
                </div>

                <button
                  type="submit"
                  disabled={addPaymentMutation.isPending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {addPaymentMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Payment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal (Class Fees) */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Class Fees</h2>
                  <p className="text-sm text-gray-500">Set monthly fees for each class</p>
                </div>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((cls) => (
                  <div key={cls} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                      {cls}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Monthly Fee</p>
                      <input 
                        type="number"
                        defaultValue={getClassFee(cls)}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val !== getClassFee(cls)) {
                            updateClassFeeMutation.mutate({ class_name: cls, monthly_amount: val });
                          }
                        }}
                        className="w-full bg-transparent text-lg font-bold text-gray-900 outline-none focus:text-indigo-600 transition-colors"
                        placeholder="Set amount"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
