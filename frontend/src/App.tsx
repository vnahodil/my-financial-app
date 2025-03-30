// src/App.jsx
import React, { useState } from 'react';

// Import React-Bootstrap layout components
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Import your custom components
import Sidebar, { VIEWS } from './Sidebar'; // Import VIEWS constant
import ItemsView from './ItemsView';
// Import other view components here later (e.g., DashboardHome, SettingsView)

function App() {
  // State to track the currently active view
  const [activeView, setActiveView] = useState(VIEWS.ITEMS); // Default to Items view

  // Function to render the correct component based on the active view
  const renderActiveView = () => {
    switch (activeView) {
      case VIEWS.ITEMS:
        return <ItemsView />;
      case VIEWS.DASHBOARD:
        return <h2>Dashboard Home (Content Area)</h2>; // Placeholder
      case VIEWS.SETTINGS:
        return <h2>Settings (Content Area)</h2>; // Placeholder
      default:
        return <ItemsView />; // Fallback to items view
    }
  };

  return (
    // Use fluid container to take full width
    <Container fluid>
      <Row>
        {/* Sidebar Column */}
        {/* Adjust column sizes for different breakpoints (sm, md, lg) */}
        <Col sm={3} md={2} className="p-0"> {/* p-0 to remove padding */}
          <Sidebar activeView={activeView} setActiveView={setActiveView} />
        </Col>

        {/* Content Area Column */}
        <Col sm={9} md={10} className="py-4 px-4"> {/* Add padding */}
          {/* Render the component returned by renderActiveView */}
          {renderActiveView()}
        </Col>
      </Row>
    </Container>
  );
}

export default App;