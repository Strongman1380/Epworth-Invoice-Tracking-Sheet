// Authentication Functions
// Supports both Local Mode (simple) and Supabase Mode

// ============================================
// LOCAL AUTHENTICATION MODE
// ============================================
// Set this to true for simple local auth (no Supabase needed)
const USE_LOCAL_AUTH = true;

// Default admin account (change password after first login)
const DEFAULT_ADMIN = {
    id: 'admin-001',
    email: 'bhinrichs@epworthfamilyresources.org',
    password: 'baseball1380',
    displayName: 'Brandon Hinrichs',
    role: 'admin',
    passwordChangeRequired: false,
    createdAt: new Date().toISOString()
};

// Initialize local users database
function initLocalUsers() {
    let users = JSON.parse(localStorage.getItem('local_users') || '[]');

    // Add default admin if not exists
    if (!users.find(u => u.email === DEFAULT_ADMIN.email)) {
        users.push(DEFAULT_ADMIN);
        localStorage.setItem('local_users', JSON.stringify(users));
    }

    return users;
}

// Get all local users
function getLocalUsers() {
    return JSON.parse(localStorage.getItem('local_users') || '[]');
}

// Save local users
function saveLocalUsers(users) {
    localStorage.setItem('local_users', JSON.stringify(users));
}

// Local login function
async function localLogin(email, password) {
    // Defensive: reinitialize users if empty (handles cleared localStorage)
    let users = getLocalUsers();
    if (users.length === 0) {
        users = initLocalUsers();
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        throw new Error('User not found. Please check your email.');
    }

    if (user.password !== password) {
        throw new Error('Invalid password.');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    saveLocalUsers(users);

    // Set current user globals
    currentUser = { id: user.id, email: user.email };
    currentUserData = { ...user };
    delete currentUserData.password; // Don't expose password

    // Store session
    localStorage.setItem('local_session', JSON.stringify({
        userId: user.id,
        email: user.email,
        loginTime: new Date().toISOString()
    }));

    return user;
}

// Local signup (admin only - for adding staff)
async function localSignup(email, password, displayName, role = 'staff') {
    const users = getLocalUsers();

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('User with this email already exists.');
    }

    const newUser = {
        id: 'user-' + Date.now(),
        email: email,
        password: password,
        displayName: displayName,
        role: role,
        passwordChangeRequired: false,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveLocalUsers(users);

    return newUser;
}

// Local password change
async function localChangePassword(currentPassword, newPassword) {
    const users = getLocalUsers();
    const user = users.find(u => u.id === currentUser.id);

    if (!user) {
        throw new Error('User not found');
    }

    if (user.password !== currentPassword) {
        throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    user.lastPasswordChange = new Date().toISOString();
    user.passwordChangeRequired = false;
    saveLocalUsers(users);

    currentUserData = { ...user };
    delete currentUserData.password;

    return true;
}

// Check local session on page load
async function checkLocalSession() {
    const session = JSON.parse(localStorage.getItem('local_session') || 'null');

    if (session) {
        const users = getLocalUsers();
        const user = users.find(u => u.id === session.userId);

        if (user) {
            currentUser = { id: user.id, email: user.email };
            currentUserData = { ...user };
            delete currentUserData.password;
            return user;
        }
    }

    return null;
}

// Local logout
function localLogout() {
    localStorage.removeItem('local_session');
    currentUser = null;
    currentUserData = null;
}

// Delete local user (admin only)
async function deleteLocalUser(userId) {
    if (currentUserData?.role !== 'admin') {
        throw new Error('Admin access required');
    }

    let users = getLocalUsers();
    users = users.filter(u => u.id !== userId);
    saveLocalUsers(users);

    return true;
}

// Update local user (admin only)
async function updateLocalUser(userId, updates) {
    if (currentUserData?.role !== 'admin') {
        throw new Error('Admin access required');
    }

    const users = getLocalUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('User not found');
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    saveLocalUsers(users);

    return users[userIndex];
}

// Initialize local users on load
if (USE_LOCAL_AUTH) {
    initLocalUsers();
}

// ============================================
// SUPABASE AUTHENTICATION (Original)
// ============================================

// Sign up function
async function signup(email, password, displayName) {
  try {
    // Create auth user
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    const user = data.user;

    // Create profile in users table
    const { error: profileError } = await supabaseClient
      .from('users')
      .insert({
        id: user.id,
        email: email,
        displayName: displayName,
        role: 'staff',
        passwordChangeRequired: false,
        lastPasswordChange: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't throw here - the auth user was created, profile creation might fail due to RLS
      // The user can still log in and the profile will be created when they confirm email
    }

    return user;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

// Email/Password Login function
async function login(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    const timestamp = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ lastLogin: timestamp })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update last login:', updateError);
    }

    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Change password function
async function changePassword(currentPassword, newPassword) {
  try {
    if (!currentUser?.email) {
      throw new Error('No authenticated user');
    }

    // Reauthenticate user
    const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword
    });

    if (reauthError) {
      throw reauthError;
    }

    // Update password
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: newPassword
    });
    if (updateError) {
      throw updateError;
    }

    const timestamp = new Date().toISOString();
    const history = Array.isArray(currentUserData?.passwordChangeHistory)
      ? [...currentUserData.passwordChangeHistory, timestamp]
      : [timestamp];

    const { data, error: profileError } = await supabaseClient
      .from('users')
      .update({
        passwordChangeRequired: false,
        lastPasswordChange: timestamp,
        passwordChangeHistory: history
      })
      .eq('id', currentUser.id)
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    currentUserData = data;
    return true;
  } catch (error) {
    console.error('Password change error:', error);
    throw error;
  }
}

// Validate password strength
function validatePassword(password) {
  const minLength = 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Password reset (for admin)
async function resetUserPassword(userId) {
  try {
    if (currentUserData?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const timestamp = new Date().toISOString();
    const { error } = await supabaseClient
      .from('users')
      .update({
        passwordChangeRequired: true,
        lastPasswordChange: timestamp
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

// Forgot password
async function sendPasswordResetEmail(email) {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Password reset email error:', error);
    throw error;
  }
}
