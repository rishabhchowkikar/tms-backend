# Transport Management System - Backend API Documentation

A comprehensive RESTful API backend for managing transport depots, administrative users, and staff members (drivers and conductors) in a transport management system.

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [API Routes](#api-routes)
   - [Authentication Routes](#1-authentication-routes)
   - [Super Admin Routes](#2-super-admin-routes)
   - [Depot Admin Routes](#3-depot-admin-routes)
   - [Health Check](#4-health-check)
5. [Error Responses](#error-responses)
6. [Project Structure](#project-structure)

---

## Overview

This backend API provides endpoints for:
- **Admin Authentication**: Signup, login, and logout functionality
- **Super Admin Operations**: Creating depot admins, viewing all admins and staff
- **Depot Admin Operations**: Managing staff (drivers/conductors) within their assigned depot

### User Roles

- **superadmin**: Full system access, can create depot admins and view all data
- **admin**: Depot-specific access, can manage staff only in their assigned depot

---

## Base URL

```
http://localhost:5000/api
```

---

## Authentication

Most routes require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are generated on login and expire after 1 day.

---

## API Routes

## 1. Authentication Routes

**Base Path:** `/api/admin/auth`

### 1.1 POST `/signup`

**Description:** Creates a new admin user account. For `superadmin` role, only one can exist in the system. This is typically used for initial superadmin creation.

**Authentication:** None (Public endpoint)

**Request Body:**
```json
{
  "adminname": "string (required, unique)",
  "email": "string (required, unique, valid email format)",
  "password": "string (required, min length enforced by bcrypt)",
  "role": "superadmin" | "admin" (required)
}
```

**Success Response (201 Created):**
```json
{
  "message": "Super Admin created successfully",
  "success": true,
  "payload": {
    "_id": "507f1f77bcf86cd799439011",
    "adminname": "superadmin",
    "email": "admin@example.com",
    "role": "superadmin"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing required fields:
```json
{
  "message": "All fields (username, email, password, role) are required",
  "success": false
}
```

- **400 Bad Request** - Empty fields:
```json
{
  "message": "Fields cannot be empty"
}
```

- **400 Bad Request** - Superadmin already exists:
```json
{
  "message": "Super Admin already Exist",
  "success": false
}
```

- **500 Internal Server Error** - Database/Server error:
```json
{
  "success": false,
  "message": "Internal Server Error",
  "error": "error message details"
}
```

**Best Case Scenario:**
- All fields provided correctly
- Unique adminname and email
- Valid email format
- For superadmin: No existing superadmin
- Password hashed with bcrypt (12 rounds)
- Admin created successfully
- **Time Complexity:** O(1)
- **Response Time:** ~50-150ms

**Worst Case Scenario:**
- Missing required fields → 400 Bad Request
- Duplicate adminname/email → 500 (MongoDB unique constraint)
- Superadmin already exists → 400 Bad Request
- Database connection failure → 500 Internal Server Error
- **Time Complexity:** O(1) - Early validation failures
- **Response Time:** ~100-300ms

---

### 1.2 POST `/login`

**Description:** Authenticates an admin user using email or adminname along with password. Returns a JWT token for subsequent authenticated requests.

**Authentication:** None (Public endpoint)

**Request Body:**
```json
{
  "identifier": "email@example.com" | "adminname",
  "password": "string (required)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login Successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "adminname": "depotadmin1",
      "email": "admin@depot.com",
      "role": "admin",
      "depotId": "507f1f77bcf86cd799439012" | null
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing credentials:
```json
{
  "success": false,
  "message": "Email/adminname and password are required"
}
```

- **401 Unauthorized** - Invalid credentials:
```json
{
  "success": false,
  "message": "Invalid Credentails"
}
```

- **401 Unauthorized** - Wrong password:
```json
{
  "success": false,
  "message": "Invalid Credentials"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "message": "Server error during login",
  "error": "error message details"
}
```

**Best Case Scenario:**
- Valid identifier (email or adminname)
- Correct password
- Admin found in database
- Password matches (bcrypt comparison)
- JWT token generated successfully
- **Time Complexity:** O(1)
- **Response Time:** ~80-200ms

**Worst Case Scenario:**
- Missing identifier/password → 400 Bad Request
- Admin not found → 401 Unauthorized
- Incorrect password → 401 Unauthorized
- Database query failure → 500 Internal Server Error
- JWT secret missing → 500 Internal Server Error
- **Time Complexity:** O(1)
- **Response Time:** ~100-300ms

---

### 1.3 POST `/super-admin-logout`

**Description:** Logout endpoint for superadmin. This is primarily a client-side operation (token should be removed from client storage). The endpoint confirms successful logout.

**Authentication:** Required (`protect` + `superAdminOnly`)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully",
  "success": true
}
```

**Error Responses:**

- **401 Unauthorized** - No token or invalid token:
```json
{
  "success": false,
  "message": "Unauthorized" | "Token invalid or expired"
}
```

- **403 Forbidden** - Not a superadmin:
```json
{
  "success": false,
  "message": "Access denied – Super Admin only"
}
```

**Best Case Scenario:**
- Valid JWT token provided
- Token not expired
- User is superadmin
- **Time Complexity:** O(1)
- **Response Time:** ~10-30ms

**Worst Case Scenario:**
- No token provided → 401 Unauthorized
- Invalid/expired token → 401 Unauthorized
- User is not superadmin → 403 Forbidden
- **Time Complexity:** O(1)
- **Response Time:** ~10-50ms

---

## 2. Super Admin Routes

**Base Path:** `/api/admin/superadmin`

**Authentication:** All routes require `protect` middleware (valid JWT token)

### 2.1 POST `/create-admin-by-superadmin`

**Description:** Creates a new depot admin user. Only superadmin can create depot admins. Ensures that one depot can only be assigned to one admin at a time.

**Authentication:** Required (`protect` + `superAdminOnly`)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "adminname": "string (required, unique)",
  "email": "string (required, unique, valid email)",
  "password": "string (required)",
  "depotId": "ObjectId (required, must exist in Depot collection)"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Depot Admin created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "adminname": "depotadmin1",
    "email": "admin@depot.com",
    "depot": {
      "id": "507f1f77bcf86cd799439012",
      "name": "AMBALA",
      "code": "AMB",
      "type": "main",
      "district": "AMBALA",
      "parentDepot": null
    }
  }
}
```

**For Sub-Depot:**
```json
{
  "success": true,
  "message": "Depot Admin created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "adminname": "subdepotadmin",
    "email": "subadmin@depot.com",
    "depot": {
      "id": "507f1f77bcf86cd799439013",
      "name": "NARAINGARH",
      "code": "NAR",
      "type": "sub",
      "district": "AMBALA",
      "parentDepot": {
        "id": "507f1f77bcf86cd799439012",
        "name": "AMBALA",
        "code": "AMB"
      }
    }
  }
}
```

**Error Responses:**

- **401 Unauthorized** - No/invalid token:
```json
{
  "success": false,
  "message": "Unauthorized" | "Token invalid or expired"
}
```

- **403 Forbidden** - Not a superadmin:
```json
{
  "success": false,
  "message": "Access denied – Super Admin only"
}
```

- **404 Not Found** - Depot doesn't exist:
```json
{
  "success": false,
  "message": "Depot not found. Please select a valid depot."
}
```

- **400 Bad Request** - Depot already assigned:
```json
{
  "success": false,
  "message": "This depot (AMBALA - AMB) is already assigned to admin: depotadmin1 (admin@depot.com)"
}
```

- **400 Bad Request** - Email already exists:
```json
{
  "success": false,
  "message": "Email already exists"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "message": "Server error",
  "error": "error message details"
}
```

**Best Case Scenario:**
- Valid depotId exists
- Depot not already assigned to another admin
- Unique email and adminname
- Password hashed successfully (bcrypt, 10 rounds)
- Admin created with populated depot info (including parent depot if sub-depot)
- **Time Complexity:** O(1) - Three sequential queries
- **Response Time:** ~150-300ms

**Worst Case Scenario:**
- Invalid depotId → 404 Not Found
- Depot already assigned → 400 Bad Request
- Duplicate email → 400 Bad Request
- Database connection failure → 500 Internal Server Error
- Populate query fails → 500 Internal Server Error
- **Time Complexity:** O(1) - Early failure, multiple queries
- **Response Time:** ~200-500ms

---

### 2.2 GET `/get-all-admin`

**Description:** Retrieves all depot admins (role: 'admin') with their associated depot information. Includes parent depot information for sub-depots. Results are sorted by creation date (newest first).

**Authentication:** Required (`protect` + `superAdminOnly`)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** None

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "adminname": "depotadmin1",
      "email": "admin@depot.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "depot": {
        "id": "507f1f77bcf86cd799439012",
        "name": "AMBALA",
        "code": "AMB",
        "type": "main",
        "district": "AMBALA",
        "parentDepot": null
      }
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "adminname": "subdepotadmin",
      "email": "subadmin@depot.com",
      "createdAt": "2024-01-14T09:20:00.000Z",
      "depot": {
        "id": "507f1f77bcf86cd799439014",
        "name": "NARAINGARH",
        "code": "NAR",
        "type": "sub",
        "district": "AMBALA",
        "parentDepot": {
          "id": "507f1f77bcf86cd799439012",
          "name": "AMBALA",
          "code": "AMB"
        }
      }
    }
  ]
}
```

**Error Responses:**

- **401 Unauthorized** - No/invalid token:
```json
{
  "success": false,
  "message": "Unauthorized" | "Token invalid or expired"
}
```

- **403 Forbidden** - Not a superadmin:
```json
{
  "success": false,
  "message": "Access denied – Super Admin only"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "message": "Server error"
}
```

**Best Case Scenario:**
- Small number of admins (< 100)
- All depots exist and populated correctly
- Database query optimized with indexes
- **Time Complexity:** O(n) - Where n is number of admins
- **Response Time:** ~100-300ms

**Worst Case Scenario:**
- Large number of admins (> 1000)
- Missing depot references (null depots)
- Database connection issues
- Slow populate queries (nested parentDepot)
- **Time Complexity:** O(n) - Linear with number of admins
- **Response Time:** ~500ms-3s (with large datasets)

---

### 2.3 GET `/get-all-staff`

**Description:** Retrieves all staff members (drivers and conductors) across all depots with their depot information. Includes parent depot information for sub-depots. Results are sorted by creation date (newest first).

**Authentication:** Required (`protect` - Any authenticated user)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** None

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "All staff fetched successfully",
  "count": 50,
  "data": [
    {
      "id": "507f1f77bcf86cd799439015",
      "name": "Ramesh Kumar",
      "code": "DRV-1234",
      "role": "driver",
      "phone": "9876543210",
      "licenseNumber": "HR1420112345678",
      "isActive": false,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "depot": {
        "id": "507f1f77bcf86cd799439012",
        "name": "AMBALA",
        "code": "AMB",
        "type": "main",
        "district": "AMBALA",
        "parentDepot": null
      }
    },
    {
      "id": "507f1f77bcf86cd799439016",
      "name": "Suresh Singh",
      "code": "CON-5678",
      "role": "conductor",
      "phone": "9876543211",
      "licenseNumber": null,
      "isActive": false,
      "createdAt": "2024-01-15T10:45:00.000Z",
      "depot": {
        "id": "507f1f77bcf86cd799439014",
        "name": "NARAINGARH",
        "code": "NAR",
        "type": "sub",
        "district": "AMBALA",
        "parentDepot": {
          "id": "507f1f77bcf86cd799439012",
          "name": "AMBALA",
          "code": "AMB"
        }
      }
    }
  ]
}
```

**Error Responses:**

- **401 Unauthorized** - No/invalid token:
```json
{
  "success": false,
  "message": "Unauthorized" | "Token invalid or expired"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "message": "Internal Server error",
  "error": "error message details"
}
```

**Best Case Scenario:**
- Moderate number of staff (< 500)
- All depots properly populated
- Indexed queries for fast retrieval
- **Time Complexity:** O(n) - Where n is number of staff
- **Response Time:** ~200-500ms

**Worst Case Scenario:**
- Very large number of staff (> 5000)
- Missing depot references
- Slow nested populate queries (depot + parentDepot)
- Database performance issues
- **Time Complexity:** O(n) - Linear with staff count
- **Response Time:** ~1s-5s (with large datasets)

---

## 3. Depot Admin Routes

**Base Path:** `/api/admin/depot-work-space`

**Authentication:** All routes require `protect` + `depotAdminOnly` middleware

### 3.1 POST `/add-staff`

**Description:** Adds a new staff member (driver or conductor) to a depot. Depot admins can only add staff to their own depot. Auto-generates unique staff code (DRV-XXXX for drivers, CON-XXXX for conductors) if not provided. License number is required only for drivers.

**Authentication:** Required (`protect` + `depotAdminOnly`)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (required)",
  "role": "driver" | "conductor (required)",
  "depotId": "ObjectId (optional - defaults to admin's depot)",
  "phone": "string (optional)",
  "licenseNumber": "string (required if role is 'driver')"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "driver added successfully" | "conductor added successfully",
  "data": {
    "id": "507f1f77bcf86cd799439015",
    "name": "Ramesh Kumar",
    "code": "DRV-1234",
    "role": "driver",
    "depot": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "AMBALA",
      "code": "AMB",
      "type": "main"
    }
  }
}
```

**Error Responses:**

- **401 Unauthorized** - No/invalid token:
```json
{
  "success": false,
  "message": "Unauthorized" | "Token invalid or expired"
}
```

- **403 Forbidden** - Not a depot admin:
```json
{
  "success": false,
  "message": "Access denied – Admin role required"
}
```

- **403 Forbidden** - Trying to add to different depot:
```json
{
  "message": "You can only add staff to your own depot"
}
```

- **400 Bad Request** - Missing required fields:
```json
{
  "success": false,
  "message": "Name and role are required"
}
```

- **400 Bad Request** - Invalid role:
```json
{
  "success": false,
  "message": "Role must be driver or conductor"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "message": "error message details",
  "success": false
}
```

**Best Case Scenario:**
- All required fields provided
- Valid role (driver/conductor)
- Valid depotId (or uses admin's depot)
- Admin has permission for target depot
- Staff code generated successfully (no collisions)
- Staff created and populated
- **Time Complexity:** O(1) average, O(n) worst case for code generation
- **Response Time:** ~100-250ms

**Worst Case Scenario:**
- Missing name/role → 400 Bad Request
- Invalid role → 400 Bad Request
- Admin trying to add to different depot → 403 Forbidden
- Code generation collision loop (rare) → Slower response
- Database connection failure → 500 Internal Server Error
- Depot not found → 500 (if invalid depotId)
- **Time Complexity:** O(n) worst case if code generation has many collisions
- **Response Time:** ~200-500ms (with error handling or code collisions)

---

### 3.2 POST `/transfer-staff`

**Description:** Transfers a staff member from one depot to another. Depot admins can only transfer staff from their own depot. Super admins can transfer any staff to any depot.

**Authentication:** Required (`protect` + `depotAdminOnly`)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "staffId": "ObjectId (required)",
  "newDepotId": "ObjectId (required)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Staff transferred successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Ramesh Kumar",
    "code": "DRV-1234",
    "role": "driver",
    "depotId": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "CHANDIGARH",
      "code": "CHD",
      "type": "main"
    },
    "phone": "9876543210",
    "licenseNumber": "HR1420112345678",
    "isActive": false,
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T12:30:00.000Z"
  }
}
```

**Error Responses:**

- **401 Unauthorized** - No/invalid token:
```json
{
  "success": false,
  "message": "Unauthorized" | "Token invalid or expired"
}
```

- **403 Forbidden** - Not a depot admin:
```json
{
  "success": false,
  "message": "Access denied – Admin role required"
}
```

- **403 Forbidden** - Trying to transfer from different depot:
```json
{
  "success": false,
  "message": "You can only transfer staff the from your own depot"
}
```

- **404 Not Found** - Staff not found:
```json
{
  "success": false,
  "message": "Staff not found"
}
```

- **404 Not Found** - Target depot not found:
```json
{
  "success": false,
  "message": "Target Depot not found"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "message": "error message details"
}
```

**Best Case Scenario:**
- Valid staffId exists
- Valid newDepotId exists
- Admin has permission (owns staff's current depot or is superadmin)
- Staff updated successfully
- **Time Complexity:** O(1) - Three sequential queries
- **Response Time:** ~150-300ms

**Worst Case Scenario:**
- Staff not found → 404 Not Found
- Target depot not found → 404 Not Found
- Admin trying to transfer from different depot → 403 Forbidden
- Database save failure → 500 Internal Server Error
- **Time Complexity:** O(1) - Early failure, multiple queries
- **Response Time:** ~200-500ms

---

### 3.3 GET `/get-staff`

**Description:** Retrieves all staff members belonging to the authenticated depot admin's depot. Results are sorted by role (drivers first) and then by name alphabetically.

**Authentication:** Required (`protect` + `depotAdminOnly`)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** None

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Ramesh Kumar",
      "code": "DRV-1234",
      "role": "driver",
      "depotId": "507f1f77bcf86cd799439012",
      "phone": "9876543210",
      "licenseNumber": "HR1420112345678",
      "isActive": false,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "name": "Suresh Singh",
      "code": "CON-5678",
      "role": "conductor",
      "depotId": "507f1f77bcf86cd799439012",
      "phone": "9876543211",
      "licenseNumber": null,
      "isActive": false,
      "createdAt": "2024-01-15T10:45:00.000Z",
      "updatedAt": "2024-01-15T10:45:00.000Z"
    }
  ]
}
```

**Error Responses:**

- **401 Unauthorized** - No/invalid token:
```json
{
  "success": false,
  "message": "Unauthorized" | "Token invalid or expired"
}
```

- **403 Forbidden** - Not a depot admin:
```json
{
  "success": false,
  "message": "Access denied – Admin role required"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "message": "error message details"
}
```

**Best Case Scenario:**
- Moderate number of staff in depot (< 200)
- Indexed query on depotId and role
- Fast database response
- **Time Complexity:** O(n log n) - Due to sorting, where n is staff count
- **Response Time:** ~50-150ms

**Worst Case Scenario:**
- Large number of staff (> 500)
- Missing indexes on depotId/role
- Slow database query
- Database connection issues
- **Time Complexity:** O(n log n) - Sorting overhead with large datasets
- **Response Time:** ~300ms-1s (with large datasets)

---

## 4. Health Check

### GET `/api/health`

**Description:** Simple health check endpoint to verify the server is running.

**Authentication:** None (Public endpoint)

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "status": "sucess",
  "message": "Backend is running!",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "env": "development"
}
```

