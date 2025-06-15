import React, { useState, useEffect } from 'react';
import { ref, get, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Heart, Trash2, Loader, User, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface LikeData {
  postId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  postTitle?: string;
}

export const LikesManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikeData[]>([]);
  const [users, setUsers] = useState<{ [key: string]: any }>({});
  const [news, setNews] = useState<{ [key: string]: any }>({});
  const [stats, setStats] = useState({
    totalLikes: 0,
    uniqueUsers: 0,
    likedPosts: 0,
    topPost: { title: '', likes: 0 }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [likesSnapshot, usersSnapshot, newsSnapshot] = await Promise.all([
        get(ref(database, 'likes')),
        get(ref(database, 'users')),
        get(ref(database, 'news'))
      ]);

      // Fetch users data
      const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
      setUsers(usersData);

      // Fetch news data
      const newsData = newsSnapshot.exists() ? newsSnapshot.val() : {};
      setNews(newsData);

      // Process likes
      if (likesSnapshot.exists()) {
        const likesData = likesSnapshot.val();
        const likesList: LikeData[] = [];
        const postLikeCounts: { [key: string]: number } = {};

        Object.entries(likesData).forEach(([postId, postLikes]: [string, any]) => {
          if (typeof postLikes === 'object') {
            Object.keys(postLikes).forEach((userId) => {
              likesList.push({
                postId,
                userId,
                userName: usersData[userId]?.name || 'Unknown User',
                userEmail: usersData[userId]?.email || 'No email',
                postTitle: newsData[postId]?.title || 'Unknown Post'
              });
            });
            postLikeCounts[postId] = Object.keys(postLikes).length;
          }
        });

        setLikes(likesList);

        // Calculate stats
        const uniqueUsers = new Set(likesList.map(like => like.userId)).size;
        const likedPosts = Object.keys(postLikeCounts).length;
        const topPostId = Object.entries(postLikeCounts).sort(([,a], [,b]) => b - a)[0];
        const topPost = topPostId ? {
          title: newsData[topPostId[0]]?.title || 'Unknown Post',
          likes: topPostId[1]
        } : { title: '', likes: 0 };

        setStats({
          totalLikes: likesList.length,
          uniqueUsers,
          likedPosts,
          topPost
        });
      }
    } catch (error: any) {
      toast.error(`Failed to fetch likes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLike = async (postId: string, userId: string) => {
    if (window.confirm('Are you sure you want to remove this like?')) {
      try {
        const likeRef = ref(database, `likes/${postId}/${userId}`);
        await remove(likeRef);

        setLikes(prev => prev.filter(like => !(like.postId === postId && like.userId === userId)));
        toast.success('Like removed successfully!');
        
        // Refresh stats
        fetchData();
      } catch (error: any) {
        toast.error(`Failed to remove like: ${error.message}`);
      }
    }
  };

  const getPostLikes = (postId: string) => {
    return likes.filter(like => like.postId === postId).length;
  };

  const groupLikesByPost = () => {
    const grouped: { [key: string]: LikeData[] } = {};
    likes.forEach(like => {
      if (!grouped[like.postId]) {
        grouped[like.postId] = [];
      }
      grouped[like.postId].push(like);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const groupedLikes = groupLikesByPost();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Heart className="w-6 h-6 text-red-500 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Likes Management</h2>
        </div>
        <div className="text-sm text-gray-500">
          {stats.totalLikes} total likes
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-900">{stats.totalLikes}</div>
              <div className="text-red-700">Total Likes</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <User className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-blue-900">{stats.uniqueUsers}</div>
              <div className="text-blue-700">Active Users</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-900">{stats.likedPosts}</div>
              <div className="text-green-700">Liked Posts</div>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <div className="text-lg font-bold text-purple-900">{stats.topPost.likes}</div>
              <div className="text-purple-700 text-sm">Most Liked</div>
              <div className="text-xs text-purple-600 truncate max-w-32" title={stats.topPost.title}>
                {stats.topPost.title}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Likes by Post */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Likes by Post</h3>
        
        {Object.entries(groupedLikes).map(([postId, postLikes]) => (
          <div key={postId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {postLikes[0]?.postTitle || 'Unknown Post'}
                  </h4>
                  <div className="text-sm text-gray-500">
                    Post ID: <code className="bg-gray-100 px-2 py-1 rounded">{postId}</code>
                  </div>
                </div>
                <div className="flex items-center text-red-500">
                  <Heart className="w-5 h-5 mr-2 fill-current" />
                  <span className="text-lg font-semibold">{postLikes.length}</span>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {postLikes.map((like, index) => (
                <div key={`${like.userId}-${index}`} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{like.userName}</div>
                      <div className="text-sm text-gray-500">{like.userEmail}</div>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {like.userId}
                      </code>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveLike(like.postId, like.userId)}
                    className="inline-flex items-center px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedLikes).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No likes found</p>
            <p className="text-sm">User likes will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};