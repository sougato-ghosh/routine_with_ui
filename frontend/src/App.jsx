import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Overview from './components/Overview';
import Settings from './components/Settings';
import Teachers from './components/Teachers';
import Rooms from './components/Rooms';
import DataStudio from './components/DataStudio';
import DataValidator from './components/DataValidator';
import Generator from './components/Generator';
import Schedules from './components/Schedules';

function App() {
  const [currentTab, setCurrentTab] = useState('Overview');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'Overview':
        return <Overview />;
      case 'Settings':
        return <Settings />;
      case 'Teachers':
        return <Teachers />;
      case 'Rooms':
        return <Rooms />;
      case 'Data Studio':
        return <DataStudio />;
      case 'Data Validator':
        return <DataValidator />;
      case 'Generator':
        return <Generator />;
      case 'Schedules':
        return <Schedules />;
      default:
        return <Overview />;
    }
  };

  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
