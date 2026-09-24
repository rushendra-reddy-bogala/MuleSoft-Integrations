# Flight-Management-System

A production-ready **MuleSoft 4** RESTful Application that manages flight inventory with CRUD operations backed by a **MySQL 8** relational database and deployed to **Anypoint CloudHub 2.0**.

---

## Technical Architecture & Stack

- **Integration Framework**: MuleSoft Mule Runtime 4.4.0+ (Java 17 compatible)
- **API Specification**: RAML 1.0 with modular DataTypes & Examples
- **Router**: Mule APIKit Module 1.9.1
- **Database Engine**: MySQL 8.x with parameterized SQL queries
- **Data Transformation**: DataWeave 2.0 (`.dwl` externalized scripts)
- **Testing**: MUnit 2.3.13 with process mocks & assertions
- **CI/CD & DevOps**: GitHub Actions + `mule-maven-plugin` (CloudHub 2.0 deployment target)
- **Logging**: Structured JSON logging with correlation ID tracing

---

## Database Schema (`flights` table)

```sql
CREATE TABLE flights (
    flight_id VARCHAR(20) PRIMARY KEY,
    airline VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    available_seats INT NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

DB setup script and sample data are located at `src/main/resources/schema.sql`.

---

## API Catalog & Endpoint Matrix

| Method | Endpoint | Description | Sample Request Body / Parameter | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/flights` | Create a new flight | Flight JSON payload | `201 Created`, `400 Bad Request`, `409 Conflict`, `500` |
| `GET` | `/api/flights` | Retrieve all flights | N/A | `200 OK`, `500 Internal Error` |
| `GET` | `/api/flights/{flightId}` | Retrieve flight by ID | URI param: `flightId=AI101` | `200 OK`, `404 Not Found`, `500` |
| `PUT` | `/api/flights/{flightId}` | Update flight details | URI param: `flightId`, Flight JSON body | `200 OK`, `400 Bad Request`, `404 Not Found`, `500` |
| `DELETE` | `/api/flights/{flightId}` | Delete flight record | URI param: `flightId=AI101` | `200 OK`, `404 Not Found`, `500` |
| `GET` | `/api/flights/source/{city}` | Search flights by source city | URI param: `city=Hyderabad` | `200 OK`, `500 Internal Error` |
| `GET` | `/api/flights/destination/{city}` | Search flights by destination city | URI param: `city=Delhi` | `200 OK`, `500 Internal Error` |
| `GET` | `/health` | Health Check (ping DB) | N/A | `200 UP`, `503 DOWN` |

---

## Mandatory Input Validation Rules

The application uses the Mule Validation Module to validate every incoming request:
- `flightId`: Mandatory string (non-blank, max 20 characters).
- `airline`: Mandatory string (non-blank).
- `source`: Mandatory string (non-blank).
- `destination`: Mandatory string (non-blank).

If validation fails, a `400 Bad Request` JSON error response is generated automatically.

---

## Centralized Error Response Format

All error responses adhere to a consistent JSON structure:

```json
{
  "timestamp": "2026-09-24T08:32:15Z",
  "statusCode": 404,
  "errorType": "FLIGHT:NOT_FOUND",
  "message": "Flight with ID AI101 not found",
  "details": "Requested flight record does not exist in database.",
  "path": "/api/flights/AI101"
}
```

---

## Local Execution & Testing

### 1. Prerequisites
- Java 17 JDK
- Apache Maven 3.8+
- MySQL 8.0 running locally

### 2. Run Database Setup
Execute `src/main/resources/schema.sql` on your local MySQL instance.

### 3. Build & Run Application
```bash
# Clean and compile
mvn clean compile

# Run MUnit tests
mvn clean test -Denv=test

# Run application locally
mvn mule:run -Denv=dev
```

---

## CI/CD Pipeline (GitHub Actions)

The workflow `.github/workflows/deploy.yml` triggers automatically on pushes to `main`:
1. Checkout source code & setup JDK 17.
2. Run MUnit test suite & verify coverage.
3. Deploy Mule application artifact to CloudHub 2.0 using `mule-maven-plugin`.

### Required GitHub Repository Secrets:
- `ANYPOINT_USERNAME`: MuleSoft Anypoint platform username.
- `ANYPOINT_PASSWORD`: MuleSoft Anypoint platform password.
- `ENCRYPTION_KEY`: Property encryption key for secure properties.
