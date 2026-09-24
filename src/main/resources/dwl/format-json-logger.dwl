%dw 2.0
output application/json
---
{
	timestamp: now() as String {format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"},
	application: "Flight-Management-System",
	environment: p('app.env') default "dev",
	correlationId: correlationId default "",
	flowName: vars.currentFlowName default "unknown-flow",
	logLevel: vars.logLevel default "INFO",
	message: vars.logMessage default "",
	path: attributes.requestPath default "",
	method: attributes.method default ""
}
