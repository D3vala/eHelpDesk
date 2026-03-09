-- Row Level Security (RLS) Policies for eHelpDesk
-- These policies ensure data security and proper access control

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        (SELECT role FROM users WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        auth.uid(),
        (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user department
CREATE OR REPLACE FUNCTION get_user_department()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT department FROM users WHERE id = get_user_id());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('staff', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
FOR ALL TO authenticated
USING (is_admin());

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
FOR ALL TO authenticated
USING (id = get_user_id());

-- Admins can manage all users
CREATE POLICY "Admins can manage all users" ON users
FOR ALL TO authenticated
WITH CHECK (is_admin());

-- ========================================
-- TICKETS TABLE POLICIES
-- ========================================

-- Students can view their own tickets
CREATE POLICY "Students can view own tickets" ON tickets
FOR SELECT TO authenticated
USING (
    get_user_role() = 'student' 
    AND reporter_email = (SELECT email FROM users WHERE id = get_user_id())
);

-- Students can create tickets
CREATE POLICY "Students can create tickets" ON tickets
FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'student'
    AND reporter_email = (SELECT email FROM users WHERE id = get_user_id())
);

-- Students can update their own open tickets (only certain fields)
CREATE POLICY "Students can update own open tickets" ON tickets
FOR UPDATE TO authenticated
USING (
    get_user_role() = 'student'
    AND reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    AND status IN ('open', 'in_progress')
)
WITH CHECK (
    get_user_role() = 'student'
    AND reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    AND status IN ('open', 'in_progress')
);

-- Staff can view tickets in their department or assigned to them
CREATE POLICY "Staff can view department tickets" ON tickets
FOR SELECT TO authenticated
USING (
    is_staff()
    AND (
        assignee_id = get_user_id()
        OR department = get_user_department()
        OR reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Staff can update tickets they can view
CREATE POLICY "Staff can update department tickets" ON tickets
FOR ALL TO authenticated
USING (
    is_staff()
    AND (
        assignee_id = get_user_id()
        OR department = get_user_department()
        OR reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets" ON tickets
FOR ALL TO authenticated
USING (is_admin());

-- ========================================
-- ATTACHMENTS TABLE POLICIES
-- ========================================

-- Students can view attachments on their own tickets
CREATE POLICY "Students can view own attachments" ON attachments
FOR SELECT TO authenticated
USING (
    get_user_role() = 'student'
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Students can create attachments on their own tickets
CREATE POLICY "Students can create own attachments" ON attachments
FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'student'
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Staff can view attachments on tickets they can access
CREATE POLICY "Staff can view department attachments" ON attachments
FOR SELECT TO authenticated
USING (
    is_staff()
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE assignee_id = get_user_id()
        OR department = get_user_department()
        OR reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Staff can create attachments on tickets they can access
CREATE POLICY "Staff can create department attachments" ON attachments
FOR INSERT TO authenticated
WITH CHECK (
    is_staff()
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE assignee_id = get_user_id()
        OR department = get_user_department()
        OR reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Admins can view all attachments
CREATE POLICY "Admins can view all attachments" ON attachments
FOR ALL TO authenticated
USING (is_admin());

-- ========================================
-- ACTIVITY LOG TABLE POLICIES
-- ========================================

-- Students can view activity on their own tickets
CREATE POLICY "Students can view own activity" ON activity_log
FOR SELECT TO authenticated
USING (
    get_user_role() = 'student'
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Students can create activity on their own tickets
CREATE POLICY "Students can create own activity" ON activity_log
FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'student'
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
    AND user_id = get_user_id()
);

-- Staff can view activity on tickets they can access
CREATE POLICY "Staff can view department activity" ON activity_log
FOR SELECT TO authenticated
USING (
    is_staff()
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE assignee_id = get_user_id()
        OR department = get_user_department()
        OR reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
);

-- Staff can create activity on tickets they can access
CREATE POLICY "Staff can create department activity" ON activity_log
FOR INSERT TO authenticated
WITH CHECK (
    is_staff()
    AND ticket_id IN (
        SELECT id FROM tickets 
        WHERE assignee_id = get_user_id()
        OR department = get_user_department()
        OR reporter_email = (SELECT email FROM users WHERE id = get_user_id())
    )
    AND user_id = get_user_id()
);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity" ON activity_log
FOR ALL TO authenticated
USING (is_admin());

-- ========================================
-- STAFF AVAILABILITY TABLE POLICIES
-- ========================================

-- Users can view their own availability
CREATE POLICY "Users can view own availability" ON staff_availability
FOR ALL TO authenticated
USING (user_id = get_user_id());

-- Admins can view all staff availability
CREATE POLICY "Admins can view all availability" ON staff_availability
FOR SELECT TO authenticated
USING (is_admin());

-- Admins can manage all staff availability
CREATE POLICY "Admins can manage all availability" ON staff_availability
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ========================================
-- Additional Security Measures
-- ========================================

-- Ensure that only authenticated users can access any data
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE activity_log FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_availability FORCE ROW LEVEL SECURITY;

-- Note: The FORCE ROW LEVEL SECURITY ensures that even the table owner
-- must comply with RLS policies, providing maximum security