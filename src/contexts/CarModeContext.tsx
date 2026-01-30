// src/contexts/CarModeContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CarModeContextType {
    isCarMode: boolean;
    enterCarMode: () => void;
    exitCarMode: () => void;
}

const CarModeContext = createContext<CarModeContextType | undefined>(undefined);

export const CarModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isCarMode, setIsCarMode] = useState(false);

    const enterCarMode = () => setIsCarMode(true);
    const exitCarMode = () => setIsCarMode(false);

    return (
        <CarModeContext.Provider value={{ isCarMode, enterCarMode, exitCarMode }}>
            {children}
        </CarModeContext.Provider>
    );
};

export const useCarMode = () => {
    const ctx = useContext(CarModeContext);
    if (!ctx) throw new Error('useCarMode must be used within CarModeProvider');
    return ctx;
};

