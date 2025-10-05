# Helpdesk Backend API

This is the backend API for the helpdesk application, built with Node.js, Express, and SQLite.

## Features

- User authentication with JWT tokens
- Ticket management (CRUD operations)
- Comment system for tickets
- Role-based access control
- SQLite database for data persistence

## Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
npm run init-db
```

3. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Tickets
- `GET /api/tickets` - Get all tickets (with pagination and filters)
- `GET /api/tickets/:id` - Get single ticket with comments
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `POST /api/tickets/:id/comments` - Add comment to ticket

### Health Check
- `GET /api/health` - Server health check

## Default Admin User

Username: `admin`
Password: `admin123`

## Environment Variables

Create a `.env` file in the backend directory:

```
PORT=5000
FRONTEND_URL=http://localhost:4028
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

## Database Schema

The SQLite database includes the following tables:
- `users` - User accounts and authentication
- `tickets` - Support tickets
- `comments` - Ticket comments and conversations
