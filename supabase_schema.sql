-- School Management System Schema

-- 0. Schema Permissions (Fixes 42501 Permission Denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Roles & User Info)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'teacher', 'accountant')) DEFAULT 'teacher',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Students
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL, -- e.g., '1', '2', '10'
  section TEXT NOT NULL,    -- e.g., 'A', 'B'
  parent_name TEXT,
  phone TEXT,
  address TEXT,
  roll_number INTEGER,
  uses_transport BOOLEAN DEFAULT FALSE,
  transport_fee DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late')) NOT NULL,
  marked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- 4. Fees / Payments
CREATE TABLE IF NOT EXISTS class_fees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_name TEXT UNIQUE NOT NULL,
  monthly_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Tuition', 'Exam', 'Transport'
  month_year TEXT, -- e.g., '2024-03' (for monthly tracking)
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Teachers / Staff
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- e.g., 'Teacher', 'Principal', 'Clerk'
  phone TEXT,
  salary_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Salaries
CREATE TABLE IF NOT EXISTS salaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  month_year TEXT NOT NULL, -- e.g., '2024-03'
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Student Extra Fees (Individual)
CREATE TABLE IF NOT EXISTS student_extra_fees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Exam Fee'
  month_year TEXT NOT NULL, -- e.g., '2024-03'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Class Extra Fees (Class-wide)
CREATE TABLE IF NOT EXISTS class_extra_fees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Exam Fee'
  month_year TEXT NOT NULL, -- e.g., '2024-03'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_name, category, month_year)
);

-- 10. Fund Management
CREATE TABLE IF NOT EXISTS fund_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT CHECK (type IN ('CREDIT', 'DEBIT')) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT CHECK (category IN ('NEW_ADMISSION', 'OLD_ADMISSION', 'MONTHLY_FEES', 'OTHERS')),
  remark TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES --

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_extra_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_extra_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile." ON profiles;
CREATE POLICY "Users can insert own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Fund Transactions: Only admin can view/modify
DROP POLICY IF EXISTS "Admin can view fund transactions" ON fund_transactions;
CREATE POLICY "Admin can view fund transactions" ON fund_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin can insert fund transactions" ON fund_transactions;
CREATE POLICY "Admin can insert fund transactions" ON fund_transactions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Class Fees: Staff can view, only admin/accountant can modify
DROP POLICY IF EXISTS "Staff can view class fees" ON class_fees;
CREATE POLICY "Staff can view class fees" ON class_fees FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admin/Accountant can insert class fees" ON class_fees;
CREATE POLICY "Admin/Accountant can insert class fees" ON class_fees FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can update class fees" ON class_fees;
CREATE POLICY "Admin/Accountant can update class fees" ON class_fees FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can delete class fees" ON class_fees;
CREATE POLICY "Admin/Accountant can delete class fees" ON class_fees FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));

-- Students: All staff can read, only admin/teacher can modify
DROP POLICY IF EXISTS "Staff can view students" ON students;
CREATE POLICY "Staff can view students" ON students FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admin/Teacher can insert students" ON students;
CREATE POLICY "Admin/Teacher can insert students" ON students FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));
DROP POLICY IF EXISTS "Admin/Teacher can update students" ON students;
CREATE POLICY "Admin/Teacher can update students" ON students FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));
DROP POLICY IF EXISTS "Admin/Teacher can delete students" ON students;
CREATE POLICY "Admin/Teacher can delete students" ON students FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

-- Attendance: All staff can read, only admin/teacher can modify
DROP POLICY IF EXISTS "Staff can view attendance" ON attendance;
CREATE POLICY "Staff can view attendance" ON attendance FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admin/Teacher can insert attendance" ON attendance;
CREATE POLICY "Admin/Teacher can insert attendance" ON attendance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));
DROP POLICY IF EXISTS "Admin/Teacher can update attendance" ON attendance;
CREATE POLICY "Admin/Teacher can update attendance" ON attendance FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));
DROP POLICY IF EXISTS "Admin/Teacher can delete attendance" ON attendance;
CREATE POLICY "Admin/Teacher can delete attendance" ON attendance FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

