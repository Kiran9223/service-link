<div align="center">

# ⚡ ServiceLink

### AI-Powered Service Marketplace with Fairness-Driven Provider Ranking

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.1-brightgreen?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.x-231F20?style=for-the-badge&logo=apachekafka)](https://kafka.apache.org)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)

> A full-stack service marketplace connecting customers with local service providers — plumbers, electricians, cleaners, and more — powered by an AI booking assistant and a proprietary **fairness algorithm** that ensures new providers receive equitable visibility alongside established ones.

**Master's Thesis Project · California State University, Fullerton · Spring 2026**

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Fairness Algorithm](#-fairness-algorithm)
- [AI Chatbot](#-ai-chatbot)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)

---

## ✨ Features

### For Customers

| Feature | Description |
|---------|-------------|
| **AI Booking Assistant** | Conversational chatbot that finds nearby providers, compares options, and books services end-to-end |
| **Service Discovery** | Browse and search services by category, location, and rating |
| **Booking Management** | Full lifecycle tracking — Pending → Confirmed → In Progress → Completed |
| **Real-Time Notifications** | Instant WebSocket push notifications for every booking status change |
| **Reviews & Ratings** | Submit star ratings with written reviews after service completion |
| **Password Reset** | Self-service reset flow with secure time-limited tokens |
| **Profile Management** | Manage personal details, location, and contact information |

### For Service Providers

| Feature | Description |
|---------|-------------|
| **Provider Dashboard** | Live job queue with pending actions, today's schedule, and earnings stats |
| **Job Lifecycle Controls** | One-click Confirm / Start / Complete / Cancel from the dashboard |
| **Availability Management** | Set recurring and one-off time slots for customer booking |
| **Service Listings** | Create, edit, and deactivate listings with flexible pricing (hourly / fixed / range) |
| **Reviews Panel** | Star distribution chart and all customer reviews in one view |
| **Visibility Score** | Personal fairness score breakdown showing rank, score components, and progress toward the boost graduation threshold |
| **Business Profile** | Manage business name, bio, certifications, and service radius |

### Platform-Wide

| Feature | Description |
|---------|-------------|
| **Fairness Dashboard** | Sortable leaderboard of all providers with full score breakdowns and algorithm explanation |
| **JWT Authentication** | Stateless auth with 24-hour tokens; roles: `USER`, `SERVICE_PROVIDER`, `ADMIN` |
| **Event-Driven Notifications** | Kafka-backed notification pipeline for reliable, decoupled delivery |
| **Review Notifications** | Providers receive a real-time push alert when a customer submits a review |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    React Frontend  :5173                             │
│           TypeScript · Redux Toolkit · Tailwind CSS                  │
│   REST (/api/*)  +  WebSocket STOMP (/ws/notifications)              │
└────────────────────┬────────────────────────┬────────────────────────┘
                     │  proxied by Vite        │ STOMP over SockJS
          ┌──────────▼──────────┐    ┌─────────▼──────────┐
          │  Spring Boot :8081  │    │   FastAPI  :8000   │
          │  Java 17 · JPA     │    │  LangChain · Groq  │
          │  Spring Security   │    │  llama-3.3-70b     │
          └───┬──────┬──────┬──┘    └──────┬─────────────┘
              │      │      │               │
      ┌───────▼─┐ ┌──▼──┐ ┌▼────────┐ ┌───▼────────┐
      │Postgres │ │Redis│ │  Kafka  │ │   Redis    │
      │  :5432  │ │:6379│ │  :9092  │ │ (sessions) │
      └─────────┘ └─────┘ └────────-┘ └────────────┘
```

**Event flow:** Booking action → `BookingEventProducer` → Kafka topic `servicelink.booking.lifecycle` → `BookingEventConsumer` → `NotificationService` → WebSocket push to browser.

---

## 🛠 Tech Stack

### Backend
- **Spring Boot 4.0.1** — REST API, Spring Security, Spring Data JPA
- **Java 17** — application runtime
- **PostgreSQL 16** — primary database with 12 Flyway migrations
- **Redis** — response caching
- **Apache Kafka** — async event streaming for notifications
- **Spring WebSocket** — STOMP over SockJS for real-time push
- **JWT** — stateless authentication (24 h expiry)
- **Lombok** — boilerplate reduction

### Frontend
- **React 19** + **TypeScript 5.9** — UI framework
- **Vite 7** — dev server and bundler
- **Redux Toolkit** — global state (auth, UI, notifications)
- **React Router v7** — client-side routing with lazy loading
- **Tailwind CSS** — utility-first styling
- **Axios** — HTTP client with JWT interceptor
- **@stomp/stompjs** + **SockJS** — WebSocket client
- **Lucide React** — icon library
- **React Hook Form** + **Zod** — form validation

### AI Chatbot
- **FastAPI 0.135** — Python API server
- **LangChain 1.2** — conversation chain orchestration
- **Groq** — hosted LLM inference (`llama-3.3-70b-versatile`, temperature 0.3)
- **Redis** — conversation session state (TTL 30 min)
- **Nominatim** (OpenStreetMap) — geocoding, biased toward California

### Infrastructure
- **Docker Compose** — PostgreSQL, Redis, Kafka, Kafka-UI
- **Flyway** — database migration management

---

## ⚖️ Fairness Algorithm

The core thesis contribution is a **fairness-aware provider ranking system** that prevents new providers from being buried under established ones in search results.

### Scoring Formula

```
finalScore = min(baseScore + fairnessBoost, 1.0)

baseScore =
    (overallRating / 5.0)               × 0.40   ← Rating quality
  + (min(bookingsCompleted, 20) / 20)   × 0.20   ← Experience (capped at 20)
  + 0.20                                          ← Availability credit
  + 0.20                                          ← Coverage area credit

fairnessBoost = +0.15   if bookingsCompleted < 20   (new provider boost)
              =  0.00   otherwise
```

### Why It Matters

| Provider | Rating | Bookings | Base | Boost | **Final** |
|----------|--------|----------|------|-------|-----------|
| Established Pro | ⭐ 4.8 | 150 | 0.78 | +0.00 | **0.78** |
| New Provider | ⭐ 4.5 | 3 | 0.60 | +0.15 | **0.75** |

A new provider with solid ratings appears nearly on par with a veteran — giving them a real opportunity to build a customer base. Once they reach **20 completed bookings**, the boost is removed and they compete on merit alone.

The **Fairness Dashboard** (`/fairness`) visualises this for all providers. The **My Visibility** panel on each provider's personal dashboard shows exactly where they rank, their full score breakdown, and how many bookings remain until they graduate from the boost program.

---

## 🤖 AI Chatbot

A stateful, multi-turn conversational booking assistant powered by Groq's LLaMA 3.3 70B model.

### Conversation State Machine

```
GATHERING ──► PRESENTING ──► CONFIRMING ──► BOOKED
    ▲                                          │
    └──────────── CANCEL (any state) ◄─────────┘
```

| State | What Happens |
|-------|--------------|
| **GATHERING** | LLM extracts `service_type` + `location`; geocodes the address; searches nearby providers via Spring Boot |
| **PRESENTING** | Shows top 3 fairness-ranked providers as a message with quick-reply chips |
| **CONFIRMING** | Renders a `BookingConfirmCard`; waits for "yes" or "no" |
| **BOOKED** | Creates the booking via Spring Boot; navigates to `/bookings/{id}` |

### JWT Passthrough

The React frontend sends `user_jwt` in every chat POST body → stored in the Redis session → forwarded as `Authorization: Bearer <token>` to Spring Boot when creating the booking. Guest users are blocked at the `CONFIRMING` stage with a login prompt.

---

## 🚀 Getting Started

### Prerequisites

- **Docker Desktop** — for PostgreSQL, Redis, Kafka
- **Java 17+** and **Maven**
- **Node.js 20+** and **npm**
- **Python 3.11+** and **pip**
- A free **Groq API key** from [console.groq.com](https://console.groq.com)

### 1 — Start Infrastructure

```bash
docker-compose -f docker/docker-compose.yml up -d
```

Starts PostgreSQL `:5432`, Redis `:6379`, Kafka `:9092`, Kafka-UI `:8080`.

### 2 — Configure Backend

```bash
cp backend/servicelink/.env.example backend/servicelink/.env
```

Fill in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=servicelink
DB_USERNAME=postgres
DB_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379

KAFKA_BOOTSTRAP_SERVERS=localhost:9092

JWT_SECRET=your_256_bit_secret_here
```

### 3 — Start Backend

```bash
cd backend/servicelink
./mvnw spring-boot:run
```

Spring Boot starts on **`:8081`**. Flyway runs all database migrations automatically.

### 4 — Configure & Start Chatbot

```bash
cd chatbot/fastapi-ai-service
pip install -r requirements.txt
```

Create a `.env` file:

```env
GROQ_API_KEY=gsk_your_key_here
REDIS_URL=redis://localhost:6379
SPRING_BOOT_URL=http://localhost:8081
FRONTEND_URL=http://localhost:5173
```

```bash
uvicorn app.main:app --reload --port 8000
```

### 5 — Start Frontend

```bash
cd frontend/servicelink-frontend
npm install
npm run dev
```

Frontend starts on **`:5173`**. Vite proxies all `/api/*` requests to `:8081`.

### All Services at a Glance

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Spring Boot API | http://localhost:8081 |
| AI Chatbot | http://localhost:8000 |
| Kafka UI | http://localhost:8080 |

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | Public | Register a customer account |
| `POST` | `/api/auth/register/provider` | Public | Register a service provider |
| `POST` | `/api/auth/login` | Public | Login — returns JWT |
| `POST` | `/api/auth/forgot-password` | Public | Request a password reset token |
| `POST` | `/api/auth/reset-password` | Public | Submit new password with token |

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/bookings` | Auth | Create a booking |
| `GET` | `/api/bookings/{id}` | Auth | Get booking details |
| `GET` | `/api/bookings/my-bookings` | Auth | Customer's booking history |
| `GET` | `/api/bookings/provider/bookings` | Provider | Provider's full job queue |
| `PUT` | `/api/bookings/{id}/confirm` | Provider | Confirm a pending booking |
| `PUT` | `/api/bookings/{id}/start` | Provider | Mark service as started |
| `PUT` | `/api/bookings/{id}/complete` | Provider | Mark service as completed |
| `PUT` | `/api/bookings/{id}/cancel` | Auth | Cancel a booking |

### Services & Listings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/services/search` | Public | Search service listings |
| `GET` | `/api/services/search/nearby` | Public | Nearby providers by lat/lng |
| `GET` | `/api/services/coverage-areas` | Public | Cities where active providers operate |
| `POST` | `/api/services/listings` | Provider | Create a service listing |
| `PUT` | `/api/services/listings/{id}` | Provider | Update a listing |
| `DELETE` | `/api/services/listings/{id}` | Provider | Deactivate a listing |

### Ratings & Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/ratings` | Auth | Submit a review for a completed booking |
| `GET` | `/api/ratings/provider/{id}` | Public | All reviews for a provider |
| `GET` | `/api/ratings/booking/{id}` | Auth | Rating for a specific booking |
| `GET` | `/api/notifications` | Auth | Paginated notification history |
| `PUT` | `/api/notifications/{id}/read` | Auth | Mark a notification as read |
| `PUT` | `/api/notifications/read-all` | Auth | Mark all notifications as read |
| `GET` | `/api/notifications/unread-count` | Auth | Count of unread notifications |

### Analytics & Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/analytics/fairness` | Public | Fairness scores for all providers |
| `GET` | `/api/users/me` | Auth | Get current user's full profile |
| `PUT` | `/api/users/me` | Auth | Update personal information |
| `PUT` | `/api/users/me/provider` | Provider | Update business information |

---

## 🗄 Database Schema

Flyway manages **12 migrations** (`V1`–`V12`). Key tables:

```
users                    ← authentication, profile, location (lat/lng)
service_providers        ← business info, rating, booking count (shares PK with users)
service_listings         ← provider's offered services with flexible pricing
availability_slots       ← bookable time windows per provider
bookings                 ← full booking lifecycle with all timestamps
booking_audit            ← immutable status change log
ratings                  ← 1–5 star reviews (one review per booking enforced)
notifications            ← persistent notification records
password_reset_tokens    ← time-limited (30 min) reset tokens
```

A PostgreSQL **trigger** (`update_provider_rating`) automatically recalculates `service_providers.overall_rating` on every `INSERT`/`UPDATE` to the `ratings` table — no application code needed.

**Booking statuses:** `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED` (or `CANCELLED` from any state)

---

## 📁 Project Structure

```
service-link/
│
├── backend/servicelink/                    # Spring Boot (Java 17)
│   └── src/main/java/com/kiran/servicelink/
│       ├── config/          # SecurityConfig, KafkaConfig, RedisConfig, WebSocketConfig
│       ├── controller/      # REST controllers (Auth, Booking, Service, User, Rating…)
│       ├── service/         # Business logic
│       ├── repository/      # Spring Data JPA repositories
│       ├── entity/          # JPA entities (User, ServiceProvider, Booking, Rating…)
│       ├── dto/             # Request and Response DTOs
│       │   ├── request/
│       │   └── response/
│       ├── events/          # Kafka event POJOs
│       ├── kafka/           # BookingEventProducer, BookingEventConsumer
│       ├── security/        # JwtAuthenticationFilter, JwtUtil, UserDetailsServiceImpl
│       └── exception/       # GlobalExceptionHandler
│
├── frontend/servicelink-frontend/          # React 19 + TypeScript
│   └── src/
│       ├── api/             # Axios-based API clients (bookingApi, userApi, ratingApi…)
│       ├── features/        # Feature modules
│       │   ├── auth/        # Login, Register, ForgotPassword, ResetPassword
│       │   ├── booking/     # BookingPage, BookingDetailPage
│       │   ├── dashboard/   # CustomerDashboard, ProviderDashboard, ProviderServicesPage
│       │   ├── fairness/    # FairnessDashboard
│       │   ├── notifications/ # NotificationsPage
│       │   ├── profile/     # ProfilePage
│       │   └── services/    # HomePage, ServicesPage, ServiceDetailPage
│       ├── components/      # Shared UI (Navbar, AppLayout, StarRating, ReviewForm…)
│       ├── hooks/           # useWebSocket, useAuth, useAppDispatch
│       ├── store/           # Redux slices (auth, ui, notifications)
│       ├── router/          # React Router v7 config with lazy loading
│       └── types/           # TypeScript interfaces mirroring backend DTOs
│
├── chatbot/fastapi-ai-service/             # Python FastAPI
│   └── app/
│       ├── chains/          # LangChain booking agent state machine
│       ├── services/        # provider_service, ranking_service, geocoding_service
│       ├── routers/         # API endpoint definitions
│       └── models/          # Pydantic request/response models
│
└── docker/
    └── docker-compose.yml                  # PostgreSQL, Redis, Kafka, Kafka-UI
```

---

## 🔐 Authentication & Roles

All protected endpoints require a **JWT Bearer token** in the `Authorization` header.

| Role | Access Level |
|------|-------------|
| `USER` | Browse services, create bookings, leave reviews, manage own profile |
| `SERVICE_PROVIDER` | All of USER + manage listings, availability, and job queue |
| `ADMIN` | Platform administration (`/api/admin/**`) |

---

<div align="center">

Built with ☕ Java · ⚛️ React · 🐍 Python · and 💜 by **Kiran**

California State University, Fullerton · Spring 2026

</div>
