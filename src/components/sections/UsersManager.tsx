import React, { useState, useEffect } from 'react';
import { ref, get, set, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Users, Search, Mail, Calendar, User, Trash2, Loader, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  uid?: string;
  name: string;
  email: string;
  photoUrl?: string;
  createdAt?: number;
}

export const UsersManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ [key: string]: UserData }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<{ [key: string]: UserData }>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = Object.fromEntries(
        Object.entries(users).filter(([id, user]) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          id.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        setUsers(snapshot.val());
      }
    } catch (error: any) {
      toast.error(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // Delete user data
        const userRef = ref(database, `users/${userId}`);
        await remove(userRef);

        // Also delete related data (bookmarks, interactions, etc.)
        const userInteractionsRef = ref(database, `user_interactions/${userId}`);
        const userBookmarksRef = ref(database, `user_bookmarks/${userId}`);
        const userLikesRef = ref(database, `user_likes/${userId}`);

        await Promise.all([
          remove(userInteractionsRef),
          remove(userBookmarksRef),
          remove(userLikesRef)
        ]);

        const updatedUsers = { ...users };
        delete updatedUsers[userId];
        setUsers(updatedUsers);

        toast.success('User deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete user: ${error.message}`);
      }
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserStats = async (userId: string) => {
    try {
      const [bookmarksSnapshot, interactionsSnapshot, likesSnapshot] = await Promise.all([
        get(ref(database, `user_bookmarks/${userId}`)),
        get(ref(database, `user_interactions/${userId}`)),
        get(ref(database, `user_likes/${userId}`))
      ]);

      const bookmarks = bookmarksSnapshot.exists() ? Object.keys(bookmarksSnapshot.val()).length : 0;
      const interactions = interactionsSnapshot.exists() ? Object.keys(interactionsSnapshot.val()).length : 0;
      const likes = likesSnapshot.exists() ? Object.keys(likesSnapshot.val()).length : 0;

      return { bookmarks, interactions, likes };
    } catch (error) {
      return { bookmarks: 0, interactions: 0, likes: 0 };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Users Management</h2>
        </div>
        <div className="text-sm text-gray-500">
          {Object.keys(users).length} total users
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users by name, email, or ID..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">User</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Contact</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Joined</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">User ID</th>
                <th className="text-right py-3 px-6 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(filteredUsers).map(([userId, user]) => (
                <tr key={userId} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{user.name || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="text-sm">{user.email || 'No email'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-sm">{formatDate(user.createdAt)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {userId}
                    </code>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleDeleteUser(userId)}
                      className="inline-flex items-center px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {Object.keys(filteredUsers).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching "{searchTerm}"</p>
                <p className="text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                <p className="text-sm">Users will appear here when they sign up</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {Object.keys(users).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-blue-900">{Object.keys(users).length}</div>
                <div className="text-blue-700">Total Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {Object.values(users).filter(u => u.email).length}
                </div>
                <div className="text-green-700">Verified Emails</div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {Object.values(users).filter(u => u.createdAt && u.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
                </div>
                <div className="text-purple-700">New This Week</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};