-- Payments: All staff can read, only admin/accountant can modify
DROP POLICY IF EXISTS "Staff can view payments" ON payments;
CREATE POLICY "Staff can view payments" ON payments FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admin/Accountant can insert payments" ON payments;
CREATE POLICY "Admin/Accountant can insert payments" ON payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can update payments" ON payments;
CREATE POLICY "Admin/Accountant can update payments" ON payments FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can delete payments" ON payments;
CREATE POLICY "Admin/Accountant can delete payments" ON payments FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));

-- Staff & Salaries: Only admin can view/modify
DROP POLICY IF EXISTS "Admin can view staff" ON staff;
CREATE POLICY "Admin can view staff" ON staff FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin can insert staff" ON staff;
CREATE POLICY "Admin can insert staff" ON staff FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin can update staff" ON staff;
CREATE POLICY "Admin can update staff" ON staff FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin can delete staff" ON staff;
CREATE POLICY "Admin can delete staff" ON staff FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin can view salaries" ON salaries;
CREATE POLICY "Admin can view salaries" ON salaries FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin can insert salaries" ON salaries;
CREATE POLICY "Admin can insert salaries" ON salaries FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin can update salaries" ON salaries;
CREATE POLICY "Admin can update salaries" ON salaries FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin can delete salaries" ON salaries;
CREATE POLICY "Admin can delete salaries" ON salaries FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Expenses: All staff can view, only admin/accountant can modify
DROP POLICY IF EXISTS "Staff can view expenses" ON expenses;
CREATE POLICY "Staff can view expenses" ON expenses FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admin/Accountant can insert expenses" ON expenses;
CREATE POLICY "Admin/Accountant can insert expenses" ON expenses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can update expenses" ON expenses;
CREATE POLICY "Admin/Accountant can update expenses" ON expenses FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can delete expenses" ON expenses;
CREATE POLICY "Admin/Accountant can delete expenses" ON expenses FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));

-- Student Extra Fees: All staff can read, only admin/accountant can modify
DROP POLICY IF EXISTS "Staff can view extra fees" ON student_extra_fees;
CREATE POLICY "Staff can view extra fees" ON student_extra_fees FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admin/Accountant can insert extra fees" ON student_extra_fees;
CREATE POLICY "Admin/Accountant can insert extra fees" ON student_extra_fees FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can update extra fees" ON student_extra_fees;
CREATE POLICY "Admin/Accountant can update extra fees" ON student_extra_fees FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can delete extra fees" ON student_extra_fees;
CREATE POLICY "Admin/Accountant can delete extra fees" ON student_extra_fees FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));

-- Class Extra Fees: All staff can read, only admin/accountant can modify
DROP POLICY IF EXISTS "Staff can view class extra fees" ON class_extra_fees;
CREATE POLICY "Staff can view class extra fees" ON class_extra_fees FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admin/Accountant can insert class extra fees" ON class_extra_fees;
CREATE POLICY "Admin/Accountant can insert class extra fees" ON class_extra_fees FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can update class extra fees" ON class_extra_fees;
CREATE POLICY "Admin/Accountant can update class extra fees" ON class_extra_fees FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));
DROP POLICY IF EXISTS "Admin/Accountant can delete class extra fees" ON class_extra_fees;
CREATE POLICY "Admin/Accountant can delete class extra fees" ON class_extra_fees FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')));

-- Grant permissions for the new tables
GRANT ALL ON TABLE student_extra_fees TO anon, authenticated;
GRANT ALL ON TABLE class_extra_fees TO anon, authenticated;
GRANT ALL ON TABLE fund_transactions TO anon, authenticated;

-- INDEXES --
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(class_name, section);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_payments_student_date ON payments(student_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_salaries_month ON salaries(month_year);
CREATE INDEX IF NOT EXISTS idx_extra_fees_student_month ON student_extra_fees(student_id, month_year);
CREATE INDEX IF NOT EXISTS idx_class_extra_fees_month ON class_extra_fees(class_name, month_year);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_date ON fund_transactions(created_at);

-- FUNCTIONS --

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin'
      WHEN new.email = 'ershad6732@gmail.com' THEN 'admin'
      WHEN new.email = 'admin@school.com' THEN 'admin'
      ELSE 'teacher'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
