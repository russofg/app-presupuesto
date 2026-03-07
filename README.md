# Financia — Your money, beautifully organized

A premium personal finance web application built with Next.js 16, React 19, TypeScript, Firebase, and a modern design system inspired by Copilot Money, Stripe, and Apple Wallet.

## Features

- **Dashboard** — Real-time financial overview with animated metrics, cash flow charts, and spending insights
- **Transactions** — Full CRUD with filtering, search, categorization, and grouped date views
- **Budgets** — Monthly budget tracking per category with progress bars and alerts
- **Savings Goals** — Visual goal tracking with animated progress and fund management
- **Categories** — Customizable categories with icons and colors
- **Auth** — Secure authentication with Firebase (login, register, password reset)
- **Onboarding** — 3-step premium wizard for new users
- **Dark/Light Mode** — Elegant theme switching with system preference support
- **Mobile-First** — Responsive design with dedicated mobile navigation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19 + shadcn/ui + Tailwind CSS v4 |
| Animations | Motion (Framer Motion) |
| State | TanStack Query v5 |
| Forms | React Hook Form + Zod v4 |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | Sonner |
| Theme | next-themes |

## Getting Started

### Prerequisites

- Node.js 20+
- A Firebase project with Authentication and Firestore enabled

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure Firebase — edit `.env.local` with your Firebase project credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

4. Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register, Forgot Password
│   ├── (app)/            # Authenticated routes
│   │   ├── dashboard/    # Main dashboard + components
│   │   ├── transactions/ # Transaction list + dialog
│   │   ├── budgets/      # Budget management
│   │   ├── goals/        # Savings goals
│   │   ├── categories/   # Category management
│   │   ├── settings/     # User preferences
│   │   └── onboarding/   # New user wizard
│   ├── globals.css       # Design tokens + theme
│   └── layout.tsx        # Root layout + providers
├── components/
│   ├── layout/           # App shell, sidebar, mobile nav
│   ├── ui/               # shadcn/ui components
│   ├── animated-number.tsx
│   ├── category-icon.tsx
│   ├── empty-state.tsx
│   └── loading-skeleton.tsx
├── hooks/                # Custom hooks (auth, queries, mutations)
├── lib/
│   ├── services/         # Firebase auth + Firestore operations
│   ├── firebase.ts       # Firebase initialization
│   ├── format.ts         # Currency, date formatting
│   ├── motion.ts         # Animation variants
│   ├── providers.tsx      # App providers (Query, Theme, Auth)
│   └── utils.ts          # shadcn utilities
└── types/                # Zod schemas + TypeScript types
```

## Firestore Data Model

- `settings/{userId}` — User preferences and onboarding status
- `transactions/{id}` — Income and expense records (owned by userId)
- `categories/{id}` — Custom and default categories (owned by userId)
- `budgets/{id}` — Monthly budget limits per category (owned by userId)
- `savingsGoals/{id}` — Savings targets with progress tracking (owned by userId)

All collections enforce ownership via Firestore security rules.

## License

Private — All rights reserved.
