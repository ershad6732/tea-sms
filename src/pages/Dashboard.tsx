import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [
        { count: studentCount },
        { count: presentCount },
        { data: payments },
        { data: expenses },
        { data: classFees },
        { data: allStudents }
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
        supabase.from('payments').select('student_id, amount').eq('month_year', currentMonth),
        supabase.from('expenses').select('amount').gte('date', startOfMonth),
        supabase.from('class_fees').select('*'),
        supabase.from('students').select('id, class_name, uses_transport, transport_fee')
      ]);

      const totalFees = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const attendanceRate = studentCount ? Math.round((presentCount || 0) / studentCount * 100) : 0;

      // Calculate real pending dues for current month
      const currentMonthPayments = payments || [];
      const studentDues = (allStudents || []).map(student => {
        const classFee = classFees?.find(cf => cf.class_name === student.class_name)?.monthly_amount || 0;
        const transportFee = student.uses_transport ? (student.transport_fee || 0) : 0;
        const expectedTotal = Number(classFee) + Number(transportFee);
        
        const paidTotal = currentMonthPayments
          .filter(p => p.student_id === student.id)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        
        return {
          studentId: student.id,
          due: Math.max(0, expectedTotal - paidTotal),
          isUnpaid: paidTotal < expectedTotal
        };
      });

      const pendingDues = studentDues.reduce((sum, d) => sum + d.due, 0);
      const unpaidStudentCount = studentDues.filter(d => d.isUnpaid && d.due > 0).length;

      return {
        studentCount,
        attendanceRate,
        totalFees,
        totalExpenses,
        pendingDues,
        unpaidStudentCount,
      };
    }
  });

  const cards = [
    { 
      name: 'Total Students', 
      value: stats?.studentCount || 0, 
      icon: Users, 
      color: 'bg-blue-500',
      link: '/students'
    },
    { 
      name: 'Today Attendance', 
      value: `${stats?.attendanceRate || 0}%`, 
      icon: CalendarCheck, 
      color: 'bg-green-500',
      link: '/attendance'
    },
    { 
      name: 'Fees Collected', 
      value: formatCurrency(stats?.totalFees || 0), 
      icon: IndianRupee, 
      color: 'bg-indigo-500',
      link: '/fees'
    },
    { 
      name: 'Monthly Expenses', 
      value: formatCurrency(stats?.totalExpenses || 0), 
      icon: TrendingDown, 
      color: 'bg-red-500',
      link: '/expenses'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={card.name}
            className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between"
          >
            <div className={`${card.color} w-10 h-10 rounded-2xl flex items-center justify-center mb-3`}>
              <card.icon className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.name}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Alerts / Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">Pending Dues</h3>
              <p className="text-indigo-100 text-sm mt-1">{stats?.unpaidStudentCount || 0} students have unpaid fees</p>
              <p className="text-3xl font-bold mt-4">{formatCurrency(stats?.pendingDues || 0)}</p>
            </div>
            <div className="bg-white/20 p-2 rounded-xl">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
          <Link 
            to="/fees" 
            className="mt-6 flex items-center justify-center w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all active:scale-95"
          >
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Link to="/attendance" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
              <CalendarCheck className="h-6 w-6 text-indigo-600 mb-2" />
              <span className="text-xs font-semibold text-gray-700">Mark Attendance</span>
            </Link>
            <Link to="/students" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
              <Users className="h-6 w-6 text-blue-600 mb-2" />
              <span className="text-xs font-semibold text-gray-700">Add Student</span>
            </Link>
            <Link to="/fees" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
              <IndianRupee className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-xs font-semibold text-gray-700">Collect Fees</span>
            </Link>
            <Link to="/expenses" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
              <TrendingDown className="h-6 w-6 text-red-600 mb-2" />
              <span className="text-xs font-semibold text-gray-700">Add Expense</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      
    </div>
  );
}



// <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-lg font-bold text-gray-900">Recent Payments</h3>
//           <Link to="/fees" className="text-indigo-600 text-sm font-bold">View All</Link>
//         </div>
//         <div className="space-y-4">
//           {[1, 2, 3].map((i) => (
//             <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
//               <div className="flex items-center">
//                 <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
//                   <IndianRupee className="h-5 w-5" />
//                 </div>
//                 <div className="ml-3">
//                   <p className="text-sm font-bold text-gray-900">Student Name {i}</p>
//                   <p className="text-xs text-gray-500">Class 4A • Tuition Fee</p>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <p className="text-sm font-bold text-gray-900">{formatCurrency(1500)}</p>
//                 <p className="text-xs text-gray-500">Today</p>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
