import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileResponse = await api.get('/api/auth/profile');
        setUser(profileResponse.data);

        const reportsResponse = await api.get('/api/reports');
        setScans(reportsResponse.data || []);

        setLoading(false);
      } catch (err) {
        if (err.response?.status !== 401) {
          setError('Failed to fetch profile or scans');
        }
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!user) {
    return <div>Profile not found.</div>;
  }

  return (
    <div>
      <h2>Profile</h2>
      <p>Username: {user.username}</p>
      <p>Email: {user.email}</p>

      <h3>Your Scans:</h3>
      <ul>
        {scans.map((scan) => (
          <li key={scan._id}>
            {scan.type.toUpperCase()} - {scan.target} - {new Date(scan.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Profile;