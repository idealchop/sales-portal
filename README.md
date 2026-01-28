# Smart Refill Sales Portal

Welcome to the Smart Refill Sales Portal, a comprehensive B2B sales management application designed to empower the sales team of Smart Refill. This tool provides everything a sales representative or manager needs to manage clients, create proposals, track commissions, and leverage AI to enhance productivity.

## ✨ Key Features

- **Personalized Dashboards**: Separate, tailored dashboards for sales executives, managers, and administrators, providing relevant KPIs and tools for each role.
- **Client & Proposal Management**: A complete CRM to manage client information, track proposal statuses, and maintain a history of interactions.
- **Automated Commission Tracking**: A robust system to calculate and track one-time, recurring, and manager-override commissions.
- **AI-Powered Tools**:
    - **Proposal Generation**: Create professional sales proposal drafts instantly using generative AI.
    - **Content Studio**: Generate engaging social media posts, including captions and images, to boost marketing efforts.
- **Onboarding Flow**: A seamless multi-step onboarding process for new sales representatives to set up their profiles and credentials.
- **Sales Materials Library**: A centralized repository for all sales and marketing collateral, including brochures, presentations, and videos.
- **Role-Based Access Control**: Secure access levels for Sales Executives, Sales Managers, and Admins, ensuring data privacy and appropriate permissions.

## 🚀 Tech Stack

This project is built with a modern, scalable, and efficient tech stack:

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **UI Library**: [React](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Cloud Storage)
- **Generative AI**: [Genkit (by Firebase)](https://firebase.google.com/docs/genkit)
- **Charting**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

Follow these steps to get the project running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 1. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root of the project. You will need to provide the following API keys:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Your Google Maps Platform API key, required for address lookup and map features.
- `GEMINI_API_KEY`: Your Google AI Gemini API key, required for the generative AI features.

Your `.env` file should look like this:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 3. Running the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## 📂 Project Structure

The project follows a standard Next.js App Router structure:

-   `src/app/`: Contains all the routes and pages of the application.
    -   `(auth)`: Routes for authentication (login).
    -   `dashboard`: Protected routes for the main sales portal.
    -   `admin`: Protected routes for the admin dashboard.
    -   `onboarding`: Public routes for new user setup.
    -   `proposal`: Public routes for creating and viewing proposals.
-   `src/components/`: Shared React components, including UI components from ShadCN.
-   `src/firebase/`: Firebase configuration, providers, and custom hooks (`useUser`, `useCollection`, etc.).
-   `src/ai/`: Contains all Genkit flows for AI-powered features.
-   `src/hooks/`: Custom React hooks for data fetching and business logic.
-   `src/lib/`: Utility functions, data definitions, and actions.
-   `docs/`: Contains the `backend.json` file which defines the data schema for Firestore.
-   `firestore.rules`: Security rules for the Firestore database.

## 🔥 Firebase Integration

The application is deeply integrated with Firebase for its backend services.

-   **Authentication**: Manages user sign-in and role-based access.
-   **Firestore**: Serves as the primary database for storing all application data, including clients, proposals, and user profiles. The data structure is defined in `docs/backend.json`.
-   **Cloud Storage**: Used to store user-uploaded files like profile pictures and payment proofs.
-   **Security Rules**: All access to Firestore and Storage is governed by the rules defined in `firestore.rules` and `storage.rules`, ensuring data security.

## 🤖 AI Features with Genkit

The generative AI capabilities of this application are powered by **Genkit**, a framework from Firebase for building production-ready AI applications.

-   **AI Flows**: The core logic for AI features is defined as "flows" located in `src/ai/flows/`.
    -   `generate-proposal-draft.ts`: Takes client needs and recommended plans to generate a complete, professional proposal draft.
    -   `generate-social-post.ts`: Creates a social media post, including both an image (using Imagen) and a relevant caption (using Gemini).
-   **Configuration**: The Genkit setup and model configuration can be found in `src/ai/genkit.ts`.

---

This README provides a high-level overview of the Smart Refill Sales Portal. For more specific details, please refer to the source code and comments within the respective files.
