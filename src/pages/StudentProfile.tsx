import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Student, Payment } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard,
  Loader2,
  Clock,
  CheckCircle2,
  Download,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import * as htmlToImage from 'html-to-image';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const idCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadIDCard = async () => {
    if (!idCardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(idCardRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = `ID_Card_${student?.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating ID card:', error);
    } finally {
      setIsDownloading(false);
    }
  };

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

      {/* Profile Card & ID Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="h-32 w-32 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-inner">
              {student.name.charAt(0)}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">{student.name}</h2>
                  <p className="text-indigo-600 font-bold mt-1">
                    Class {student.class_name}{student.section} • Roll #{student.roll_number || 'N/A'}
                  </p>
                </div>
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

                {student.uses_transport && (
                  <div className="flex items-center space-x-3 text-gray-600 bg-indigo-50 p-3 rounded-2xl md:col-span-2 border border-indigo-100">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">Transport Service</p>
                      <p className="font-bold text-sm text-indigo-700">
                        Active {profile?.role !== 'teacher' && `• Monthly Fee: ₹${student.transport_fee}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ID Card Preview Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 flex flex-col items-center"
        >
          <div className="w-full flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Digital ID Card</h3>
            <button 
              onClick={downloadIDCard}
              disabled={isDownloading}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              title="Download ID Card"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Scaled down preview of the ID card */}
          <div className="relative scale-[0.65] origin-top -mb-[175px]">
            <div 
              style={{ 
                width: '350px',
                height: '500px',
                borderRadius: '1.5rem',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid #f3f4f6',
                fontFamily: 'Inter, system-ui, sans-serif',
                backgroundColor: '#ffffff',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              {/* Background Pattern */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              </div>

              {/* Header */}
              <div style={{ padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '#4f46e5' }}>
                <div style={{ position: 'absolute', top: '-2.5rem', right: '-2.5rem', width: '8rem', height: '8rem', borderRadius: '9999px', opacity: 0.2, backgroundColor: '#6366f1' }}></div>
                <div style={{ position: 'absolute', bottom: '-2.5rem', left: '-2.5rem', width: '6rem', height: '6rem', borderRadius: '9999px', opacity: 0.2, backgroundColor: '#4338ca' }}></div>
                
                <div style={{ position: 'relative', zIndex: 10 }}>
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '1rem', marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'center', justifyCenter: 'center', marginBottom: '0.5rem', backgroundColor: '#ffffff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                    <ShieldCheck style={{ height: '2rem', width: '2rem', color: '#4f46e5', margin: 'auto' }} />
                  </div>
                  <h1 style={{ fontSize: '1.125rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.25, color: '#ffffff', margin: 0 }}>VIBRANT SCHOOL</h1>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e0e7ff', margin: 0 }}>Student Identity Card</p>
                </div>
              </div>

              {/* Photo Section */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '7rem', height: '7rem', borderRadius: '2rem', border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem', backgroundColor: '#eef2ff', color: '#4f46e5', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                  {student.name.charAt(0)}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textAlign: 'center', lineHeight: 1.25, color: '#111827', margin: 0 }}>{student.name}</h2>
                <div style={{ marginTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', borderRadius: '9999px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                  Class {student.class_name}{student.section}
                </div>
              </div>

              {/* Details Section */}
              <div style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f9fafb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Roll Number</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>{student.roll_number || 'N/A'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Academic Year</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>2025-26</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Parent/Guardian</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', margin: 0 }}>{student.parent_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Contact Number</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', margin: 0 }}>{student.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Residential Address</p>
                    <p style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.625, color: '#6b7280', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{student.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5' }}>
                    <ShieldCheck style={{ height: '1rem', width: '1rem', color: '#ffffff' }} />
                  </div>
                  <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Verified Identity</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ height: '2rem', width: '6rem', borderRadius: '0.5rem', opacity: 0.5, backgroundColor: '#e5e7eb', marginBottom: '0.25rem' }}></div>
                  <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', margin: 0 }}>Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-gray-400 font-bold text-center mt-4">
            Official student identification for the current academic session.
          </p>
        </motion.div>
      </div>

      {/* Hidden ID Card for Generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={idCardRef}
          style={{ 
            width: '350px',
            height: '500px',
            borderRadius: '1.5rem',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid #f3f4f6',
            fontFamily: 'Inter, system-ui, sans-serif',
            backgroundColor: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Background Pattern */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          </div>

          {/* Header */}
          <div style={{ padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '#4f46e5' }}>
            <div style={{ position: 'absolute', top: '-2.5rem', right: '-2.5rem', width: '8rem', height: '8rem', borderRadius: '9999px', opacity: 0.2, backgroundColor: '#6366f1' }}></div>
            <div style={{ position: 'absolute', bottom: '-2.5rem', left: '-2.5rem', width: '6rem', height: '6rem', borderRadius: '9999px', opacity: 0.2, backgroundColor: '#4338ca' }}></div>
            
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '1rem', marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'center', justifyCenter: 'center', marginBottom: '0.5rem', backgroundColor: '#ffffff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <ShieldCheck style={{ height: '2rem', width: '2rem', color: '#4f46e5', margin: 'auto' }} />
              </div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.25, color: '#ffffff', margin: 0 }}>VIBRANT SCHOOL</h1>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e0e7ff', margin: 0 }}>Student Identity Card</p>
            </div>
          </div>

          {/* Photo Section */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '7rem', height: '7rem', borderRadius: '2rem', border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem', backgroundColor: '#eef2ff', color: '#4f46e5', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              {student.name.charAt(0)}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textAlign: 'center', lineHeight: 1.25, color: '#111827', margin: 0 }}>{student.name}</h2>
            <div style={{ marginTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', borderRadius: '9999px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
              Class {student.class_name}{student.section}
            </div>
          </div>

          {/* Details Section */}
          <div style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f9fafb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Roll Number</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>{student.roll_number || 'N/A'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Academic Year</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>2025-26</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Parent/Guardian</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', margin: 0 }}>{student.parent_name || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Contact Number</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', margin: 0 }}>{student.phone || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Residential Address</p>
                <p style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.625, color: '#6b7280', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{student.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5' }}>
                <ShieldCheck style={{ height: '1rem', width: '1rem', color: '#ffffff' }} />
              </div>
              <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 }}>Verified Identity</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ height: '2rem', width: '6rem', borderRadius: '0.5rem', opacity: 0.5, backgroundColor: '#e5e7eb', marginBottom: '0.25rem' }}></div>
              <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', margin: 0 }}>Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Records */}
      {profile?.role !== 'teacher' && (
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
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Remarks</th>
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
                            {payment.month_year ? new Date(payment.month_year + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-700">{payment.category}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-500 italic">{payment.remarks || '—'}</p>
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
      )}
    </div>
  );
}
