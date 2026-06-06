TOURIST SOCIAL — App Description
1. Overview

A social travel platform that connects tourists in real time, allowing them to interact, share experiences, discover places, and coordinate meetups during their trips.

The platform helps travelers:

Connect with nearby tourists
Share travel experiences
Discover recommended destinations
Plan visits together
Access AI-powered travel assistance

The system will be developed web-first and later expanded into a mobile application.

2. Main Objective

To create a smart tourism networking platform that enhances travel experiences through:

Social connectivity
Real-time communication
Intelligent recommendations
Collaborative trip planning
3. Core Features
A. User Registration and Authentication

Users can create and manage accounts securely.

Features:

Sign up / Login
Social login integration
Profile creation
Travel preference setup
B. Tourist Profile System

Each user has a personalized travel profile.

Includes:

Name / profile picture
Current travel location
Travel interests
Preferred activities
Budget category
Travel style

Examples:

Adventure traveler
Cultural explorer
Food enthusiast
Backpacker
C. Experience Sharing Feed

A social media-style feed where users can post:

Photos
Reviews
Travel stories
Recommendations
Place ratings

Purpose:

Help tourists learn from others
Create a travel community
Improve place recommendations
D. Real-Time Chat System

Allows tourists to communicate instantly.

Features:

One-to-one chat
Group chat
Meetup coordination
Message notifications

Use cases:

Planning group visits
Asking for travel advice
Connecting with nearby travelers
E. Live Location Sharing

Users can share their location with selected tourists.

Capabilities:

Real-time map visibility
Temporary location sharing
Meetup coordination
Nearby tourist discovery
F. Interactive Map Integration

Provides map-based exploration.

Functions:

View tourist locations
Explore nearby attractions
Navigation assistance
Meeting point selection
G. AI Travel Assistant

An intelligent assistant that provides travel guidance.

Can answer:

Recommended places nearby
Best visiting times
Local cultural information
Trip planning suggestions
Budget travel advice
H. Smart Tourist Pairing System

Uses sentiment and preference analysis to connect compatible travelers.

Matching based on:

Travel interests
Communication style
Activity preferences
Travel pace
Budget compatibility

Purpose:

To help tourists find suitable travel companions.

I. Personalized Place Recommendation System

Recommends destinations based on:

User interests
Past activity
Community reviews
Current location
Similar user behavior
J. Collaborative Trip Planning

Allows multiple tourists to organize visits together.

Features:

Shared itinerary creation
Schedule coordination
Group planning



#### **Preliminary techonology Stack**
- React
- Django Rest backend
- Session Authentication & Google OAuth (allauth)
- Redis for caching and message queue
- Use of NoSQL
- Web sockets for app


#### **Frontend design**
- “High-fidelity Apple visionOS-inspired glassmorphism interface, translucent frosted panels, dynamic blur background, floating layered cards, soft volumetric lighting, smooth corner radius, subtle specular reflections, premium minimalist typography, depth-aware spacing, elegant motion transitions, ultra-clean futuristic aesthetic.”


#### **APIS**
- https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design "Adhere to the best api design practices such as health
POST /auth/register
POST /auth/login
GET /users/me
PUT /users/me
POST /posts
GET /posts/feed
POST /location/update
GET /users/nearby
POST /chat/rooms
GET /chat/rooms/:id/messages
POST /ai/chat
---------------------------------------
**Implemented to this point**
- Need to work on frontend
- notification pop up after messaging
- making the location anonymous within the 5km and later share location after chatting or giving premission
- Yet to integrate a rag bot
