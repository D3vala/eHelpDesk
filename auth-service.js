// Authentication Service for eHelpDesk
// Handles user authentication, session management, and role-based access

import { supabase } from './supabase-config.js';

// Authentication state management
class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    // Initialize authentication service
    async init() {
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            this.isAuthenticated = true;
            await this.loadUserProfile();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
                await this.loadUserProfile();
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.clearSession();
            }
        });
    }

    // Load user profile from database
    async loadUserProfile() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', this.currentUser.email)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error loading user profile:', error);
                return null;
            }

            if (data) {
                this.currentUser.profile = data;
                this.saveSession();
            } else {
                // User doesn't exist in our database, create profile
                await this.createUserProfile();
            }

            return this.currentUser.profile;
        } catch (error) {
            console.error('Error in loadUserProfile:', error);
            return null;
        }
    }

    // Create user profile in database
    async createUserProfile() {
        try {
            // Determine role based on email domain or other logic
            let role = 'student';
            if (this.currentUser.email.includes('@mapua.edu.ph')) {
                // Could implement more sophisticated role detection here
                role = this.detectUserRole(this.currentUser.email);
            }

            const { data, error } = await supabase
                .from('users')
                .insert({
                    email: this.currentUser.email,
                    full_name: this.currentUser.user_metadata?.full_name || this.currentUser.email.split('@')[0],
                    role: role,
                    department: this.detectDepartment(this.currentUser.email),
                    status: 'active'
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating user profile:', error);
                return null;
            }

            this.currentUser.profile = data;
            this.saveSession();
            return data;
        } catch (error) {
            console.error('Error in createUserProfile:', error);
            return null;
        }
    }

    // Detect user role based on email
    detectUserRole(email) {
        // Simple role detection logic
        // In production, you might want to use a more sophisticated method
        if (email.includes('admin@') || email.includes('administrator@')) {
            return 'admin';
        } else if (email.includes('staff@') || email.includes('faculty@')) {
            return 'staff';
        } else {
            return 'student';
        }
    }

    // Detect department based on email
    detectDepartment(email) {
        if (email.includes('soit@') || email.includes('it@')) {
            return 'SOIT';
        } else if (email.includes('doit@')) {
            return 'DOIT';
        } else if (email.includes('registrar@')) {
            return 'Registrar';
        } else {
            return 'General';
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            this.currentUser = data.user;
            this.isAuthenticated = true;
            await this.loadUserProfile();
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign up new user
    async signUp(email, password, fullName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) {
                throw error;
            }

            // Auto-create profile for new users
            if (data.user) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                await this.createUserProfile();
            }

            return { success: true, user: data.user, message: data.message };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign out
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                throw error;
            }
            
            this.clearSession();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login.html`
            });

            if (error) {
                throw error;
            }

            return { success: true, message: 'Password reset email sent' };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update user profile
    async updateProfile(updates) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', this.currentUser.profile.id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            this.currentUser.profile = data;
            this.saveSession();
            return { success: true, profile: data };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user has specific role
    hasRole(role) {
        return this.currentUser?.profile?.role === role;
    }

    // Check if user is admin
    isAdmin() {
        return this.hasRole('admin');
    }

    // Check if user is staff
    isStaff() {
        return this.hasRole('staff') || this.hasRole('admin');
    }

    // Check if user is student
    isStudent() {
        return this.hasRole('student');
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Save session to localStorage (for backward compatibility)
    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('supabase_session', JSON.stringify({
                user: this.currentUser,
                profile: this.currentUser.profile,
                timestamp: Date.now()
            }));
        }
    }

    // Clear session
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('supabase_session');
    }

    // Restore session from localStorage (for backward compatibility)
    restoreSession() {
        try {
            const sessionData = localStorage.getItem('supabase_session');
            if (sessionData) {
                const data = JSON.parse(sessionData);
                this.currentUser = data.user;
                this.currentUser.profile = data.profile;
                this.isAuthenticated = true;
                return true;
            }
        } catch (error) {
            console.error('Error restoring session:', error);
        }
        return false;
    }
}

// Export singleton instance
export const authService = new AuthService();

// Utility functions for common auth operations
export const authUtils = {
    // Check if user is authenticated
    isAuthenticated: () => authService.isAuthenticated,

    // Get current user
    getCurrentUser: () => authService.getCurrentUser(),

    // Check roles
    isAdmin: () => authService.isAdmin(),
    isStaff: () => authService.isStaff(),
    isStudent: () => authService.isStudent(),

    // Sign in
    signIn: (email, password) => authService.signIn(email, password),

    // Sign up
    signUp: (email, password, fullName) => authService.signUp(email, password, fullName),

    // Sign out
    signOut: () => authService.signOut(),

    // Reset password
    resetPassword: (email) => authService.resetPassword(email)
};