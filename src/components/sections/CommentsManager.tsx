import React, { useState, useEffect } from 'react';
import { ref, get, remove, set } from 'firebase/database';
import { database } from '../../firebase/config';
import { MessageSquare, Trash2, Loader, User, Edit, Save, X, ChevronDown, ChevronRight, Heart, Reply, Database, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReplyData {
  replyId: string;
  commentId: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  createdAt: number;
  likes: number;
  replyingTo: string;
}

interface CommentData {
  commentId: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  createdAt: number;
  likes: number;
  replies: { [key: string]: ReplyData };
  replyCount: number;
}

export const CommentsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<{ [key: string]: CommentData }>({});
  const [rawData, setRawData] = useState<any>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showRawData, setShowRawData] = useState(false);
  const [stats, setStats] = useState({
    totalComments: 0,
    totalReplies: 0,
    totalLikes: 0,
    activeUsers: 0,
    totalInteractions: 0
  });

  useEffect(() => {
    fetchInteractions();
  }, []);

  const fetchInteractions = async () => {
    try {
      const interactionsRef = ref(database, 'interactions');
      const snapshot = await get(interactionsRef);
      
      console.log('Raw interactions data:', snapshot.val());
      
      if (snapshot.exists()) {
        const interactionsData = snapshot.val();
        setRawData(interactionsData);
        
        const processedComments: { [key: string]: CommentData } = {};
        const uniqueUsers = new Set<string>();
        let totalLikes = 0;
        let totalReplies = 0;
        let totalInteractions = 0;

        // Count total interactions
        totalInteractions = Object.keys(interactionsData).length;

        // First pass: Process main comments
        Object.entries(interactionsData).forEach(([interactionId, interaction]: [string, any]) => {
          console.log('Processing interaction:', interactionId, interaction);
          
          // Check if this is a main comment (has commentId but no replyId)
          if (interaction.commentId && !interaction.replyId) {
            const commentId = interaction.commentId;
            
            processedComments[commentId] = {
              commentId,
              text: interaction.text || '',
              userId: interaction.userId || '',
              userName: interaction.userName || 'Unknown User',
              userAvatar: interaction.userAvatar || '',
              createdAt: interaction.createdAt || Date.now(),
              likes: interaction.likes || 0,
              replies: {},
              replyCount: 0
            };

            uniqueUsers.add(interaction.userId);
            totalLikes += interaction.likes || 0;
            
            console.log('Added main comment:', commentId, processedComments[commentId]);
          }
        });

        // Second pass: Process replies
        Object.entries(interactionsData).forEach(([interactionId, interaction]: [string, any]) => {
          // Check if this is a reply (has both commentId and replyId)
          if (interaction.commentId && interaction.replyId) {
            const commentId = interaction.commentId;
            const replyId = interaction.replyId;
            
            if (processedComments[commentId]) {
              processedComments[commentId].replies[replyId] = {
                replyId,
                commentId,
                text: interaction.text || '',
                userId: interaction.userId || '',
                userName: interaction.userName || 'Unknown User',
                userAvatar: interaction.userAvatar || '',
                createdAt: interaction.createdAt || Date.now(),
                likes: interaction.likes || 0,
                replyingTo: interaction.replyingTo || ''
              };

              processedComments[commentId].replyCount++;
              uniqueUsers.add(interaction.userId);
              totalLikes += interaction.likes || 0;
              totalReplies++;
              
              console.log('Added reply:', replyId, 'to comment:', commentId);
            } else {
              console.warn('Reply found for non-existent comment:', commentId, interaction);
            }
          }
        });

        // Third pass: Handle interactions that might not follow the expected structure
        Object.entries(interactionsData).forEach(([interactionId, interaction]: [string, any]) => {
          // If interaction has text but no clear comment/reply structure, treat as standalone comment
          if (interaction.text && !interaction.commentId && !interaction.replyId) {
            const commentId = interactionId; // Use interaction ID as comment ID
            
            processedComments[commentId] = {
              commentId,
              text: interaction.text || '',
              userId: interaction.userId || '',
              userName: interaction.userName || 'Unknown User',
              userAvatar: interaction.userAvatar || '',
              createdAt: interaction.createdAt || Date.now(),
              likes: interaction.likes || 0,
              replies: {},
              replyCount: 0
            };

            uniqueUsers.add(interaction.userId);
            totalLikes += interaction.likes || 0;
            
            console.log('Added standalone comment:', commentId);
          }
        });

        console.log('Final processed comments:', processedComments);

        // Sort comments by creation date (newest first)
        const sortedComments = Object.fromEntries(
          Object.entries(processedComments).sort(([,a], [,b]) => b.createdAt - a.createdAt)
        );

        setComments(sortedComments);
        setStats({
          totalComments: Object.keys(processedComments).length,
          totalReplies,
          totalLikes,
          activeUsers: uniqueUsers.size,
          totalInteractions
        });
      } else {
        console.log('No interactions data found');
        setRawData(null);
      }
    } catch (error: any) {
      console.error('Error fetching interactions:', error);
      toast.error(`Failed to fetch interactions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment and all its replies?')) {
      try {
        // Find all interactions related to this comment
        const interactionsRef = ref(database, 'interactions');
        const snapshot = await get(interactionsRef);
        
        if (snapshot.exists()) {
          const interactionsData = snapshot.val();
          const deletionPromises: Promise<void>[] = [];

          // Find and delete all interactions related to this comment
          Object.entries(interactionsData).forEach(([interactionId, interaction]: [string, any]) => {
            if (interaction.commentId === commentId || interactionId === commentId) {
              const interactionRef = ref(database, `interactions/${interactionId}`);
              deletionPromises.push(remove(interactionRef));
            }
          });

          await Promise.all(deletionPromises);
          
          // Update local state
          const updatedComments = { ...comments };
          delete updatedComments[commentId];
          setComments(updatedComments);
          
          toast.success('Comment and all replies deleted successfully!');
          
          // Refresh data
          await fetchInteractions();
        }
      } catch (error: any) {
        toast.error(`Failed to delete comment: ${error.message}`);
      }
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        // Find the specific reply interaction
        const interactionsRef = ref(database, 'interactions');
        const snapshot = await get(interactionsRef);
        
        if (snapshot.exists()) {
          const interactionsData = snapshot.val();
          
          // Find the interaction with matching replyId
          const interactionToDelete = Object.entries(interactionsData).find(
            ([, interaction]: [string, any]) => interaction.replyId === replyId
          );

          if (interactionToDelete) {
            const [interactionId] = interactionToDelete;
            const interactionRef = ref(database, `interactions/${interactionId}`);
            await remove(interactionRef);
            
            toast.success('Reply deleted successfully!');
            
            // Refresh data
            await fetchInteractions();
          }
        }
      } catch (error: any) {
        toast.error(`Failed to delete reply: ${error.message}`);
      }
    }
  };

  const handleEditComment = (commentId: string) => {
    setEditingComment(commentId);
    setEditText(comments[commentId].text);
  };

  const handleEditReply = (replyId: string, commentId: string) => {
    setEditingReply(replyId);
    setEditText(comments[commentId].replies[replyId].text);
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      // Find the comment interaction
      const interactionsRef = ref(database, 'interactions');
      const snapshot = await get(interactionsRef);
      
      if (snapshot.exists()) {
        const interactionsData = snapshot.val();
        
        // Find the interaction with matching commentId (and no replyId) or direct match
        const interactionToUpdate = Object.entries(interactionsData).find(
          ([interactionId, interaction]: [string, any]) => 
            (interaction.commentId === commentId && !interaction.replyId) || interactionId === commentId
        );

        if (interactionToUpdate) {
          const [interactionId] = interactionToUpdate;
          const interactionRef = ref(database, `interactions/${interactionId}/text`);
          await set(interactionRef, editText.trim());
          
          setEditingComment(null);
          setEditText('');
          toast.success('Comment updated successfully!');
          
          // Refresh data
          await fetchInteractions();
        }
      }
    } catch (error: any) {
      toast.error(`Failed to update comment: ${error.message}`);
    }
  };

  const handleSaveReplyEdit = async (replyId: string, commentId: string) => {
    if (!editText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    try {
      // Find the reply interaction
      const interactionsRef = ref(database, 'interactions');
      const snapshot = await get(interactionsRef);
      
      if (snapshot.exists()) {
        const interactionsData = snapshot.val();
        
        // Find the interaction with matching replyId
        const interactionToUpdate = Object.entries(interactionsData).find(
          ([, interaction]: [string, any]) => interaction.replyId === replyId
        );

        if (interactionToUpdate) {
          const [interactionId] = interactionToUpdate;
          const interactionRef = ref(database, `interactions/${interactionId}/text`);
          await set(interactionRef, editText.trim());
          
          setEditingReply(null);
          setEditText('');
          toast.success('Reply updated successfully!');
          
          // Refresh data
          await fetchInteractions();
        }
      }
    } catch (error: any) {
      toast.error(`Failed to update reply: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditingReply(null);
    setEditText('');
  };

  const toggleCommentExpansion = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <MessageSquare className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Comments & Interactions</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            <Database className="w-4 h-4 mr-2" />
            {showRawData ? 'Hide' : 'Show'} Raw Data
          </button>
          <div className="text-sm text-gray-500">
            {stats.totalComments} comments • {stats.totalReplies} replies • {stats.totalInteractions} total interactions
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {showRawData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-gray-900">Raw Database Data</h3>
          </div>
          <pre className="bg-white p-4 rounded border text-xs overflow-auto max-h-96">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalComments}</div>
              <div className="text-blue-700">Comments</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <Reply className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-900">{stats.totalReplies}</div>
              <div className="text-green-700">Replies</div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-900">{stats.totalLikes}</div>
              <div className="text-red-700">Total Likes</div>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center">
            <User className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-purple-900">{stats.activeUsers}</div>
              <div className="text-purple-700">Active Users</div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center">
            <Database className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-orange-900">{stats.totalInteractions}</div>
              <div className="text-orange-700">Total Interactions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {Object.entries(comments).map(([commentId, comment]) => {
          const isExpanded = expandedComments.has(commentId);
          const repliesArray = Object.values(comment.replies).sort((a, b) => a.createdAt - b.createdAt);
          
          return (
            <div key={commentId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Main Comment */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-gray-200">
                      {comment.userAvatar ? (
                        <img
                          src={comment.userAvatar}
                          alt={comment.userName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{comment.userName}</div>
                      <div className="text-sm text-gray-500">{formatDate(comment.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {comment.likes > 0 && (
                      <div className="flex items-center text-red-500">
                        <Heart className="w-4 h-4 mr-1 fill-current" />
                        <span className="text-sm">{comment.likes}</span>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditComment(commentId)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(commentId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comment Text */}
                {editingComment === commentId ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Edit comment..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveCommentEdit(commentId)}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-gray-800">{comment.text}</p>
                  </div>
                )}

                {/* Replies Toggle */}
                {comment.replyCount > 0 && (
                  <button
                    onClick={() => toggleCommentExpansion(commentId)}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-1" />
                    )}
                    {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                  </button>
                )}

                {/* Comment Metadata */}
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span>Comment ID: {commentId}</span>
                  <span>User ID: {comment.userId}</span>
                </div>
              </div>

              {/* Replies */}
              {isExpanded && comment.replyCount > 0 && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6 space-y-4">
                    {repliesArray.map((reply) => (
                      <div key={reply.replyId} className="bg-white rounded-lg p-4 ml-8 border-l-4 border-blue-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-3 bg-gray-200">
                              {reply.userAvatar ? (
                                <img
                                  src={reply.userAvatar}
                                  alt={reply.userName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{reply.userName}</div>
                              <div className="text-xs text-gray-500">
                                Replying to {reply.replyingTo} • {formatDate(reply.createdAt)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {reply.likes > 0 && (
                              <div className="flex items-center text-red-500">
                                <Heart className="w-3 h-3 mr-1 fill-current" />
                                <span className="text-xs">{reply.likes}</span>
                              </div>
                            )}
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditReply(reply.replyId, commentId)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteReply(commentId, reply.replyId)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Reply Text */}
                        {editingReply === reply.replyId ? (
                          <div className="space-y-3">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Edit reply..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveReplyEdit(reply.replyId, commentId)}
                                className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex items-center px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 text-sm">{reply.text}</p>
                        )}

                        {/* Reply Metadata */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                          <span>Reply ID: {reply.replyId}</span>
                          <span>User ID: {reply.userId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(comments).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No comments found</p>
            <p className="text-sm">User comments and interactions will appear here</p>
            {rawData && (
              <div className="mt-4">
                <button
                  onClick={() => setShowRawData(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Show raw data to debug
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};