# 🐝 BeeTrack – Apiary Management System

BeeTrack is a full-featured backend system for managing an apiary business: hives, inspections, product inventory, orders, user roles, and automated background tasks.

Built for real-world use with FastAPI, PostgreSQL, Docker, cron jobs, Alembic, and JWT-based authentication.

---

## ✨ Features

- 🔐 **User roles** – admin & worker access control
- 🐝 **Hive management** – location, status, inspections
- 🧪 **Inspections** – temperature, disease, notes
- 📦 **Products & orders** – M:N order-product relation
- 📊 **Stats & reports** – monthly sales, top products
- 🗓️ **Scheduler** – cron-based log archival every 7 days
- 📁 **Export** – CSV and PDF (orders, inspections)
- 🔄 **Seed data** – admin, users, hives, products
- ☁️ **Dockerized** – production-ready deployment
- 🧬 **Alembic** – schema versioning via migrations

---

## 🧰 Tech Stack

| Layer          | Tools                       |
|----------------|-----------------------------|
| Language       | Python 3.11                 |
| Framework      | FastAPI                     |
| ORM            | SQLAlchemy                  |
| Auth           | JWT (OAuth2) + bcrypt       |
| DB             | PostgreSQL                  |
| Cron           | APScheduler                 |
| Exports        | pandas, reportlab           |
| Migrations     | Alembic                     |
| Container      | Docker, docker-compose      |

---

## 🚀 Getting Started (Development)

### 1. Clone repo and enter project:

```bash
git clone https://github.com/yourname/beetrack.git
cd beetrack
```

### 2. Environment files

Create two `.env` files:

#### `.env`

```env
DATABASE_URL=postgresql+psycopg2://beetadmin:securepassword123@db:5432/beetrack
SECRET_KEY=changeme
```

#### `.env.db`

```env
POSTGRES_DB=beetrack
POSTGRES_USER=beetadmin
POSTGRES_PASSWORD=securepassword123
```

### 3. Build and run containers

```bash
docker-compose up --build
```

### 4. Access the API:

Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Test Users

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Admin    | admin@beetrack.local   | admin123   |
| Worker   | worker@beetrack.local  | worker123  |

---

## 📊 Stats & Reports

| Endpoint | Description |
|----------|-------------|
| `/stats/monthly-sales?year=2025&month=7` | Sales summary |
| `/export/orders/csv` | Download orders |
| `/export/inspections/pdf` | Inspection report |

---

## 📁 Seeded Data

- Users: admin & worker
- Products: Lipowy, Gryczany
- Hives: UL-001, UL-002
- Inspections: initial record for UL-001

---

## 🐳 Docker Notes

- `entrypoint.sh` runs:
  1. Alembic migrations
  2. Seed if DB is empty
  3. Uvicorn server
- Logs and exports go to `/logs` and `/exports` (excluded via `.dockerignore`)

---

## 📌 Roadmap

- [x] REST API with role-based access
- [x] Order-inspection-product relations
- [x] Cron + background tasks
- [x] Export PDF & CSV
- [ ] Admin CLI or frontend panel
- [ ] Unit tests with pytest
- [ ] Render.com deploy-ready

---

## 📄 License

MIT – use freely for learning, commercial, or non-commercial projects.

---

**Made with ❤️ and Python**
