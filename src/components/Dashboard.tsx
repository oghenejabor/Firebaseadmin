import React from 'react';
import { Menu } from 'lucide-react';
import { OverviewDashboard } from './sections/OverviewDashboard';
import { AdsManager } from './sections/AdsManager';
import { S3SettingsManager } from './sections/S3SettingsManager';
import { ImportManager } from './sections/ImportManager';
import { VideosManager } from './sections/VideosManager';
import { AdvertisementManager } from './sections/AdvertisementManager';
import { DealsManager } from './sections/DealsManager';
import { FeaturedAppsManager } from './sections/FeaturedAppsManager';
import { HomeItemsManager } from './sections/HomeItemsManager';
import { ShopCategoriesManager } from './sections/ShopCategoriesManager';
import { SlidingImagesManager } from './sections/SlidingImagesManager';
import { ShopSliderManager } from './sections/ShopSliderManager';
import { SocialItemsManager } from './sections/SocialItemsManager';
import { UsersManager } from './sections/UsersManager';
import { LikesManager } from './sections/LikesManager';
import { CommentsManager } from './sections/CommentsManager';

interface DashboardProps {
  activeSection: string;
  toggleSidebar: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ activeSection, toggleSidebar }) => {
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewDashboard />;
      case 'ads':
        return <AdsManager />;
      case 's3-settings':
        return <S3SettingsManager />;
      case 'import':
        return <ImportManager />;
      case 'videos':
        return <VideosManager />;
      case 'advertisements':
        return <AdvertisementManager />;
      case 'deals':
        return <DealsManager />;
      case 'featured-apps':
        return <FeaturedAppsManager />;
      case 'home-items':
        return <HomeItemsManager />;
      case 'shop-categories':
        return <ShopCategoriesManager />;
      case 'sliding-images':
        return <SlidingImagesManager />;
      case 'shop-slider':
        return <ShopSliderManager />;
      case 'social-items':
        return <SocialItemsManager />;
      case 'users':
        return <UsersManager />;
      case 'likes':
        return <LikesManager />;
      case 'comments':
        return <CommentsManager />;
      default:
        return <OverviewDashboard />;
    }
  };

  const getSectionTitle = () => {
    const titles: { [key: string]: string } = {
      'overview': 'Dashboard Overview',
      'ads': 'Ads Settings',
      's3-settings': 'Amazon S3 Settings',
      'import': 'Import Products',
      'videos': 'Video Products Management',
      'advertisements': 'Advertisement Management',
      'deals': 'Deals & Offers',
      'featured-apps': 'Featured Apps',
      'home-items': 'Home Items',
      'shop-categories': 'Shop Categories',
      'sliding-images': 'Sliding Images',
      'shop-slider': 'Shop Slider Management',
      'social-items': 'Social Media',
      'users': 'Users Management',
      'likes': 'Likes Management',
      'comments': 'Comments Management'
    };
    return titles[activeSection] || 'Dashboard';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="lg:hidden mr-4 p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{getSectionTitle()}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {renderSection()}
      </div>
    </div>
  );
};