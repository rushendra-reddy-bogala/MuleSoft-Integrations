%dw 2.0
output application/java
---
{
	flightId: vars.flightId default payload.flightId,
	airline: payload.airline,
	source: payload.source,
	destination: payload.destination,
	departureTime: payload.departureTime as LocalDateTime {format: "yyyy-MM-dd'T'HH:mm:ss"},
	arrivalTime: payload.arrivalTime as LocalDateTime {format: "yyyy-MM-dd'T'HH:mm:ss"},
	availableSeats: payload.availableSeats default 0,
	price: payload.price default 0.0,
	status: payload.status default "Scheduled"
}
