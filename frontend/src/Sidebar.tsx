// src/Sidebar.jsx
import React from 'react';
import Nav from 'react-bootstrap/Nav';

// Define identifiers for your views
const VIEWS = {
  ITEMS: 'items',
  DASHBOARD: 'dashboard', // Example for later
  SETTINGS: 'settings',   // Example for later
};

// Pass activeView and setActiveView down as props
function Sidebar({ activeView, setActiveView }) {
  return (
    // Add styling for background, height, padding
    <Nav
      className="flex-column bg-light p-3 vh-100 border-end" // vh-100 for full viewport height, border-end
      activeKey={activeView} // Highlight the active link
      onSelect={(selectedKey) => setActiveView(selectedKey)} // Handle click
    >
      <Nav.Link eventKey={VIEWS.ITEMS}>
        Manage Items
      </Nav.Link>
      <Nav.Link eventKey={VIEWS.DASHBOARD} disabled> {/* Example: Add other links */}
        Dashboard Home (Coming Soon)
      </Nav.Link>
      <Nav.Link eventKey={VIEWS.SETTINGS} disabled> {/* Example: Add other links */}
        Settings (Coming Soon)
      </Nav.Link>
      {/* Add more Nav.Link components for other sections */}
    </Nav>
  );
}

// Export VIEWS constant if needed elsewhere, otherwise just use it locally
export { VIEWS };
export default Sidebar;