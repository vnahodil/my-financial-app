import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap'; // For linking Button to routes

function LandingPageView() {
  return (
    <Container fluid className="d-flex align-items-center justify-content-center text-center" style={{ minHeight: 'calc(100vh - 70px)', /* Adjust 70px based on actual navbar height */ paddingTop: '5rem', paddingBottom: '5rem' }}>
      <Row>
        <Col>
          <h1 className="display-3 fw-bold mb-3">Stanislav Zmuda</h1>
          <p className="lead mb-4">
            Senior Software Engineer | Full-Stack Developer | Tech Enthusiast
          </p>
          <p className="mb-5">
            Welcome to my personal space. Explore my work, skills, and journey in the world of software development.
          </p>
          <LinkContainer to="/profile">
            <Button variant="primary" size="lg">View My Profile</Button>
          </LinkContainer>
          {/* Optional: Add more sections or links here */}
        </Col>
      </Row>
    </Container>
  );
}

export default LandingPageView;