**Best Case Scenario:**
- Server is running
- **Time Complexity:** O(1)
- **Response Time:** ~5-10ms

**Worst Case Scenario:**
- Server error (unlikely for this endpoint)
- **Time Complexity:** O(1)
- **Response Time:** ~10-20ms

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication required or failed
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

---

## Project Structure

```
backend/
│
├── server.js                          # Main application entry point
│                                       # - Express app setup
│                                       # - Middleware configuration (CORS, JSON parser)
│                                       # - Route mounting
│                                       # - Server startup
│
├── package.json                       # Dependencies and npm scripts
│                                       # - Dependencies: express, mongoose, jwt, bcryptjs, cors
│                                       # - Scripts: dev (nodemon), test
│
├── .env                               # Environment variables (not in git)
│                                       # - MONGO_URI: MongoDB connection string
│                                       # - JWT_SECRET: Secret key for JWT tokens
│                                       # - PORT: Server port (default: 5000)
│                                       # - NODE_ENV: Environment (development/production)
│
├── .gitignore                         # Git ignore rules
│                                       # - node_modules/
│                                       # - .env
│                                       # - package-lock.json
│
├── scripts/
│   └── seedDepot.js                   # Database seeding script
│                                       # - Seeds main depots (24 depots)
│                                       # - Seeds sub-depots (17 sub-depots)
│                                       # - Establishes parent-child relationships
│
└── src/
    │
    ├── controllers/                   # Route handler functions
    │   │
    │   ├── adminAuth.controller.js    # Authentication controllers
    │   │                               # - signup(): Create new admin user
    │   │                               # - login(): Authenticate and return JWT
    │   │                               # - logout(): Logout confirmation
    │   │
    │   ├── superAdmin.controller.js   # Super admin operations
    │   │                               # - createDepotAdmin(): Create depot admin
    │   │                               # - getAllDepotAdmins(): List all depot admins
    │   │                               # - getAllStaff(): List all staff across depots
    │   │
    │   └── depotAdmin.Controller.js   # Depot admin operations
    │                                   # - addStaff(): Add driver/conductor to depot
    │                                   # - transferStaff(): Transfer staff between depots
    │                                   # - getMyStaff(): Get staff in admin's depot
    │
    ├── middleware/
    │   └── auth.middleware.js         # Authentication & authorization middleware
    │                                   # - protect(): Verify JWT token, attach admin to req
    │                                   # - superAdminOnly(): Restrict to superadmin role
    │                                   # - depotAdminOnly(): Restrict to admin role
    │                                   # - restrictToOwnDepot(): Restrict to own depot
    │
    ├── models/                        # Mongoose schemas and models
    │   │
    │   ├── admin.models.js           # Admin user model
    │   │                               # - Schema: adminname, email, passwordHash, role, depotId
    │   │                               # - Methods: comparePassword()
    │   │                               # - Indexes: adminname (unique), email (unique)
    │   │
    │   ├── depot.models.js           # Depot model (main/sub depots)
    │   │                               # - Schema: name, code, type, district, parentDepot, isActive
    │   │                               # - Validation: parentDepot required for sub-depots
    │   │                               # - Indexes: code (unique), type, parentDepot
    │   │
    │   └── staff.model.js            # Staff model (drivers/conductors)
    │                                   # - Schema: name, code, role, depotId, phone, licenseNumber, isActive
    │                                   # - Pre-save hook: Auto-generates unique code (DRV-XXXX or CON-XXXX)
    │                                   # - Indexes: depotId+role, code (unique)
    │
    ├── routes/                        # Express route definitions
    │   │
    │   ├── adminAuth.routes.js       # Authentication routes
    │   │                               # - POST /signup
    │   │                               # - POST /login
    │   │                               # - POST /super-admin-logout (protected)
    │   │
    │   ├── superAdmin.routes.js      # Super admin routes
    │   │                               # - POST /create-admin-by-superadmin (protected, superadmin only)
    │   │                               # - GET /get-all-admin (protected, superadmin only)
    │   │                               # - GET /get-all-staff (protected, any authenticated)
    │   │
    │   └── depotAdmin.routes.js      # Depot admin routes
    │                                   # - POST /add-staff (protected, depot admin only)
    │                                   # - POST /transfer-staff (protected, depot admin only)
    │                                   # - GET /get-staff (protected, depot admin only)
    │
    └── utils/                         # Utility functions
        │
        ├── db.js                     # MongoDB connection utility
        │                               # - connectDB(): Establishes MongoDB connection
        │                               # - Uses MONGO_URI from .env
        │                               # - Database name: 'tms-db'
        │
        └── generateToken.js          # JWT token generation
                                        # - generateToken(admin): Creates JWT with id, role, depotId
                                        # - Expires in: 1 day
                                        # - Uses JWT_SECRET from .env
```

