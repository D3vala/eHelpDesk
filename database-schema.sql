-- eHelpDesk Database Schema for Supabase
-- This schema defines all tables needed for the helpdesk system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores all system users (admins, staff, students)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'student')),
    department VARCHAR(100),
    tier VARCHAR(20), -- For staff: Level 0, Level 1, Level 2, Level 3
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table - stores all helpdesk tickets
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id VARCHAR(50) UNIQUE NOT NULL, -- Format: YYYYMMDD-XXXX
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reporter_email VARCHAR(255) NOT NULL,
    reporter_name VARCHAR(255),
    reporter_phone VARCHAR(20),
    campus_location VARCHAR(100),
    department VARCHAR(100),
    cc_emails TEXT[], -- Array of CC email addresses
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'breached', 'resolved')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assignee_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    sla_target_hours INTEGER DEFAULT 24 -- SLA target in hours
);

-- Attachments table - stores file attachments for tickets
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- in bytes
    file_type VARCHAR(100),
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log table - tracks all ticket activities
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'assigned', 'status_changed', 'comment', 'attachment_added'
    description TEXT,
    metadata JSONB, -- Additional data like old_status, new_status, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff availability table - tracks staff online/offline status
CREATE TABLE staff_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_workload INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_reporter_email ON tickets(reporter_email);
CREATE INDEX idx_activity_ticket_id ON activity_log(ticket_id);
CREATE INDEX idx_activity_created_at ON activity_log(created_at);
CREATE INDEX idx_staff_availability_user_id ON staff_availability(user_id);
CREATE INDEX idx_staff_availability_online ON staff_availability(is_online);

-- Functions to generate ticket IDs
CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TRIGGER AS $$
DECLARE
    suffix_counter INTEGER;
    today_date TEXT;
BEGIN
    -- Get today's date in YYYYMMDD format
    today_date := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the next sequential number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 10) AS INTEGER)), 0) + 1
    INTO suffix_counter
    FROM tickets 
    WHERE ticket_id LIKE today_date || '-%';
    
    -- Generate ticket ID with sequential numbering
    NEW.ticket_id := today_date || '-' || LPAD(suffix_counter::text, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate ticket ID
CREATE TRIGGER trigger_generate_ticket_id
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update timestamps
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_staff_availability_updated_at
    BEFORE UPDATE ON staff_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO users (email, full_name, role, department, tier, status) VALUES
('admin@mapua.edu.ph', 'System Administrator', 'admin', 'IT Department', NULL, 'active'),
('phoenix@mapua.edu.ph', 'Phoenix', 'staff', 'SOIT', 'Level 0', 'active'),
('dominic@mapua.edu.ph', 'Dominic', 'staff', 'DOIT', 'Level 1', 'active'),
('chloie@mapua.edu.ph', 'Chloie', 'staff', 'Registrar', 'Level 2', 'active'),
('naveen@mapua.edu.ph', 'Naveen', 'staff', 'IT Department', 'Level 3', 'active'),
('student@mapua.edu.ph', 'Sample Student', 'student', 'Engineering', NULL, 'active'),
('staff@mapua.edu.ph', 'Sample Staff', 'staff', 'Administration', 'Level 1', 'active');

-- Insert sample tickets
INSERT INTO tickets (subject, description, reporter_email, reporter_name, campus_location, department, status, priority, assignee_id) VALUES
('Wi-Fi Connection Issue', 'Cannot connect to Mapúa Wi-Fi in the library. Tried multiple devices.', 'student@mapua.edu.ph', 'Sample Student', 'Main Campus', 'Engineering', 'in_progress', 'medium', (SELECT id FROM users WHERE email = 'phoenix@mapua.edu.ph')),
('Blackboard Access Problem', 'Getting error when trying to access course materials on Blackboard.', 'student@mapua.edu.ph', 'Sample Student', 'Main Campus', 'Engineering', 'open', 'high', NULL),
('Tuition Payment Error', 'Payment portal showing error when trying to pay tuition fees.', 'student@mapua.edu.ph', 'Sample Student', 'Main Campus', 'Engineering', 'breached', 'urgent', (SELECT id FROM users WHERE email = 'naveen@mapua.edu.ph'));

-- Insert sample activity logs
INSERT INTO activity_log (ticket_id, user_id, action, description) VALUES
((SELECT id FROM tickets WHERE subject = 'Wi-Fi Connection Issue'), (SELECT id FROM users WHERE email = 'student@mapua.edu.ph'), 'created', 'Ticket created by student'),
((SELECT id FROM tickets WHERE subject = 'Wi-Fi Connection Issue'), (SELECT id FROM users WHERE email = 'phoenix@mapua.edu.ph'), 'assigned', 'Ticket assigned to Phoenix'),
((SELECT id FROM tickets WHERE subject = 'Wi-Fi Connection Issue'), (SELECT id FROM users WHERE email = 'phoenix@mapua.edu.ph'), 'status_changed', 'Status changed from open to in_progress'),
((SELECT id FROM tickets WHERE subject = 'Blackboard Access Problem'), (SELECT id FROM users WHERE email = 'student@mapua.edu.ph'), 'created', 'Ticket created by student'),
((SELECT id FROM tickets WHERE subject = 'Tuition Payment Error'), (SELECT id FROM users WHERE email = 'student@mapua.edu.ph'), 'created', 'Ticket created by student'),
((SELECT id FROM tickets WHERE subject = 'Tuition Payment Error'), (SELECT id FROM users WHERE email = 'naveen@mapua.edu.ph'), 'assigned', 'Ticket escalated and assigned to Naveen'),
((SELECT id FROM tickets WHERE subject = 'Tuition Payment Error'), (SELECT id FROM users WHERE email = 'naveen@mapua.edu.ph'), 'status_changed', 'Status changed from open to breached due to SLA breach');

-- Insert sample staff availability
INSERT INTO staff_availability (user_id, is_online, current_workload) VALUES
((SELECT id FROM users WHERE email = 'phoenix@mapua.edu.ph'), true, 14),
((SELECT id FROM users WHERE email = 'dominic@mapua.edu.ph'), true, 12),
((SELECT id FROM users WHERE email = 'chloie@mapua.edu.ph'), true, 5),
((SELECT id FROM users WHERE email = 'naveen@mapua.edu.ph'), false, 0);