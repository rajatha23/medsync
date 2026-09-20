import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activeIncidentCount, setActiveIncidentCount] = useState(3);
  const [selectedBorough, setSelectedBorough] = useState('ALL');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AppContext.Provider
      value={{
        activeIncidentCount,
        setActiveIncidentCount,
        selectedBorough,
        setSelectedBorough,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