### Data Flow

1. **Request Flow:**
   ```
   Client Request
   → Express Middleware (CORS, JSON parser)
   → Route Handler
   → Authentication Middleware (if protected)
   → Authorization Middleware (if role-specific)
   → Controller Function
   → Database Query (Mongoose)
   → Response
   ```

2. **Authentication Flow:**
   ```
   Login Request
   → Find Admin by email/adminname
   → Compare password (bcrypt)
   → Generate JWT token
   → Return token + admin info
   ```

3. **Authorization Flow:**
   ```
   Protected Request
   → Extract JWT from Authorization header
   → Verify token (JWT verify)
   → Find Admin by ID from token
   → Attach admin to req.admin
   → Check role (superAdminOnly/depotAdminOnly)
   → Proceed to controller
   ```

### Database Models Relationships

```
Admin (superadmin/admin)
  ├── depotId → Depot (for admin role only)
  └── role: 'superadmin' | 'admin'

Depot (main/sub)
  ├── parentDepot → Depot (for sub-depots only)
  └── type: 'main' | 'sub'

Staff (driver/conductor)
  ├── depotId → Depot (required)
  └── role: 'driver' | 'conductor'
```

### Key Features

- **Role-Based Access Control (RBAC):** Superadmin and depot admin roles with different permissions
- **JWT Authentication:** Secure token-based authentication
- **Password Hashing:** bcrypt with 10-12 rounds
- **Auto-Generated Codes:** Staff codes auto-generated (DRV-XXXX, CON-XXXX)
- **Depot Hierarchy:** Support for main and sub-depots with parent-child relationships
- **Data Validation:** Mongoose schema validation and custom validators
- **Indexed Queries:** Database indexes for optimized performance

---

## Environment Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
MONGO_URI=mongodb://localhost:27017
JWT_SECRET=your-secret-key-here
PORT=5000
NODE_ENV=development
```

3. Seed database (optional):
```bash
node scripts/seedDepot.js
```

4. Start development server:
```bash
npm run dev
```

---

## Technologies Used

- **Express.js** (v5.1.0) - Web framework
- **Mongoose** (v8.19.3) - MongoDB ODM
- **jsonwebtoken** (v9.0.2) - JWT authentication
- **bcryptjs** (v3.0.3) - Password hashing
- **cors** (v2.8.5) - Cross-origin resource sharing
- **dotenv** (v17.2.3) - Environment variable management

---

## License

ISC

---

**Last Updated:** 2024-01-15
