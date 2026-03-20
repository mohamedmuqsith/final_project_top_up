# 🚀 Final Project - Full-Stack Top-Up System

A premium, full-stack top-up and ecommerce platform built with modern technologies, featuring an **Admin Dashboard**, **User Mobile App**, and a robust **Node.js Backend**.

---

## 🏗️ Project Architecture

The project follows a monorepo-style structure for seamless development and deployment.

-   **`backend/`**: Express.js server with MongoDB, integrated with Clerk, Stripe, Cloudinary, and AI services.
-   **`admin/`**: React + Vite dashboard for administrators to manage products, orders, and users.
-   **`mobile/`**: Expo-powered React Native application for end-users to browse products and place orders.

---

## ✨ Key Features

### 🛠️ Backend (Express & MongoDB)
-   **🔐 Authentication**: Secure user and admin authentication via Clerk.
-   **💰 Payments**: Seamless Stripe integration for online transactions.
-   **🖼️ Media Management**: Cloudinary integration for optimized image storage.
-   **🤖 AI-Powered**: Leverages Google Gemini AI for smart product recommendations and content generation.
-   **⚡ Background Jobs**: Reliable background task processing using Inngest.
-   **📄 Document Generation**: Automated invoice and packing slip generation.

### 📊 Admin Dashboard (React & Vite)
-   **📈 Analytics**: Real-time sales and order tracking with Recharts.
-   **📦 Product Management**: Full CRUD operations for product inventory.
-   **📑 Order Control**: Comprehensive order status tracking and management.
-   **🔧 System Configuration**: Manage offers, notifications, and user accounts.
-   **🎨 Premium UI**: Beautifully crafted with Tailwind CSS and DaisyUI.

### 📱 User Mobile App (Expo & React Native)
-   **🛒 Shopping Experience**: Fast and intuitive product browsing and checkout.
-   **🔔 Push Notifications**: Real-time updates on order status.
-   **💳 Secure Checkout**: Native Stripe payment sheet integration.
-   **🔄 Cross-Platform**: Optimized for both iOS and Android.

---

## 🛠️ Tech Stack

### Frontend & Mobile
| Tech | Description |
| :--- | :--- |
| **React** | Core library for Admin and Mobile (Web) |
| **Expo** | React Native framework for the Mobile App |
| **Vite** | Lightning-fast build tool for the Admin Panel |
| **Tailwind CSS** | Styling framework for responsive design |
| **TanStack Query** | Efficient server state management |

### Backend & Infrastructure
| Tech | Description |
| :--- | :--- |
| **Node.js** | JavaScript runtime environment |
| **Express.js** | Web application framework |
| **MongoDB** | NoSQL database with Mongoose ODM |
| **Clerk** | Modern authentication and user management |
| **Stripe** | Payment infrastructure for the internet |
| **Inngest** | Background functions and workflows |

---

## 🚀 Getting Started

### Prerequisites
-   Node.js (>=20.0.0)
-   NPM or Yarn
-   MongoDB Instance
-   Clerk API Keys
-   Stripe API Keys
-   Cloudinary Credentials

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/mohamedmuqsith/final_project_top_up.git
    cd final_project_top_up
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or install manually in each directory
    cd backend && npm install
    cd ../admin && npm install
    cd ../mobile && npm install
    ```

3.  **Environment Setup**:
    Create `.env` files in `backend/`, `admin/`, and `mobile/` based on their respective configurations.

4.  **Run the project**:
    -   **Backend**: `cd backend && npm run dev`
    -   **Admin**: `cd admin && npm run dev`
    -   **Mobile**: `cd mobile && npm run start`

---

## 🤝 Contributing

1.  Fork the repo
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

<p align="center">Made with ❤️ by Muqsith</p>
