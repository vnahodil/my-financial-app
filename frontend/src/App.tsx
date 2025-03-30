// src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define the base URL for your Flask API
// IMPORTANT: Use the backend's address and port
const VITE_API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [items, setItems] = useState([]); // State to hold items from backend
  const [newItemName, setNewItemName] = useState(''); // State for the input field
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState(null); // State for errors

  // Function to fetch items from the backend
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${VITE_API_URL}/items`);
      setItems(response.data);
    } catch (err) {
      console.error("Error fetching items:", err);
      setError('Failed to fetch items. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // useEffect hook to fetch items when the component mounts
  useEffect(() => {
    fetchItems();
  }, []); // Empty dependency array means run only once on mount

  // Function to handle adding a new item
  const handleAddItem = async (e) => {
    e.preventDefault(); // Prevent default form submission
    if (!newItemName.trim()) return; // Don't add empty items

    setError(null);
    try {
      const response = await axios.post(`${VITE_API_URL}/items`, {
        name: newItemName,
        // description: 'Optional description' // Add if needed
      });
      // Add the new item returned from the backend to our state
      // Or better: refetch the whole list to ensure consistency
      // setItems([...items, response.data]);
      setNewItemName(''); // Clear the input field
      fetchItems(); // Refetch the list
    } catch (err) {
       console.error("Error adding item:", err);
       setError('Failed to add item.');
    }
  };

  return (
    <div>
      <h1>My Items</h1>

      {/* Form to add new items */}
      <form onSubmit={handleAddItem}>
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="New item name"
        />
        <button type="submit">Add Item</button>
      </form>

      {/* Display loading message, error, or the list */}
      {loading && <p>Loading items...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loading && !error && (
        <ul>
          {items.length > 0 ? (
            items.map(item => (
              <li key={item.id}>
                {item.name} {item.description ? `- ${item.description}` : ''}
              </li>
            ))
          ) : (
            <p>No items found.</p>
          )}
        </ul>
      )}
    </div>
  );
}

export default App;