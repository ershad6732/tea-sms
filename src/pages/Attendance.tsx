import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Student, Attendance } from '../types';
import { 
  Check, 
  X, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Save,
  UserCheck,
  UserX
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('Nursery');
  const [selectedSection, setSelectedSection] = useState('A');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent'>>({});
  const queryClient = useQueryClient();

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students', selectedClass, selectedSection],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', selectedClass)
        .eq('section', selectedSection)
        .order('roll_number', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Student[];
    }
  });

  const { data: existingAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance', date, selectedClass, selectedSection],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
        .in('student_id', students?.map(s => s.id) || []);
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!students?.length
  });

  useEffect(() => {
    if (existingAttendance) {
      const initial: Record<string, 'present' | 'absent'> = {};
      existingAttendance.forEach(a => {
        initial[a.student_id] = a.status as 'present' | 'absent';
      });
      setAttendanceData(initial);
    } else {
      setAttendanceData({});
    }
  }, [existingAttendance, students]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: studentId,
        date,
        status,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,date' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      alert('Attendance saved successfully!');
    }
  });

  const updateStatus = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const hasChanges = useMemo(() => {
    const initial: Record<string, 'present' | 'absent'> = {};
    if (existingAttendance) {
      existingAttendance.forEach(a => {
        initial[a.student_id] = a.status as 'present' | 'absent';
      });
    }
    
    const currentIds = Object.keys(attendanceData);
    const initialIds = Object.keys(initial);
    
    if (currentIds.length !== initialIds.length) return true;
    return currentIds.some(id => attendanceData[id] !== initial[id]);
  }, [attendanceData, existingAttendance]);

  const markAll = (status: 'present' | 'absent') => {
    const newData: Record<string, 'present' | 'absent'> = {};
    students?.forEach(s => {
      newData[s.id] = status;
    });
    setAttendanceData(newData);
  };

  const classes = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-900 font-bold">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 p-0 text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Class</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {classes.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    selectedClass === c ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Section</label>
            <div className="flex gap-2">
              {['A', 'B', 'C'].map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSection(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                    selectedSection === s ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-3">
        <button 
          onClick={() => markAll('present')}
          className="flex-1 flex items-center justify-center py-3 bg-green-50 text-green-700 rounded-2xl font-bold text-sm border border-green-100 active:scale-95 transition-all"
        >
          <UserCheck className="mr-2 h-4 w-4" />
          All Present
        </button>
        <button 
          onClick={() => markAll('absent')}
          className="flex-1 flex items-center justify-center py-3 bg-red-50 text-red-700 rounded-2xl font-bold text-sm border border-red-100 active:scale-95 transition-all"
        >
          <UserX className="mr-2 h-4 w-4" />
          All Absent
        </button>
      </div>

      {/* Student List */}
      <div className="space-y-3 pb-[40px]">
        {isLoadingStudents ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : students?.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-gray-100">
            <p className="text-gray-500">No students in this class</p>
          </div>
        ) : (
          students?.map((student, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              key={student.id}
              onClick={() => {
                const current = attendanceData[student.id];
                updateStatus(student.id, current === 'present' ? 'absent' : 'present');
              }}
              className={cn(
                "p-4 rounded-3xl border transition-all flex items-center justify-between cursor-pointer",
                attendanceData[student.id] === 'present' 
                  ? "bg-green-50 border-green-200" 
                  : attendanceData[student.id] === 'absent'
                  ? "bg-red-50 border-red-200"
                  : "bg-white border-gray-100"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center font-bold",
                  attendanceData[student.id] === 'present' ? "bg-green-200 text-green-700" :
                  attendanceData[student.id] === 'absent' ? "bg-red-200 text-red-700" : "bg-gray-100 text-gray-500"
                )}>
                  {student.roll_number || index + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{student.name}</p>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    {attendanceData[student.id] || 'Not Marked'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus(student.id, 'present');
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-90",
                    attendanceData[student.id] === 'present' ? "bg-green-600 text-white scale-110 shadow-lg" : "bg-gray-100 text-gray-400"
                  )}
                >
                  <Check className="h-5 w-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus(student.id, 'absent');
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-90",
                    attendanceData[student.id] === 'absent' ? "bg-red-600 text-white scale-110 shadow-lg" : "bg-gray-100 text-gray-400"
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Sticky Save Button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 inset-x-6 md:bottom-8 md:left-72 md:right-8 z-40"
          >
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save Attendance
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
