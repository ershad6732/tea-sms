import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Student, Payment } from '../types';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard,
  Loader2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading: isStudentLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Student;
    }
  });

  const { data: payments, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['student-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    }
  });

  if (isStudentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Student not found</p>
        <button 
          onClick={() => navigate('/students')}
          className="mt-4 text-indigo-600 font-bold flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Students
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/students')}
          className="p-2 rounded-xl bg-white border border-gray-100 text-gray-600 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Student Profile</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="h-32 w-32 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-inner">
            {student.name.charAt(0)}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-3xl font-black text-gray-900">{student.name}</h2>
              <p className="text-indigo-600 font-bold mt-1">
                Class {student.class_name}{student.section} • Roll #{student.roll_number || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 text-gray-600 bg-gray-50 p-3 rounded-2xl">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <User className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Parent Name</p>
                  <p className="font-bold text-sm">{student.parent_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-600 bg-gray-50 p-3 rounded-2xl">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Phone className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Phone Number</p>
                  <p className="font-bold text-sm">{student.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-600 bg-gray-50 p-3 rounded-2xl md:col-span-2">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Address</p>
                  <p className="font-bold text-sm">{student.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Records */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-black text-gray-900 flex items-center">
            <CreditCard className="h-6 w-6 mr-2 text-indigo-600" />
            Fee History
          </h3>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {payments?.length || 0} Records
          </span>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          {isPaymentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="p-16 text-center">
              <Clock className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">No payment records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Month/Year</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((payment, index) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      key={payment.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-indigo-600">
                          {payment.month_year || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-700">{payment.category}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-gray-900">₹{payment.amount.toLocaleString('en-IN')}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 uppercase tracking-wider">
                          Paid
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/30">
                    <td colSpan={3} className="px-6 py-4 text-sm font-black text-gray-900 text-right uppercase tracking-widest">Total Paid</td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-black text-indigo-600">
                        ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
