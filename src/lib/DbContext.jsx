import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDb } from '@/lib/db';

const DbContext = createContext(null);

export function DbProvider({ children }) {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    initDb()
      .then(() => setIsDbReady(true))
      .catch((e) => {
        console.error('DB init failed:', e);
        setDbError(e);
      });
  }, []);

  return (
    <DbContext.Provider value={{ isDbReady, dbError }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
