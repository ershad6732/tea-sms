import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  IndianRupee, 
  Download,
  Filter,
  Loader2,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';

type ReportTab = 'financial' | 'attendance' | 'students';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4'];

const sortClasses = (a: string, b: string) => {
  const indexA = CLASS_ORDER.indexOf(a);
  const indexB = CLASS_ORDER.indexOf(b);
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
};

export default function Reports() {
  const { profile } = useAuth();
  const isAdminOrAccountant = profile?.role === 'admin' || profile?.role === 'accountant';
  const [activeTab, setActiveTab] = useState<ReportTab>(isAdminOrAccountant ? 'financial' : 'attendance');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch all necessary data
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments-report'],
    queryFn: async () => {
      if (!isAdminOrAccountant) return [];
      const { data, error } = await supabase.from('payments').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses-report'],
    queryFn: async () => {
      if (!isAdminOrAccountant) return [];
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('roll_number', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: attendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('*');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = isLoadingPayments || isLoadingExpenses || isLoadingStudents || isLoadingAttendance;

  // Financial Data Processing
  const financialData = useMemo(() => {
    if (!payments || !expenses || !isAdminOrAccountant) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const monthlyData: Record<string, { month: string, income: number, expense: number }> = {};

    payments.forEach(p => {
      const date = parseISO(p.date);
      if (isWithinInterval(date, { start, end })) {
        const monthKey = format(date, 'MMM yyyy');
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
        monthlyData[monthKey].income += Number(p.amount);
      }
    });

    expenses.forEach(e => {
      const date = parseISO(e.date);
      if (isWithinInterval(date, { start, end })) {
        const monthKey = format(date, 'MMM yyyy');
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
        monthlyData[monthKey].expense += Number(e.amount);
      }
    });

    return Object.values(monthlyData);
  }, [payments, expenses, startDate, endDate, isAdminOrAccountant]);

  // Expense Category Data
  const expenseCategoryData = useMemo(() => {
    if (!expenses || !isAdminOrAccountant) return [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const categories: Record<string, number> = {};
    expenses.forEach(e => {
      const date = parseISO(e.date);
      if (isWithinInterval(date, { start, end })) {
        categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
      }
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenses, startDate, endDate, isAdminOrAccountant]);

  // Attendance Data Processing
  const attendanceData = useMemo(() => {
    if (!attendance || !students) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const classAttendance: Record<string, { class: string, present: number, total: number }> = {};

    attendance.forEach(a => {
      const date = parseISO(a.date);
      if (isWithinInterval(date, { start, end })) {
        const student = students.find(s => s.id === a.student_id);
        if (student) {
          const className = student.class_name;
          if (!classAttendance[className]) classAttendance[className] = { class: className, present: 0, total: 0 };
          classAttendance[className].total += 1;
          if (a.status === 'present') classAttendance[className].present += 1;
        }
      }
    });

    return Object.values(classAttendance).map(d => ({
      ...d,
      percentage: Math.round((d.present / d.total) * 100)
    })).sort((a, b) => sortClasses(a.class, b.class));
  }, [attendance, students, startDate, endDate]);

  // Enrollment Data Processing
  const enrollmentData = useMemo(() => {
    if (!students) return [];
    const classes: Record<string, number> = {};
    students.forEach(s => {
      classes[s.class_name] = (classes[s.class_name] || 0) + 1;
    });
    return Object.entries(classes).map(([name, value]) => ({ name, value }))
      .sort((a, b) => sortClasses(a.name, b.name));
  }, [students]);

  const totalIncome = financialData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = financialData.reduce((sum, d) => sum + d.expense, 0);
  const netSavings = totalIncome - totalExpense;

  const tabs = ([
    isAdminOrAccountant ? 'financial' : null,
    'attendance',
    'students'
  ].filter(Boolean) as ReportTab[]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Report Filters</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Select time period for analysis</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-gray-700 outline-none"
              />
            </div>
            <span className="text-gray-300 font-bold">to</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-gray-700 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1.5 bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
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
            {tab === 'financial' && <IndianRupee className="h-3.5 w-3.5" />}
            {tab === 'attendance' && <BarChart3 className="h-3.5 w-3.5" />}
            {tab === 'students' && <Users className="h-3.5 w-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'financial' && isAdminOrAccountant && (
          <motion.div
            key="financial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-50 rounded-2xl text-green-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg uppercase">Income</span>
                </div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Total Collection</p>
                <h3 className="text-2xl font-black mt-1 text-gray-900">{formatCurrency(totalIncome)}</h3>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg uppercase">Expense</span>
                </div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Total Expenses</p>
                <h3 className="text-2xl font-black mt-1 text-gray-900">{formatCurrency(totalExpense)}</h3>
              </div>
              <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <IndianRupee className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black text-white bg-white/20 px-2 py-1 rounded-lg uppercase">Net</span>
                </div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Net Savings</p>
                <h3 className="text-2xl font-black mt-1">{formatCurrency(netSavings)}</h3>
              </div>
            </div>

            {/* Income vs Expense Chart */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Income vs Expenses</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Monthly Financial Comparison</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Expense</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
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
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '12px 16px'
                      }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#f87171" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Expense Distribution</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expenseCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Top Expense Categories</h3>
                <div className="space-y-4">
                  {expenseCategoryData.sort((a, b) => b.value - a.value).slice(0, 5).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-sm font-bold text-gray-700">{cat.name}</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Attendance by Class</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="8 8" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                      dataKey="class" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 800, fill: '#475569' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(value) => [`${value}%`, 'Attendance']}
                    />
                    <Bar 
                      dataKey="percentage" 
                      fill="#4f46e5" 
                      radius={[0, 10, 10, 0]} 
                      barSize={24}
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage > 90 ? '#10b981' : entry.percentage > 75 ? '#4f46e5' : '#f87171'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Enrollment by Class</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={enrollmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {enrollmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Class-wise Strength</h3>
                <div className="space-y-4">
                  {enrollmentData.map((cls, idx) => (
                    <div key={cls.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm">
                          {cls.name}
                        </div>
                        <span className="font-bold text-gray-700">Class {cls.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-gray-900">{cls.value}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Students</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Button */}

    </div>
  );
}




      // <div className="fixed bottom-24 inset-x-6 md:bottom-8 md:left-72 md:right-8 z-40">
      //   <button
      //     onClick={() => alert('Report export started...')}
      //     className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-95"
      //   >
      //     <Download className="mr-2 h-5 w-5" />
      //     Download Full Report (PDF/Excel)
      //   </button>
      // </div>
      
