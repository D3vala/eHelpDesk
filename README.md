# eHelpDesk Supabase Setup Guide

This guide will help you set up Supabase for your eHelpDesk project.

## What's Included

- **Supabase Configuration**: `supabase-config.js` - Contains your Supabase project connection details
- **Database Schema**: `database-schema.sql` - Complete database structure for the helpdesk system
- **Authentication Service**: `auth-service.js` - User authentication and session management
- **Updated Login**: `login.html` - Enhanced with Supabase authentication

## Step 1: Create Your Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up for a free account
2. Create a new project:
   - Choose a project name (e.g., "eHelpDesk")
   - Select your region
   - Set a secure database password
   - Wait for the project to be created (this may take a few minutes)

## Step 2: Configure Your Supabase Project

### 1. Set Up Database Schema

1. Go to your Supabase dashboard
2. Navigate to **Database** → **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `database-schema.sql`
5. Click **Run** to execute the SQL and create all tables

### 2. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Under **Providers**, enable the authentication methods you want:
   - Email/Password (recommended)
   - Google OAuth (optional)
   - Microsoft OAuth (optional)
3. Configure email templates under **Email Templates** if needed

### 3. Set Up Storage (Optional)

If you want to handle file attachments:
1. Go to **Storage** → **Buckets**
2. Create a new bucket called `attachments`
3. Set bucket to public or configure appropriate policies

## Step 3: Update Configuration

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public key**
3. Open `supabase-config.js` and replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';  // Replace with your URL
const SUPABASE_ANON_KEY = 'your-anon-public-key';           // Replace with your anon key
```

## Step 4: Test Your Setup

1. Open `login.html` in your browser
2. Try logging in with the demo accounts:
   - Admin: admin@mapua.edu.ph | Password: admin123
   - Student: student@mapua.edu.ph | Password: student123
   - Staff: staff@mapua.edu.ph | Password: staff123

## Database Structure

The schema includes these main tables:

- **users**: Stores all system users (admins, staff, students)
- **tickets**: All helpdesk tickets and their status
- **attachments**: File attachments for tickets
- **activity_log**: Audit trail of all ticket activities
- **staff_availability**: Staff online/offline status and workload

## Features Implemented

- ✅ User authentication with role-based access
- ✅ Automatic user profile creation
- ✅ Role detection based on email
- ✅ Session management
- ✅ Password reset functionality
- ✅ Demo accounts for testing
- ✅ Backward compatibility with existing login system

## Next Steps

1. **Customize Authentication**: Modify `auth-service.js` to fit your specific authentication needs
2. **Add Real Users**: Remove demo accounts and create real user accounts
3. **Configure OAuth**: Set up Google/Microsoft OAuth for single sign-on
4. **Add Email Templates**: Customize email templates for password reset and verification
5. **Set Up Row Level Security**: Configure RLS policies for data security
6. **Deploy**: Deploy your application to a web server

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your site URL is added in Supabase Authentication settings
2. **Authentication Failures**: Check that email/password authentication is enabled
3. **Database Connection**: Verify your SUPABASE_URL and SUPABASE_ANON_KEY are correct

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Community](https://supabase.com/docs/community)
- Check browser console for JavaScript errors

## Security Notes

- Never commit your actual Supabase keys to version control
- Use environment variables in production
- Configure proper Row Level Security (RLS) policies
- Regularly review and update authentication settings

## Support

For issues specific to this eHelpDesk implementation, check the code comments and documentation. For Supabase-related issues, refer to the official Supabase documentation and community forums.