import React, { createContext, useState, useEffect } from 'react';
import { api } from '../../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('token');
            
            if (storedToken) {
                setToken(storedToken);
                try {
                    const response = await api.get('/api/auth/profile');
                    setCurrentUser(response.data);
                } catch (error) {
                    localStorage.removeItem('token');
                    setToken(null);
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    const login = async (newToken, userData = null) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        
        if (userData) {
            setCurrentUser(userData);
        } else {
            try {
                const response = await api.get('/api/auth/profile');
                setCurrentUser(response.data);
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                // Don't clear token here, let the interceptor handle it
            }
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
    };

    const isAuthenticated = () => {
        return !!(token && currentUser);
    };

    return (
        <AuthContext.Provider value={{ 
            currentUser, 
            token, 
            loading,
            login, 
            logout, 
            isAuthenticated
        }}>
            {children}
        </AuthContext.Provider>
    );
};