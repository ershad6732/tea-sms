export type Role = 'admin' | 'teacher' | 'accountant';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  class_name: string;
  section: string;
  parent_name: string | null;
  phone: string | null;
  address: string | null;
  roll_number: number | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  category: string;
  month_year: string | null;
  date: string;
  remarks: string | null;
  created_at: string;
}

export interface ClassFee {
  id: string;
  class_name: string;
  monthly_amount: number;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  salary_amount: number | null;
  created_at: string;
}

export interface Salary {
  id: string;
  staff_id: string;
  amount: number;
  month_year: string;
  status: 'paid' | 'pending';
  date: string;
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
}
