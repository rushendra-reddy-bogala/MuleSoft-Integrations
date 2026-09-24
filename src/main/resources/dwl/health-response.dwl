%dw 2.0
output application/json
---
{
	status: if (vars.dbConnected default false) "UP" else "DOWN",
	applicationName: p('app.name') default "Flight-Management-System",
	environment: p('app.env') default "dev",
	timestamp: now() as String {format: "yyyy-MM-dd'T'HH:mm:ss'Z'"},
	databaseStatus: if (vars.dbConnected default false) "CONNECTED" else "DISCONNECTED"
}
