import React, { useState } from 'react';
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
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Students() {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [usesTransport, setUsesTransport] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('roll_number', { ascending: true })
        .order('name', { ascending: true });
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
      setUsesTransport(false);
      alert('Student saved successfully!');
    }
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (updatedStudent: Partial<Student>) => {
      if (!profile || !['admin', 'teacher'].includes(profile.role)) {
        const errorMsg = 'Permission denied: Only admins and teachers can edit students.';
        alert(errorMsg);
        throw new Error(errorMsg);
      }

      const { data, error } = await supabase
        .from('students')
        .update(updatedStudent)
        .eq('id', updatedStudent.id)
        .select();
      
      if (error) {
        console.error('Error updating student:', error);
        alert(`Failed to update student: ${error.message}`);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsEditModalOpen(false);
      setSelectedStudentForEdit(null);
      setUsesTransport(false);
      alert('Student updated successfully!');
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

  const bulkImportMutation = useMutation({
    mutationFn: async (students: any[]) => {
      if (!profile || !['admin', 'teacher'].includes(profile.role)) {
        throw new Error('Permission denied: Only admins and teachers can import students.');
      }

      const formattedStudents = students.map(s => ({
        name: s.name,
        roll_number: s.roll_number ? parseInt(s.roll_number) : null,
        class_name: String(s.class_name),
        section: s.section || 'A',
        parent_name: s.parent_name || null,
        phone: s.phone || null,
        address: s.address || null,
        uses_transport: String(s.uses_transport).toLowerCase() === 'true' || s.uses_transport === '1' || s.uses_transport === 1,
        transport_fee: s.transport_fee ? parseFloat(s.transport_fee) : 0,
      }));

      const { data, error } = await supabase
        .from('students')
        .insert(formattedStudents)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsBulkModalOpen(false);
      setBulkData([]);
      setBulkError(null);
      alert('Bulk import successful!');
    },
    onError: (error: any) => {
      setBulkError(error.message);
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setBulkError('Error parsing CSV file. Please check the format.');
          return;
        }
        
        // Basic validation of headers
        const requiredHeaders = ['name', 'class_name'];
        const headers = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          setBulkError(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        setBulkData(results.data);
      },
      error: (error) => {
        setBulkError(`Error: ${error.message}`);
      }
    });
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        name: 'John Doe',
        roll_number: '101',
        class_name: '5',
        section: 'A',
        parent_name: 'Robert Doe',
        phone: '9876543210',
        address: '123 Street, Village',
        uses_transport: 'false',
        transport_fee: '0'
      },
      {
        name: 'Jane Smith',
        roll_number: '102',
        class_name: '6',
        section: 'B',
        parent_name: 'Mary Smith',
        phone: '9876543211',
        address: '456 Avenue, Town',
        uses_transport: 'true',
        transport_fee: '500'
      }
    ];
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.parent_name?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = selectedClass === 'All' || s.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  const classes = ['All', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4'];

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
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-600 font-bold flex items-center gap-2 hover:bg-gray-50 transition-all"
          >
            <Upload className="h-5 w-5" />
            <span className="hidden md:inline">Bulk Import</span>
          </button>
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
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudentForEdit(student);
                    setUsesTransport(student.uses_transport);
                    setIsEditModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                >
                  <User className="h-5 w-5" />
                </button>
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

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Bulk Import Students</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-3xl text-center space-y-4">
                  <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Upload CSV File</p>
                    <p className="text-xs text-gray-500 mt-1">Select a CSV file with student details</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Select File
                  </label>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Download className="h-4 w-4 text-indigo-600" />
                    Import Instructions
                  </h3>
                  <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                    <li>Download the sample CSV to see the required format.</li>
                    <li>Required columns: <span className="font-bold text-gray-700">name, class_name</span>.</li>
                    <li>Optional columns: <span className="font-bold text-gray-700">roll_number, section, parent_name, phone, address, uses_transport, transport_fee</span>.</li>
                    <li>For <span className="font-bold text-gray-700">uses_transport</span>, use 'true' or 'false'.</li>
                  </ul>
                  <button
                    onClick={downloadSampleCSV}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download Sample CSV
                  </button>
                </div>

                {bulkError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold">{bulkError}</p>
                  </div>
                )}

                {bulkData.length > 0 && !bulkError && (
                  <div className="p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-xs font-bold">Ready to import {bulkData.length} students</p>
                  </div>
                )}

                <button
                  onClick={() => bulkImportMutation.mutate(bulkData)}
                  disabled={bulkData.length === 0 || !!bulkError || bulkImportMutation.isPending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-300 disabled:shadow-none"
                >
                  {bulkImportMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : `Import ${bulkData.length} Students`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  roll_number: formData.get('roll_number') ? parseInt(formData.get('roll_number') as string) : null,
                  class_name: formData.get('class_name') as string,
                  section: formData.get('section') as string,
                  parent_name: formData.get('parent_name') as string,
                  phone: formData.get('phone') as string,
                  address: formData.get('address') as string,
                  uses_transport: usesTransport,
                  transport_fee: usesTransport ? parseFloat(formData.get('transport_fee') as string) : 0,
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input name="name" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter student name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Roll Number</label>
                  <input name="roll_number" type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter roll number" />
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

                <div className="bg-indigo-50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-indigo-900">Uses Vehicle Service</label>
                    <input 
                      type="checkbox" 
                      name="uses_transport"
                      checked={usesTransport}
                      onChange={(e) => setUsesTransport(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                    />
                  </div>
                  {usesTransport && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Monthly Transport Fee (₹)</label>
                      <input 
                        name="transport_fee" 
                        type="number" 
                        required 
                        className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="e.g. 500" 
                      />
                    </motion.div>
                  )}
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

      {/* Edit Student Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedStudentForEdit && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Student</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateStudentMutation.mutate({
                  id: selectedStudentForEdit.id,
                  name: formData.get('name') as string,
                  roll_number: formData.get('roll_number') ? parseInt(formData.get('roll_number') as string) : null,
                  class_name: formData.get('class_name') as string,
                  section: formData.get('section') as string,
                  parent_name: formData.get('parent_name') as string,
                  phone: formData.get('phone') as string,
                  address: formData.get('address') as string,
                  uses_transport: usesTransport,
                  transport_fee: usesTransport ? parseFloat(formData.get('transport_fee') as string) : 0,
                });
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input name="name" defaultValue={selectedStudentForEdit.name} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Roll Number</label>
                  <input name="roll_number" type="number" defaultValue={selectedStudentForEdit.roll_number || ''} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
                    <select name="class_name" defaultValue={selectedStudentForEdit.class_name} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Section</label>
                    <select name="section" defaultValue={selectedStudentForEdit.section} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Parent Name</label>
                  <input name="parent_name" defaultValue={selectedStudentForEdit.parent_name || ''} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" defaultValue={selectedStudentForEdit.phone || ''} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                  <textarea name="address" defaultValue={selectedStudentForEdit.address || ''} rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-indigo-900">Uses Vehicle Service</label>
                    <input 
                      type="checkbox" 
                      name="uses_transport"
                      checked={usesTransport}
                      onChange={(e) => setUsesTransport(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                    />
                  </div>
                  {usesTransport && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Monthly Transport Fee (₹)</label>
                      <input 
                        name="transport_fee" 
                        type="number" 
                        required 
                        defaultValue={selectedStudentForEdit.transport_fee || 0}
                        className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={updateStudentMutation.isPending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {updateStudentMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Update Student'}
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
