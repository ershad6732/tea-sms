import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Student, Payment, ClassFee, ClassExtraFee } from '../types';
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
  XCircle,
  FileText
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Fees() {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'base' | 'extra'>('base');
  const [activeExtraCategory, setActiveExtraCategory] = useState('Exam Fee');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedMonthsForPayment, setSelectedMonthsForPayment] = useState<string[]>([]);
  const [selectedMonthsForSettings, setSelectedMonthsForSettings] = useState<string[]>([new Date().toISOString().slice(0, 7)]);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useQuery({
    queryKey: ['students-fees', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, payments(*)')
        .order('roll_number', { ascending: true })
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching students for fees:', error);
        throw error;
      }
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

  const { data: classExtraFees } = useQuery({
    queryKey: ['class-extra-fees', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_extra_fees')
        .select('*')
        .eq('month_year', selectedMonth);
      if (error) throw error;
      return data as ClassExtraFee[];
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
        toast.error(`Failed to update fee: ${error.message}. Make sure you have applied the SQL schema and have admin permissions.`);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-fees'] });
      setIsSettingsModalOpen(false);
      toast.success('Class fee updated successfully!');
    }
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (payments: Partial<Payment>[]) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payments)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-fees'] });
      setIsPayModalOpen(false);
      setSelectedStudent(null);
      setSelectedMonthsForPayment([]);
      toast.success('Payment recorded successfully!');
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (payment: Partial<Payment>) => {
      const { data, error } = await supabase
        .from('payments')
        .update(payment)
        .eq('id', payment.id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-fees'] });
      toast.success('Payment updated successfully!');
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-fees'] });
      toast.success('Payment deleted successfully!');
    }
  });

  const addClassExtraFeeMutation = useMutation({
    mutationFn: async (extraFees: Partial<ClassExtraFee>[]) => {
      const { data, error } = await supabase
        .from('class_extra_fees')
        .upsert(extraFees, { onConflict: 'class_name,category,month_year' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-extra-fees'] });
      queryClient.invalidateQueries({ queryKey: ['students-fees'] });
      setIsSettingsModalOpen(false);
      toast.success('Extra fees updated successfully!');
    }
  });

  const filteredStudents = students?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.parent_name?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = selectedClass === 'All' || s.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  const classes = ['All', 'Nursery', 'UKG', 'LKG', 'STD I', 'STD II', 'STD III', 'STD IV', 'STD V', 'STD VI'];

  const getPaidAmountForMonth = (student: Student & { payments: Payment[] }, month: string) => {
    return student.payments
      .filter(p => p.month_year === month)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const getExtraFeesForMonth = (student: Student, month: string) => {
    const classExtra = classExtraFees
      ?.filter(f => f.class_name === student.class_name && f.month_year === month)
      .reduce((sum, f) => sum + Number(f.amount), 0) || 0;
      
    return classExtra;
  };

  const getClassFee = (student: Student, month?: string) => {
    const baseFee = classFees?.find(cf => cf.class_name === student.class_name)?.monthly_amount || 0;
    const transportFee = student.uses_transport ? (student.transport_fee || 0) : 0;
    
    let extraFees = 0;
    if (month) {
      // Class-wide extra fees
      if (classExtraFees) {
        extraFees += classExtraFees
          .filter(f => f.class_name === student.class_name && f.month_year === month)
          .reduce((sum, f) => sum + Number(f.amount), 0);
      }
    }
    
    return baseFee + transportFee + extraFees;
  };

  const getClassFeeAmount = (className: string) => {
    return classFees?.find(cf => cf.class_name === className)?.monthly_amount || 0;
  };

  const totalCollectedThisMonth = students?.reduce((sum, s) => {
    const paid = getPaidAmountForMonth(s, selectedMonth);
    return sum + paid;
  }, 0) || 0;

  const totalPendingThisMonth = students?.reduce((sum, s) => {
    const paid = getPaidAmountForMonth(s, selectedMonth);
    const totalDue = getClassFee(s, selectedMonth);
    return sum + Math.max(0, totalDue - paid);
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
        <div className="flex gap-2">
          {classes.map(c => (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                selectedClass === c 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "bg-white text-gray-600 border border-gray-200"
              )}
            >
              {c === 'All' ? 'All Classes' : `Class ${c}`}
            </button>
          ))}
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
        ) : studentsError ? (
          <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 text-center space-y-4">
            <div className="bg-red-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Failed to load students</h3>
              <p className="text-sm text-gray-500 mt-1">
                {(studentsError as any).message?.includes('student_extra_fees') 
                  ? "The database schema is out of date. Please apply the latest SQL changes in your Supabase SQL Editor to add the 'student_extra_fees' table."
                  : (studentsError as any).message || "An unexpected error occurred while fetching student data."}
              </p>
            </div>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['students-fees'] })}
              className="px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-all active:scale-95"
            >
              Try Again
            </button>
          </div>
        ) : (
          filteredStudents?.map((student, index) => {
            const paidAmount = getPaidAmountForMonth(student, selectedMonth);
            const extraFees = getExtraFeesForMonth(student, selectedMonth);
            const totalFee = getClassFee(student, selectedMonth);
            const balance = totalFee - paidAmount;
            const isFullyPaid = balance <= 0;
            const isPartiallyPaid = paidAmount > 0 && balance > 0;

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
                      isFullyPaid ? "bg-green-50 text-green-600" : 
                      isPartiallyPaid ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                    )}>
                      {isFullyPaid ? <CheckCircle2 className="h-6 w-6" /> : 
                       isPartiallyPaid ? <TrendingUp className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{student.name}</h3>
                      <p className="text-xs text-gray-500">Class {student.class_name}{student.section}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                          Total Due: {formatCurrency(totalFee)}
                        </p>
                        {extraFees > 0 && (
                          <div className="flex items-center gap-1">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase">
                              Extra: {formatCurrency(extraFees)}
                            </p>
                            {classExtraFees?.some(f => f.class_name === student.class_name && f.month_year === selectedMonth) && (
                              <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1 rounded-sm font-black uppercase">Class</span>
                            )}
                          </div>
                        )}
                        {paidAmount > 0 && (
                          <p className="text-[10px] font-bold text-green-500 uppercase">
                            Paid: {formatCurrency(paidAmount)}
                          </p>
                        )}
                        {balance > 0 && paidAmount > 0 && (
                          <p className="text-[10px] font-bold text-amber-500 uppercase">
                            Due: {formatCurrency(balance)}
                          </p>
                        )}
                        {student.uses_transport && (
                          <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 rounded">
                            Transport Incl.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setSelectedMonthsForPayment([selectedMonth]);
                        setIsPayModalOpen(true);
                      }}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all",
                        isFullyPaid 
                          ? "bg-white border border-gray-200 text-gray-600" 
                          : "bg-indigo-600 text-white"
                      )}
                    >
                      {isFullyPaid ? 'Manage' : isPartiallyPaid ? 'Pay Balance' : 'Collect'}
                    </button>
                    {isFullyPaid && (
                      <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">
                        Fully Paid
                      </span>
                    )}
                  </div>
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
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Collect Fees</h2>
                  <p className="text-sm text-gray-500">For {selectedStudent.name}</p>
                </div>
                <button onClick={() => setIsPayModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" key={selectedMonthsForPayment.join(',')} onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const totalAmount = Number(formData.get('amount'));
                const date = formData.get('date') as string;
                const remarks = formData.get('remarks') as string;
                const category = formData.get('category') as string;

                // Distribute amount across selected months
                let remaining = totalAmount;
                const paymentsToInsert: Partial<Payment>[] = [];

                // Sort months chronologically
                const sortedMonths = [...selectedMonthsForPayment].sort();

                sortedMonths.forEach((month) => {
                  if (remaining <= 0) return;
                  
                  const monthFee = getClassFee(selectedStudent, month);
                  const alreadyPaid = getPaidAmountForMonth(selectedStudent, month);
                  const dueForMonth = Math.max(0, monthFee - alreadyPaid);
                  
                  if (dueForMonth > 0) {
                    const payForThisMonth = Math.min(remaining, dueForMonth);
                    paymentsToInsert.push({
                      student_id: selectedStudent.id,
                      amount: payForThisMonth,
                      category,
                      month_year: month,
                      date,
                      remarks: remarks + (selectedMonthsForPayment.length > 1 ? ` (Part of multi-month payment)` : ''),
                    });
                    remaining -= payForThisMonth;
                  }
                });

                // If there's still remaining amount (overpayment), add it to the last month or a new record
                if (remaining > 0) {
                  if (paymentsToInsert.length > 0) {
                    paymentsToInsert[paymentsToInsert.length - 1].amount = 
                      Number(paymentsToInsert[paymentsToInsert.length - 1].amount) + remaining;
                  } else {
                    // No months had due, but user paid something
                    paymentsToInsert.push({
                      student_id: selectedStudent.id,
                      amount: remaining,
                      category,
                      month_year: selectedMonthsForPayment[0] || selectedMonth,
                      date,
                      remarks,
                    });
                  }
                }

                if (paymentsToInsert.length > 0) {
                  addPaymentMutation.mutate(paymentsToInsert);
                }
              }}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">Select Months</label>
                    <button 
                      type="button"
                      onClick={() => setSelectedMonthsForPayment([])}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      const months = [];
                      const d = new Date(selectedMonth + '-01');
                      // Show 4 months before and 2 months after
                      for (let i = -4; i <= 2; i++) {
                        const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
                        const mStr = m.toISOString().slice(0, 7);
                        months.push(mStr);
                      }
                      return months.map(m => {
                        const paid = getPaidAmountForMonth(selectedStudent, m);
                        const total = getClassFee(selectedStudent, m);
                        const isPaid = paid >= total;
                        const isSelected = selectedMonthsForPayment.includes(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setSelectedMonthsForPayment(prev => 
                                prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                              );
                            }}
                            className={cn(
                              "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex flex-col",
                              isSelected 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200" 
                                : isPaid 
                                  ? "bg-green-50 border-green-100 text-green-700 opacity-60"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300"
                            )}
                          >
                            <span>{new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                            <span className="text-[9px] opacity-80">
                              {isPaid ? 'Paid' : paid > 0 ? `Paid: ₹${paid}` : `Due: ₹${total}`}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Total Amount to Pay (₹)</label>
                  <input 
                    name="amount" 
                    type="number" 
                    required 
                    autoFocus
                    defaultValue={(() => {
                      return selectedMonthsForPayment.reduce((sum, m) => {
                        const paid = getPaidAmountForMonth(selectedStudent, m);
                        const total = getClassFee(selectedStudent, m);
                        return sum + Math.max(0, total - paid);
                      }, 0);
                    })()}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-2xl font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="0" 
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    Amount will be distributed across selected months starting from the earliest.
                  </p>
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

              {/* Payment History Section */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Payment History</h3>
                </div>
                <div className="space-y-3">
                  {selectedStudent.payments
                    ?.filter(p => selectedMonthsForPayment.includes(p.month_year || ''))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(payment => (
                      <div key={payment.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        {editingPaymentId === payment.id ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                defaultValue={payment.amount}
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const newAmount = Number((e.target as HTMLInputElement).value);
                                    if (newAmount !== payment.amount) {
                                      updatePaymentMutation.mutate({ id: payment.id, amount: newAmount });
                                    }
                                    setEditingPaymentId(null);
                                  }
                                  if (e.key === 'Escape') setEditingPaymentId(null);
                                }}
                                onBlur={(e) => {
                                  const newAmount = Number(e.target.value);
                                  if (newAmount !== payment.amount) {
                                    updatePaymentMutation.mutate({ id: payment.id, amount: newAmount });
                                  }
                                  setEditingPaymentId(null);
                                }}
                                autoFocus
                              />
                              <button 
                                onClick={() => setEditingPaymentId(null)}
                                className="px-3 py-2 bg-gray-200 text-gray-600 rounded-xl text-xs font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 italic">Press enter or click away to save</p>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                  {payment.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                {new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {payment.remarks && ` • ${payment.remarks}`}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setEditingPaymentId(payment.id)}
                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="Edit Amount"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this payment?')) {
                                    deletePaymentMutation.mutate(payment.id);
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete Payment"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  {selectedStudent.payments?.filter(p => selectedMonthsForPayment.includes(p.month_year || '')).length === 0 && (
                    <p className="text-center py-4 text-xs text-gray-400 font-medium italic">No payments recorded for selected months.</p>
                  )}
                </div>
              </div>
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
                  <h2 className="text-2xl font-bold text-gray-900">Fee Settings</h2>
                  <p className="text-sm text-gray-500">Configure class-wide fee structures</p>
                </div>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  
                  if (settingsTab === 'base') {
                    classes.filter(c => c !== 'All').forEach(cls => {
                      const val = Number(formData.get(`base-${cls}`));
                      if (val !== getClassFeeAmount(cls)) {
                        updateClassFeeMutation.mutate({ class_name: cls, monthly_amount: val });
                      }
                    });
                  } else {
                    const extraFeesToInsert: Partial<ClassExtraFee>[] = [];
                    selectedMonthsForSettings.forEach(month => {
                      classes.filter(c => c !== 'All').forEach(cls => {
                        const val = Number(formData.get(`extra-${cls}`));
                        extraFeesToInsert.push({
                          class_name: cls,
                          category: activeExtraCategory,
                          amount: val,
                          month_year: month
                        });
                      });
                    });
                    if (extraFeesToInsert.length > 0) {
                      addClassExtraFeeMutation.mutate(extraFeesToInsert);
                    }
                  }
                }}
                className="space-y-6"
              >
                <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
                  <button 
                    type="button"
                    onClick={() => setSettingsTab('base')}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                      settingsTab === 'base' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                    )}
                  >
                    Monthly Base Fee
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSettingsTab('extra')}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                      settingsTab === 'extra' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                    )}
                  >
                    Class Extra Fee
                  </button>
                </div>

                {settingsTab === 'base' ? (
                  <div className="space-y-4">
                    {classes.filter(c => c !== 'All').map((cls) => (
                      <div key={cls} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                          {cls}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Monthly Base Fee</p>
                          <input 
                            name={`base-${cls}`}
                            type="number"
                            defaultValue={getClassFeeAmount(cls)}
                            className="w-full bg-transparent text-lg font-bold text-gray-900 outline-none focus:text-indigo-600 transition-colors"
                            placeholder="Set amount"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Configure Months</p>
                        <button 
                          type="button"
                          onClick={() => {
                            const next6 = [];
                            const d = new Date();
                            for(let i=0; i<6; i++) {
                              next6.push(new Date(d.getFullYear(), d.getMonth() + i, 1).toISOString().slice(0, 7));
                            }
                            setSelectedMonthsForSettings(next6);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          Next 6 Months
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {(() => {
                          const months = [];
                          const d = new Date();
                          for (let i = -2; i <= 6; i++) {
                            const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
                            const mStr = m.toISOString().slice(0, 7);
                            months.push(mStr);
                          }
                          return months.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setSelectedMonthsForSettings(prev => 
                                  prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                                );
                              }}
                              className={cn(
                                "px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                selectedMonthsForSettings.includes(m)
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                  : "bg-white border-indigo-100 text-indigo-400 hover:border-indigo-300"
                              )}
                            >
                              {new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                            </button>
                          ));
                        })()}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-indigo-100">
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Fee Category</label>
                          <select 
                            value={activeExtraCategory}
                            onChange={(e) => setActiveExtraCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 outline-none"
                          >
                            <option value="Exam Fee">Exam Fee</option>
                            <option value="Admission Fee">Admission Fee</option>
                            <option value="Library Fee">Library Fee</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {classes.filter(c => c !== 'All').map((cls) => {
                        const existingExtra = classExtraFees?.find(f => f.class_name === cls && f.category === activeExtraCategory);
                        
                        return (
                          <div key={cls} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                              {cls}
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase">Extra Amount (₹)</p>
                              <input 
                                name={`extra-${cls}`}
                                type="number"
                                key={`${cls}-${activeExtraCategory}`}
                                defaultValue={existingExtra?.amount || 0}
                                className="w-full bg-transparent text-lg font-bold text-gray-900 outline-none focus:text-indigo-600 transition-colors"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updateClassFeeMutation.isPending || addClassExtraFeeMutation.isPending}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                  >
                    {updateClassFeeMutation.isPending || addClassExtraFeeMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Save Fee Settings'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
