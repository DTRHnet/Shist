# Shist - Shared List Application

## Overview

Shist is a mobile-first shared list application built as a full-stack web application. The app allows users to create, manage, and share lists with friends and family in real-time. Users can connect with others, collaborate on shared lists, and receive real-time updates when items are added or modified. The application features a modern React frontend with Express backend, PostgreSQL database, and WebSocket support for live collaboration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with **React 18** using **TypeScript** and **Vite** as the build tool. The UI framework uses **shadcn/ui** components built on top of **Radix UI** primitives with **Tailwind CSS** for styling. The application follows a mobile-first responsive design approach.

Key frontend decisions:
- **Wouter** for client-side routing instead of React Router for smaller bundle size
- **TanStack React Query** for server state management and caching
- **Component-based architecture** with reusable UI components
- **TypeScript** for type safety across the entire frontend
- **Mobile-first design** with bottom navigation optimized for mobile devices

### Backend Architecture
The server uses **Express.js** with **TypeScript** running on **Node.js**. The architecture separates concerns with distinct modules for routing, database operations, authentication, and WebSocket handling.

Key backend decisions:
- **Express.js** as the web framework for simplicity and ecosystem support
- **Modular structure** with separate files for routes, storage, database, and authentication
- **WebSocket integration** using the native WebSocket API for real-time features
- **Session-based authentication** using express-session with PostgreSQL storage
- **RESTful API design** with consistent error handling and response formats

### Database Design
The application uses **PostgreSQL** as the primary database with **Drizzle ORM** for type-safe database operations and migrations.

Database schema includes:
- **Users table** for user profiles and authentication data
- **Sessions table** for session storage (required for auth)
- **Connections table** for user-to-user relationships with status tracking
- **Lists table** for shared lists with privacy settings
- **List participants table** for managing list permissions
- **List items table** for individual list entries with metadata

### Authentication System
Uses **Replit's OpenID Connect (OIDC)** authentication system with **Passport.js** strategy implementation. This provides secure, OAuth-based authentication without requiring separate user registration.

Authentication features:
- **OIDC integration** with Replit's authentication service
- **Session management** using PostgreSQL-backed session store
- **Middleware-based protection** for authenticated routes
- **User profile synchronization** from OIDC claims

### Real-time Features
Implements **WebSocket connections** for live collaboration on shared lists. The WebSocket server handles subscription-based updates where clients can subscribe to specific lists and receive real-time notifications.

WebSocket implementation:
- **Event-based messaging** for list updates
- **Room-based subscriptions** for efficient message routing
- **Automatic reconnection** handling on the client side
- **Optimistic updates** with server reconciliation

## External Dependencies

### Database Services
- **Neon Database** (@neondatabase/serverless) - Serverless PostgreSQL database provider
- **PostgreSQL** - Primary database with session storage table requirements

### Authentication Services
- **Replit OIDC** - Primary authentication provider using OpenID Connect
- **Passport.js** with OpenID Client - Authentication middleware and strategy

### UI and Styling
- **Radix UI** - Headless UI component library for accessibility
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library for consistent iconography

### Development and Build Tools
- **Vite** - Build tool and development server
- **TypeScript** - Type system for JavaScript
- **Drizzle Kit** - Database migration and schema management tool

### Runtime Libraries
- **React Query** - Server state management and caching
- **date-fns** - Date manipulation utilities
- **Zod** - Schema validation for API endpoints and database operations

### Session and Security
- **connect-pg-simple** - PostgreSQL session store adapter
- **express-session** - Session middleware for Express

The application is designed to be deployed on Replit's platform with built-in support for environment variables, database provisioning, and authentication integration.

## Local Deployment

For local Linux deployment, the project includes automated installation scripts:

- **install.sh** - Detects Linux distribution and installs all prerequisites (Node.js 20+, PostgreSQL, Python3, build tools, tsx for TypeScript), sets up database, and configures environment
- **start.sh** - Loads environment, runs migrations, and starts the application with intelligent TypeScript/JavaScript detection and monitoring
- **stop.sh** - Generated automatically for clean shutdown

The scripts support Ubuntu/Debian/Kali, Fedora/CentOS/RHEL, and Arch/Manjaro distributions with automatic package management, TypeScript execution support, and database configuration. The start script automatically detects project type and uses the optimal execution method (npm run dev for TypeScript development, tsx for direct execution, or node for JavaScript).