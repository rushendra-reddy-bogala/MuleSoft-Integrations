%dw 2.0
output application/json
---
payload map (row, index) -> {
	flightId: row.flight_id default "",
	airline: row.airline default "",
	source: row.source default "",
	destination: row.destination default "",
	departureTime: (row.departure_time as String {format: "yyyy-MM-dd'T'HH:mm:ss"}) default "",
	arrivalTime: (row.arrival_time as String {format: "yyyy-MM-dd'T'HH:mm:ss"}) default "",
	availableSeats: row.available_seats default 0,
	price: row.price default 0.00,
	status: row.status default "Scheduled"
}
