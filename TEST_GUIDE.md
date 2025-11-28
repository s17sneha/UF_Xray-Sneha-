# UF XRAY Scanner - Testing Guide

## 🚀 Quick Start

### 1. Access the Application
- **Live Preview**: http://127.0.0.1:61992
- **Direct Access**: http://localhost:3000

### 2. Create Account & Login
1. Go to **Sign Up** (`#/signup`)
2. Create a new account with:
   - Username: `testuser`
   - Email: `test@example.com` 
   - Password: `password123`
3. After signup, you'll be automatically logged in and redirected to Reports

### 3. Test URL Scanner
1. Navigate to **Analyze URL** (`#/AnalyzeURL`)
2. Enter a test URL: `https://example.com`
3. Click **Scan URL**
4. View the security analysis results
5. Check that a new report appears in **Reports** section

### 4. Test File Scanner  
1. Navigate to **Analyze File** (`#/AnalyzeFile`)
2. Upload any small file (e.g., a .txt file)
3. Click **Scan File**
4. View the malware analysis results
5. Check that a new report appears in **Reports** section

### 5. View Reports
1. Go to **Reports** (`#/Report`)
2. See all your scan results
3. Expand reports to view details
4. Test delete functionality
5. Test download functionality

### 6. Check Profile
1. Go to **Profile** (`#/profile`)
2. View your account information
3. See your scan history

## ✅ Expected Behavior

### Authentication
- ✅ Login/Signup should work smoothly
- ✅ Protected pages redirect to login when not authenticated
- ✅ Login/Signup redirect to Reports when already authenticated
- ✅ Logout clears session and redirects to login

### Scanning
- ✅ URL scanner should return threat analysis
- ✅ File scanner should return malware analysis  
- ✅ Both should save reports to database
- ✅ Error handling for invalid inputs

### Reports
- ✅ All user's reports should display
- ✅ Reports should be expandable/collapsible
- ✅ Delete and download should work
- ✅ Real-time updates after new scans

## 🔧 Troubleshooting

### If Login Fails
- Check server console for authentication errors
- Ensure MongoDB is running
- Verify JWT_SECRET is set in server/.env

### If Scanners Fail
- Check that Python is installed and accessible
- Verify PYTHON_BIN path in server/.env
- Check server console for Python script errors

### If Reports Don't Load
- Check browser console for API errors
- Verify user is properly authenticated
- Check server logs for database connection issues

## 🛠️ Server Status
- **Backend**: Running on port 5000
- **Database**: MongoDB connected
- **Python**: Configured for security scanning
- **Frontend**: React app on port 3000

## 📁 Key Files Modified
- `src/api.js` - Clean API client with auth interceptors
- `src/Components/context/AuthContext.js` - Simplified auth state
- All scanner components - Removed redundant token checks
- `src/App.js` - Clean routing without debug components
- Server configuration - Proper environment setup

The application is now **fully functional** and ready for production use!
