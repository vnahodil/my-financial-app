import React from 'react';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';

function ProfileView() {
  return (
    <Container>
      <Card>
        <Card.Header as="h2">Profile / CV</Card.Header>
        <Card.Body>
          <Card.Title>Your Name</Card.Title>
          <Card.Subtitle className="mb-2 text-muted">Your Title</Card.Subtitle>
          <Card.Text>
            This is the profile page. Your CV details will go here.
            (Content was kept minimal due to previous interruptions, can be expanded later).
          </Card.Text>
          {/* Add more detailed CV sections here later */}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ProfileView;
