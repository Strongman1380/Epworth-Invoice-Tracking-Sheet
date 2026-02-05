import { useState } from "react";
import { Button } from "./Button";
import { getAuth } from "../config/firebase";

export default function UserManagement({ isAdmin }) {
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const auth = getAuth();

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h2 className="font-semibold mb-2">Access Denied</h2>
          <p>You must be an administrator to access user management.</p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      // Validate inputs
      if (!newUserEmail || !newUserPassword) {
        setCreateError("Email and password are required");
        setIsCreating(false);
        return;
      }

      if (newUserPassword.length < 6) {
        setCreateError("Password must be at least 6 characters");
        setIsCreating(false);
        return;
      }

      // Get the current user's ID token for authentication
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setCreateError("You must be signed in to create users");
        setIsCreating(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Call the Cloud Function to create the user
      const response = await fetch("/api/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          displayName: newUserDisplayName || undefined,
        }),
      });

      let responseBody = "";
      let data = {};
      try {
        responseBody = await response.text();
        if (responseBody) {
          try {
            data = JSON.parse(responseBody);
          } catch (parseError) {
            console.warn("User creation API returned non-JSON response", {
              status: response.status,
              preview: responseBody.slice(0, 200),
            });
            data = { message: responseBody };
          }
        }
      } catch (readError) {
        console.warn("Failed to read user creation API response", readError);
      }

      if (!response.ok) {
        if (response.status === 404) {
          const devHint = import.meta.env?.DEV
            ? "If you are running locally, start the Vercel dev server so the /api routes are available."
            : "The serverless function was not found. Ensure the API is deployed.";
          throw new Error(`User creation endpoint not available. ${devHint}`);
        }
        throw new Error(data.message || data.error || `Failed to create user (HTTP ${response.status})`);
      }

      setCreateSuccess(`User ${newUserEmail} created successfully! The user can now sign in.`);

      // Clear form
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserDisplayName("");

    } catch (error) {
      console.error("User creation error:", error);
      setCreateError(error.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>

        {/* Info about user creation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-blue-800">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            User Creation
          </h3>
          <p className="text-sm">
            Users created here can immediately sign in with their email and password. They'll remain signed in across sessions until they explicitly sign out.
          </p>
          <p className="text-sm mt-2">
            <strong>Note:</strong> You will remain signed in as admin after creating users. The new user accounts are created server-side.
          </p>
        </div>

        {/* Create User Form */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-600">*</span>
              </label>
              <input
                id="newUserEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label htmlFor="newUserPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-600">*</span> <span className="text-gray-500 font-normal">(minimum 6 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="newUserPassword"
                  type={showPassword ? "text" : "password"}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed pr-10"
                  placeholder="Enter a secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isCreating}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newUserDisplayName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                id="newUserDisplayName"
                type="text"
                value={newUserDisplayName}
                onChange={(e) => setNewUserDisplayName(e.target.value)}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="John Doe"
              />
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
                {createSuccess}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isCreating}
              iconName={isCreating ? "Loader" : "UserPlus"}
              className="w-full"
            >
              {isCreating ? "Creating User..." : "Create User"}
            </Button>
          </form>
        </div>

        {/* Future Enhancement: List existing users */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User List</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600 text-sm">
            <p>User list feature coming soon. To view existing users, visit the Firebase Console:</p>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline mt-2 inline-block"
            >
              Open Firebase Console →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
