# User Auth & RBAC Backend (Node.js / Express)


This single-file project layout (split into files below) implements:
- Email/password registration with validation
- Secure password hashing (bcrypt)
- Login endpoint returning JWT access & refresh tokens
- Role-based middleware (admin / user)
- Token expiration and refresh mechanism (refresh-token rotation + revocation)
- Unit tests (Jest) covering major flows and edge cases

---

# System requirement
- node v24.3.0

create a .env file in root level and copy values from env.example