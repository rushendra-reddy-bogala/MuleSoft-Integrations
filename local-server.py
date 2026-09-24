#!/usr/bin/env python3
"""
Local Standalone Server for Flight-Management-System
Serves the Web Experience Portal UI and Mule 4 System API (REST/JSON) on http://localhost:8081/
"""

import json
import os
import re
import sqlite3
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

# Initialize In-Memory Database
def init_db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE flights (
            flight_id TEXT PRIMARY KEY,
            airline TEXT NOT NULL,
            source TEXT NOT NULL,
            destination TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            arrival_time TEXT NOT NULL,
            available_seats INTEGER NOT NULL,
            price REAL NOT NULL,
            status TEXT NOT NULL
        )
    """)
    # Seed Sample Data
    cursor.executemany("""
        INSERT INTO flights VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, [
        ("AI101", "Air India", "Hyderabad", "Delhi", "2026-10-01T10:00:00", "2026-10-01T12:30:00", 150, 5500.0, "Scheduled"),
        ("6E202", "IndiGo", "Bangalore", "Mumbai", "2026-10-01T14:00:00", "2026-10-01T15:45:00", 180, 4200.0, "Boarding"),
        ("UK303", "Vistara", "Delhi", "Hyderabad", "2026-10-02T08:30:00", "2026-10-02T11:00:00", 120, 6800.0, "Scheduled"),
        ("QP404", "Akasa Air", "Goa", "Mumbai", "2026-10-05T18:00:00", "2026-10-05T19:15:00", 160, 3800.0, "Scheduled")
    ])
    conn.commit()
    return conn

db_conn = init_db()

class FlightAPIHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _serve_static(self, file_path, content_type):
        if os.path.exists(file_path):
            self._set_headers(200, content_type)
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self._set_headers(404, "text/plain")
            self.wfile.write(b"File Not Found")

    def do_OPTIONS(self):
        self._set_headers(200)

    def _read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode('utf-8'))

    def do_GET(self):
        path = self.path.split('?')[0]
        cursor = db_conn.cursor()

        # Static Web Application Experience UI Routes
        if path == "/" or path == "/index.html":
            self._serve_static(os.path.join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8")
            return
        elif path == "/styles.css":
            self._serve_static(os.path.join(PUBLIC_DIR, "styles.css"), "text/css; charset=utf-8")
            return
        elif path == "/app.js":
            self._serve_static(os.path.join(PUBLIC_DIR, "app.js"), "application/javascript; charset=utf-8")
            return

        # GET /health
        if path == "/health":
            self._set_headers(200)
            response = {
                "status": "UP",
                "applicationName": "Flight-Management-System",
                "environment": "dev",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "databaseStatus": "CONNECTED"
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        # GET /api/flights
        if path == "/api/flights" or path == "/api/flights/":
            cursor.execute("SELECT flight_id, airline, source, destination, departure_time, arrival_time, available_seats, price, status FROM flights ORDER BY departure_time ASC")
            rows = cursor.fetchall()
            flights = []
            for row in rows:
                flights.append({
                    "flightId": row[0],
                    "airline": row[1],
                    "source": row[2],
                    "destination": row[3],
                    "departureTime": row[4],
                    "arrivalTime": row[5],
                    "availableSeats": row[6],
                    "price": row[7],
                    "status": row[8]
                })
            self._set_headers(200)
            self.wfile.write(json.dumps(flights, indent=2).encode('utf-8'))
            return

        # GET /api/flights/source/{city}
        m_source = re.match(r"^/api/flights/source/([^/]+)$", path)
        if m_source:
            city = m_source.group(1)
            cursor.execute("SELECT flight_id, airline, source, destination, departure_time, arrival_time, available_seats, price, status FROM flights WHERE LOWER(source) = LOWER(?)", (city,))
            rows = cursor.fetchall()
            flights = [{
                "flightId": r[0], "airline": r[1], "source": r[2], "destination": r[3],
                "departureTime": r[4], "arrivalTime": r[5], "availableSeats": r[6],
                "price": r[7], "status": r[8]
            } for r in rows]
            self._set_headers(200)
            self.wfile.write(json.dumps(flights, indent=2).encode('utf-8'))
            return

        # GET /api/flights/destination/{city}
        m_dest = re.match(r"^/api/flights/destination/([^/]+)$", path)
        if m_dest:
            city = m_dest.group(1)
            cursor.execute("SELECT flight_id, airline, source, destination, departure_time, arrival_time, available_seats, price, status FROM flights WHERE LOWER(destination) = LOWER(?)", (city,))
            rows = cursor.fetchall()
            flights = [{
                "flightId": r[0], "airline": r[1], "source": r[2], "destination": r[3],
                "departureTime": r[4], "arrivalTime": r[5], "availableSeats": r[6],
                "price": r[7], "status": r[8]
            } for r in rows]
            self._set_headers(200)
            self.wfile.write(json.dumps(flights, indent=2).encode('utf-8'))
            return

        # GET /api/flights/{flightId}
        m_id = re.match(r"^/api/flights/([^/]+)$", path)
        if m_id:
            flight_id = m_id.group(1)
            cursor.execute("SELECT flight_id, airline, source, destination, departure_time, arrival_time, available_seats, price, status FROM flights WHERE flight_id = ?", (flight_id,))
            row = cursor.fetchone()
            if not row:
                self._set_headers(404)
                err = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "statusCode": 404,
                    "errorType": "FLIGHT:NOT_FOUND",
                    "message": f"Flight with ID {flight_id} not found",
                    "details": "Requested flight record does not exist in database.",
                    "path": path
                }
                self.wfile.write(json.dumps(err).encode('utf-8'))
                return

            flight = {
                "flightId": row[0], "airline": row[1], "source": row[2], "destination": row[3],
                "departureTime": row[4], "arrivalTime": row[5], "availableSeats": row[6],
                "price": row[7], "status": row[8]
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(flight, indent=2).encode('utf-8'))
            return

        # 404 Not Found
        self._set_headers(404)
        self.wfile.write(json.dumps({"statusCode": 404, "errorType": "APIKIT:NOT_FOUND", "message": "Resource not found"}).encode('utf-8'))

    def do_POST(self):
        path = self.path.split('?')[0]
        if path == "/api/flights" or path == "/api/flights/":
            try:
                data = self._read_json_body()
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"statusCode": 400, "errorType": "APIKIT:BAD_REQUEST", "message": "Invalid JSON body"}).encode('utf-8'))
                return

            required = ["flightId", "airline", "source", "destination"]
            missing = [f for f in required if not data.get(f)]
            if missing:
                self._set_headers(400)
                err = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "statusCode": 400,
                    "errorType": "VALIDATION:BLANK_STRING",
                    "message": f"Mandatory fields missing: {', '.join(missing)}",
                    "details": "Mandatory validation failed for request payload.",
                    "path": path
                }
                self.wfile.write(json.dumps(err).encode('utf-8'))
                return

            cursor = db_conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO flights VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    data["flightId"],
                    data["airline"],
                    data["source"],
                    data["destination"],
                    data.get("departureTime", datetime.utcnow().isoformat()),
                    data.get("arrivalTime", datetime.utcnow().isoformat()),
                    data.get("availableSeats", 0),
                    data.get("price", 0.0),
                    data.get("status", "Scheduled")
                ))
                db_conn.commit()
            except sqlite3.IntegrityError:
                self._set_headers(409)
                err = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "statusCode": 409,
                    "errorType": "FLIGHT:DUPLICATE_ID",
                    "message": f"Flight ID {data['flightId']} already exists.",
                    "details": "Duplicate primary key.",
                    "path": path
                }
                self.wfile.write(json.dumps(err).encode('utf-8'))
                return

            self._set_headers(201)
            res = {
                "message": f"Flight {data['flightId']} created successfully.",
                "flightId": data["flightId"]
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return

    def do_PUT(self):
        path = self.path.split('?')[0]
        m_id = re.match(r"^/api/flights/([^/]+)$", path)
        if m_id:
            flight_id = m_id.group(1)
            data = self._read_json_body()

            cursor = db_conn.cursor()
            cursor.execute("SELECT flight_id FROM flights WHERE flight_id = ?", (flight_id,))
            if not cursor.fetchone():
                self._set_headers(404)
                err = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "statusCode": 404,
                    "errorType": "FLIGHT:NOT_FOUND",
                    "message": f"Flight with ID {flight_id} not found",
                    "details": "Cannot update flight because it does not exist.",
                    "path": path
                }
                self.wfile.write(json.dumps(err).encode('utf-8'))
                return

            cursor.execute("""
                UPDATE flights
                SET airline = ?, source = ?, destination = ?, departure_time = ?, arrival_time = ?, available_seats = ?, price = ?, status = ?
                WHERE flight_id = ?
            """, (
                data.get("airline", ""),
                data.get("source", ""),
                data.get("destination", ""),
                data.get("departureTime", ""),
                data.get("arrivalTime", ""),
                data.get("availableSeats", 0),
                data.get("price", 0.0),
                data.get("status", "Scheduled"),
                flight_id
            ))
            db_conn.commit()

            self._set_headers(200)
            res = {
                "message": f"Flight {flight_id} updated successfully.",
                "flightId": flight_id
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return

    def do_DELETE(self):
        path = self.path.split('?')[0]
        m_id = re.match(r"^/api/flights/([^/]+)$", path)
        if m_id:
            flight_id = m_id.group(1)
            cursor = db_conn.cursor()
            cursor.execute("DELETE FROM flights WHERE flight_id = ?", (flight_id,))
            db_conn.commit()

            if cursor.rowcount == 0:
                self._set_headers(404)
                err = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "statusCode": 404,
                    "errorType": "FLIGHT:NOT_FOUND",
                    "message": f"Flight with ID {flight_id} not found",
                    "details": "Cannot delete flight because it does not exist.",
                    "path": path
                }
                self.wfile.write(json.dumps(err).encode('utf-8'))
                return

            self._set_headers(200)
            res = {
                "message": f"Flight {flight_id} deleted successfully.",
                "flightId": flight_id
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return

def run_server(port=8081):
    server_address = ('', port)
    httpd = HTTPServer(server_address, FlightAPIHandler)
    print(f"==================================================")
    print(f"SkyPulse Flight Experience Portal & System API")
    print(f"Running on http://localhost:{port}")
    print(f"Web UI:        http://localhost:{port}/")
    print(f"System API:    http://localhost:{port}/api/flights")
    print(f"Health Check:  http://localhost:{port}/health")
    print(f"==================================================")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server(8081)
