// src/Sidebar.jsx
import React from 'react';
import Nav from 'react-bootstrap/Nav';

// Define identifiers for the views
const VIEWS = {
  ITEMS: 'items', // Changed from DB_STATUS
  PROFILE: 'profile',
};

// Pass activeView and setActiveView down as props
function Sidebar({ activeView, setActiveView }) {
  return (
    // Use the custom class for styling from App.css
    <Nav
      className="flex-column bg-light p-3 vh-100 border-end sidebar-nav" // Added sidebar-nav class
      activeKey={activeView} // Highlight the active link
      onSelect={(selectedKey) => setActiveView(selectedKey)} // Handle click
    >
      <Nav.Link eventKey={VIEWS.ITEMS}> {/* Changed eventKey */}
        Manage Items {/* Changed label */}
      </Nav.Link>
      <Nav.Link eventKey={VIEWS.PROFILE}>
        Profile
      </Nav.Link>
    </Nav>
  );
}

// Export VIEWS constant if needed elsewhere, otherwise just use it locally
export { VIEWS };
export default Sidebar;
