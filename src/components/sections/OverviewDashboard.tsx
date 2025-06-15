import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase/config';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Tag, 
  Star, 
  Newspaper, 
  Image, 
  Heart, 
  MessageSquare, 
  Bookmark,
  ExternalLink,
  Eye,
  Loader,
  Settings,
  Cloud,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalDeals: number;
  totalNews: number;
  totalUsers: number;
  totalCategories: number;
  totalApps: number;
  totalProducts: number;
  totalSliderItems: number;
  totalShopSliderItems: number;
  totalLikes: number;
  totalComments: number;
  totalBookmarks: number;
}

interface RecentItem {
  id: string;
  title: string;
  type: string;
  timestamp?: number;
  image?: string;
  link?: string;
}

export const OverviewDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalDeals: 0,
    totalNews: 0,
    totalUsers: 0,
    totalCategories: 0,
    totalApps: 0,
    totalProducts: 0,
    totalSliderItems: 0,
    totalShopSliderItems: 0,
    totalLikes: 0,
    totalComments: 0,
    totalBookmarks: 0,
  });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [quickPreview, setQuickPreview] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel
      const [
        dealsSnapshot,
        newsSnapshot,
        usersSnapshot,
        categoriesSnapshot,
        appsSnapshot,
        shopCategoriesSnapshot,
        sliderSnapshot,
        shopSliderSnapshot,
        likesSnapshot,
        bookmarksSnapshot,
        trendingSnapshot,
        shoppingSnapshot
      ] = await Promise.all([
        get(ref(database, 'Deals')),
        get(ref(database, 'news')),
        get(ref(database, 'users')),
        get(ref(database, 'categories')),
        get(ref(database, 'FeaturedApps')),
        get(ref(database, 'ShopCategories')),
        get(ref(database, 'SlidingImages')),
        get(ref(database, 'ShopSliderItems')),
        get(ref(database, 'likes')),
        get(ref(database, 'user_bookmarks')),
        get(ref(database, 'TrendingItemsPage')),
        get(ref(database, 'Shopping'))
      ]);

      // Calculate stats
      const newStats: DashboardStats = {
        totalDeals: dealsSnapshot.exists() ? Object.keys(dealsSnapshot.val()).length : 0,
        totalNews: newsSnapshot.exists() ? Object.keys(newsSnapshot.val()).length : 0,
        totalUsers: usersSnapshot.exists() ? Object.keys(usersSnapshot.val()).length : 0,
        totalCategories: categoriesSnapshot.exists() ? Object.keys(categoriesSnapshot.val()).length : 0,
        totalApps: appsSnapshot.exists() ? Object.keys(appsSnapshot.val()).length : 0,
        totalProducts: shopCategoriesSnapshot.exists() ? (Array.isArray(shopCategoriesSnapshot.val()) ? shopCategoriesSnapshot.val().length : Object.keys(shopCategoriesSnapshot.val()).length) : 0,
        totalSliderItems: sliderSnapshot.exists() ? Object.keys(sliderSnapshot.val()).length : 0,
        totalShopSliderItems: shopSliderSnapshot.exists() ? (Array.isArray(shopSliderSnapshot.val()) ? shopSliderSnapshot.val().length : Object.keys(shopSliderSnapshot.val()).length) : 0,
        totalLikes: likesSnapshot.exists() ? Object.values(likesSnapshot.val()).reduce((total: number, postLikes: any) => total + Object.keys(postLikes).length, 0) : 0,
        totalComments: newsSnapshot.exists() ? Object.values(newsSnapshot.val()).reduce((total: number, post: any) => total + (post.comments ? Object.keys(post.comments).length : 0), 0) : 0,
        totalBookmarks: bookmarksSnapshot.exists() ? Object.values(bookmarksSnapshot.val()).reduce((total: number, userBookmarks: any) => total + Object.keys(userBookmarks).length, 0) : 0,
      };

      setStats(newStats);

      // Collect recent items for preview
      const recent: RecentItem[] = [];

      // Add recent deals
      if (dealsSnapshot.exists()) {
        Object.entries(dealsSnapshot.val()).slice(0, 3).forEach(([id, deal]: [string, any]) => {
          recent.push({
            id,
            title: deal.productName,
            type: 'Deal',
            image: deal.productImg,
            link: deal.productLink
          });
        });
      }

      // Add recent news
      if (newsSnapshot.exists()) {
        Object.entries(newsSnapshot.val()).slice(0, 3).forEach(([id, article]: [string, any]) => {
          recent.push({
            id,
            title: article.title,
            type: 'News',
            timestamp: article.timestamp,
            image: article.imageUrl
          });
        });
      }

      // Add recent apps
      if (appsSnapshot.exists()) {
        Object.entries(appsSnapshot.val()).slice(0, 2).forEach(([id, app]: [string, any]) => {
          recent.push({
            id,
            title: app.name,
            type: 'App',
            image: app.img,
            link: app.links
          });
        });
      }

      setRecentItems(recent.slice(0, 8));

      // Store preview data
      setQuickPreview({
        deals: dealsSnapshot.exists() ? Object.values(dealsSnapshot.val()).slice(0, 4) : [],
        news: newsSnapshot.exists() ? Object.values(newsSnapshot.val()).slice(0, 4) : [],
        apps: appsSnapshot.exists() ? Object.values(appsSnapshot.val()).slice(0, 4) : [],
        trending: trendingSnapshot.exists() ? (Array.isArray(trendingSnapshot.val()) ? trendingSnapshot.val().slice(0, 4) : Object.values(trendingSnapshot.val()).slice(0, 4)) : [],
        shopping: shoppingSnapshot.exists() ? Object.values(shoppingSnapshot.val()).slice(0, 4) : [],
        sliderItems: sliderSnapshot.exists() ? Object.values(sliderSnapshot.val()).slice(0, 4) : [],
        shopSliderItems: shopSliderSnapshot.exists() ? (Array.isArray(shopSliderSnapshot.val()) ? shopSliderSnapshot.val().slice(0, 4) : Object.values(shopSliderSnapshot.val()).slice(0, 4)) : []
      });

    } catch (error: any) {
      toast.error(`Failed to fetch dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
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
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Admin Dashboard</h1>
            <p className="text-blue-100">Manage your entire platform from one central location</p>
          </div>
          <div className="hidden md:block">
            <BarChart3 className="w-16 h-16 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deals</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalDeals}</p>
            </div>
            <Tag className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">News Articles</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalNews}</p>
            </div>
            <Newspaper className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Featured Apps</p>
              <p className="text-3xl font-bold text-orange-600">{stats.totalApps}</p>
            </div>
            <Star className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Store Products</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.totalProducts}</p>
            </div>
            <ShoppingBag className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Banner Images</p>
              <p className="text-3xl font-bold text-pink-600">{stats.totalSliderItems}</p>
            </div>
            <Image className="w-8 h-8 text-pink-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Shop Sliders</p>
              <p className="text-3xl font-bold text-teal-600">{stats.totalShopSliderItems}</p>
            </div>
            <Layers className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Engagement</p>
              <p className="text-3xl font-bold text-red-600">{stats.totalLikes + stats.totalComments + stats.totalBookmarks}</p>
            </div>
            <Heart className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Likes</h3>
            <Heart className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-500">{stats.totalLikes}</p>
          <p className="text-sm text-gray-600">Total likes across all content</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
            <MessageSquare className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500">{stats.totalComments}</p>
          <p className="text-sm text-gray-600">User comments on articles</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bookmarks</h3>
            <Bookmark className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-500">{stats.totalBookmarks}</p>
          <p className="text-sm text-gray-600">Saved content by users</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentItems.map((item, index) => (
            <div key={`${item.type}-${item.id}-${index}`} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded-lg mr-4"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900 line-clamp-1">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.type === 'Deal' ? 'bg-green-100 text-green-800' :
                        item.type === 'News' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {item.type}
                      </span>
                      {item.timestamp && (
                        <span className="text-sm text-gray-500">{formatDate(item.timestamp)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latest Deals */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Latest Deals</h3>
              <Tag className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {quickPreview.deals?.map((deal: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {deal.productImg && (
                    <img
                      src={deal.productImg}
                      alt={deal.productName}
                      className="w-10 h-10 object-cover rounded mr-3"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">{deal.productName}</p>
                    <p className="text-green-600 text-sm font-semibold">{deal.discountedPrice}</p>
                  </div>
                </div>
                <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                  {deal.percentOff}% OFF
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest News */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Latest News</h3>
              <Newspaper className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {quickPreview.news?.map((article: any, index: number) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-10 h-10 object-cover rounded mr-3"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm line-clamp-1">{article.title}</p>
                  <p className="text-gray-600 text-xs">{formatDate(article.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Apps */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Featured Apps</h3>
              <Star className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {quickPreview.apps?.map((app: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {app.img && (
                    <img
                      src={app.img}
                      alt={app.name}
                      className="w-10 h-10 object-cover rounded mr-3"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">{app.name}</p>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(app.ratings) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs text-gray-600">{app.ratings}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Trending Items</h3>
              <TrendingUp className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {quickPreview.trending?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-10 h-10 object-cover rounded mr-3"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">{item.title}</p>
                    <p className="text-orange-600 text-sm font-semibold">{item.pricing}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(item.ratings) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <Tag className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-900">Add Deal</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Newspaper className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">Add News</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <Star className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-900">Add App</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <ShoppingBag className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-900">Add Product</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
            <Image className="w-8 h-8 text-pink-600 mb-2" />
            <span className="text-sm font-medium text-pink-900">Add Banner</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings className="w-8 h-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};