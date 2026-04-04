import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Staff, Salary } from '../types';
import { 
  Users, 
  Plus, 
  IndianRupee, 
  Phone, 
  Briefcase,
  X,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatCurrency, cn, getMonthName } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffPage() {
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isPaySalaryModalOpen, setIsPaySalaryModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const queryClient = useQueryClient();

  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*, salaries(*)');
      if (error) throw error;
      return data as (Staff & { salaries: Salary[] })[];
    }
  });

  const addStaffMutation = useMutation({
    mutationFn: async (newStaff: Partial<Staff>) => {
      const { data, error } = await supabase.from('staff').insert([newStaff]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsAddStaffModalOpen(false);
      toast.success('Staff member added successfully!');
    }
  });

  const paySalaryMutation = useMutation({
    mutationFn: async (salary: Partial<Salary>) => {
      const { data, error } = await supabase.from('salaries').insert([salary]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsPaySalaryModalOpen(false);
      setSelectedStaff(null);
      toast.success('Salary payment recorded successfully!');
    }
  });

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">School Staff</h2>
        <button 
          onClick={() => setIsAddStaffModalOpen(true)}
          className="p-2 bg-indigo-600 text-white rounded-xl shadow-md active:scale-95 transition-all"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <div className="grid gap-4">
        {isLoadingStaff ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          staff?.map((member, index) => {
            const isPaidThisMonth = member.salaries.some(s => s.month_year === currentMonth && s.status === 'paid');
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={member.id}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{member.name}</h3>
                      <p className="text-xs text-gray-500 font-medium flex items-center">
                        <Briefcase className="h-3 w-3 mr-1" /> {member.role}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Base Salary</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(member.salary_amount || 0)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center">
                    {isPaidThisMonth ? (
                      <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Paid for {getMonthName(currentMonth)}
                      </span>
                    ) : (
                      <span className="flex items-center text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                        <Clock className="h-3 w-3 mr-1" /> Pending for {getMonthName(currentMonth)}
                      </span>
                    )}
                  </div>
                  {!isPaidThisMonth && (
                    <button 
                      onClick={() => {
                        setSelectedStaff(member);
                        setIsPaySalaryModalOpen(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
                    >
                      Pay Salary
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {isAddStaffModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddStaffModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Staff Member</h2>
                <button onClick={() => setIsAddStaffModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addStaffMutation.mutate({
                  name: formData.get('name') as string,
                  role: formData.get('role') as string,
                  phone: formData.get('phone') as string,
                  salary_amount: Number(formData.get('salary_amount')),
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input name="name" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter staff name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                  <input name="role" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Teacher, Accountant" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="10-digit mobile number" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Monthly Salary (₹)</label>
                  <input name="salary_amount" type="number" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                </div>

                <button
                  type="submit"
                  disabled={addStaffMutation.isPending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {addStaffMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Save Staff Member'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Salary Modal */}
      <AnimatePresence>
        {isPaySalaryModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaySalaryModalOpen(false)}
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
                  <h2 className="text-2xl font-bold text-gray-900">Pay Salary</h2>
                  <p className="text-sm text-gray-500">For {selectedStaff.name}</p>
                </div>
                <button onClick={() => setIsPaySalaryModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                paySalaryMutation.mutate({
                  staff_id: selectedStaff.id,
                  amount: Number(formData.get('amount')),
                  month_year: formData.get('month_year') as string,
                  status: 'paid',
                  date: new Date().toISOString().split('T')[0],
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₹)</label>
                  <input 
                    name="amount" 
                    type="number" 
                    defaultValue={selectedStaff.salary_amount || 0}
                    required 
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-2xl font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">For Month</label>
                  <input name="month_year" type="month" defaultValue={currentMonth} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <button
                  type="submit"
                  disabled={paySalaryMutation.isPending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {paySalaryMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Payment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
