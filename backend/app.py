# app.py
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError # Import specific exception
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Example: Allow specific origin later
# origins = ["https://yourdomain.com", "https://www.yourdomain.com"] # Your production frontend URL(s)
# CORS(app, origins=origins, supports_credentials=True)
CORS(app) # Enable CORS for all routes

# --- Define Database Models (Example) ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(120))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

# --- Define API Routes ---
@app.route('/')
def index():
    return "Hello from Flask Backend!"

# Example GET route
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        items = Item.query.all()
        return jsonify([item.to_dict() for item in items])
    except Exception as e:
        # Basic error handling
        return jsonify({"error": str(e)}), 500

# Example POST route
@app.route('/api/items', methods=['POST'])
def add_item():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "Missing 'name' in request body"}), 400

        new_item = Item(name=data['name'], description=data.get('description'))
        db.session.add(new_item)
        db.session.commit()
        return jsonify(new_item.to_dict()), 201 # 201 Created status
    except Exception as e:
        db.session.rollback() # Rollback in case of error
        return jsonify({"error": str(e)}), 500

# Route to check database connection status
@app.route('/api/db-status', methods=['GET'])
def db_status():
    try:
        # Try getting a connection from the engine pool
        connection = db.engine.connect()
        connection.close() # Close the connection immediately after successful check
        return jsonify({"connected": True, "message": "Database connection successful."})
    except OperationalError as e:
        # Handle specific connection errors (e.g., bad host, credentials)
        app.logger.error(f"Database connection failed: {e}") # Log the error
        return jsonify({"connected": False, "message": f"Database connection failed."}), 500
    except Exception as e:
        # Handle other potential errors during the check
        app.logger.error(f"Error checking DB status: {e}")
        return jsonify({"connected": False, "message": f"An error occurred while checking database status."}), 500


# You don't need the __main__ block if using `flask run`
# if __name__ == '__main__':
#     app.run(debug=True) # Debug will be handled by FLASK_DEBUG env var
