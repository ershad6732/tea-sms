import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Student } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  User, 
  ChevronRight,
  X,
  Loader2,
  Filter,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Students() {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Student[];
    }
  });

  const { user, profile } = useAuth();

  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Partial<Student>) => {
      if (!profile || !['admin', 'teacher'].includes(profile.role)) {
        const errorMsg = `Permission denied: Your role is ${profile?.role || 'unknown'}. Only admins and teachers can add students.`;
        alert(errorMsg);
        throw new Error(errorMsg);
      }

      const { data, error } = await supabase
        .from('students')
        .insert([newStudent])
        .select();
      if (error) {
        console.error('Error adding student:', error);
        alert(`Failed to save student: ${error.message}`);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsAddModalOpen(false);
      alert('Student saved successfully!');
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!profile || profile.role !== 'admin') {
        const errorMsg = 'Permission denied: Only admins can delete students.';
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);
      
      if (error) {
        console.error('Error deleting student:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setStudentToDelete(null);
    },
    onError: (error: any) => {
      alert(`Failed to delete student: ${error.message}`);
    }
  });

  const filteredStudents = students?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.parent_name?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = selectedClass === 'All' || s.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  const classes = ['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students or parents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {classes.map(c => (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedClass === c 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {c === 'All' ? 'All Classes' : `Class ${c}`}
            </button>
          ))}
        </div>
      </div>

      {/* Student List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredStudents?.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-gray-300">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No students found</p>
          </div>
        ) : (
          filteredStudents?.map((student, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={student.id}
              onClick={() => navigate(`/students/${student.id}`)}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{student.name}</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Class {student.class_name}{student.section} • Roll #{student.roll_number || 'N/A'}
                  </p>
                  <div className="flex items-center mt-1 space-x-3">
                    {student.phone && (
                      <span className="flex items-center text-[10px] text-gray-400">
                        <Phone className="h-3 w-3 mr-1" /> {student.phone}
                      </span>
                    )}
                    {student.parent_name && (
                      <span className="flex items-center text-[10px] text-gray-400">
                        <User className="h-3 w-3 mr-1" /> {student.parent_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {profile?.role === 'admin' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudentToDelete(student.id);
                    }}
                    className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 h-14 w-14 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-90 z-40"
      >
        <Plus className="h-8 w-8" />
      </button>

      {/* Add Student Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Student</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addStudentMutation.mutate({
                  name: formData.get('name') as string,
                  class_name: formData.get('class_name') as string,
                  section: formData.get('section') as string,
                  parent_name: formData.get('parent_name') as string,
                  phone: formData.get('phone') as string,
                  address: formData.get('address') as string,
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input name="name" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter student name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
                    <select name="class_name" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Section</label>
                    <select name="section" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Parent Name</label>
                  <input name="parent_name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Father/Mother name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="10-digit mobile number" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                  <textarea name="address" rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Village, District..."></textarea>
                </div>

                <button
                  type="submit"
                  disabled={addStudentMutation.isPending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {addStudentMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Save Student'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStudentToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl text-center"
            >
              <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Student?</h3>
              <p className="text-gray-500 mb-8">This action cannot be undone. All records for this student will be permanently removed.</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => deleteStudentMutation.mutate(studentToDelete)}
                  disabled={deleteStudentMutation.isPending}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {deleteStudentMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Yes, Delete Student'}
                </button>
                <button
                  onClick={() => setStudentToDelete(null)}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
