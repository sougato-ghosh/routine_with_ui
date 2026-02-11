import React, { useState } from 'react';
import Layout from './components/Layout';
import Overview from './components/Overview';
import DataStudio from './components/DataStudio';
import Generator from './components/Generator';
import Schedules from './components/Schedules';

function App() {
  const [currentTab, setCurrentTab] = useState('Overview');

  const renderContent = () => {
    switch (currentTab) {
      case 'Overview':
        return <Overview />;
      case 'Data Studio':
        return <DataStudio />;
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
