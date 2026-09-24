%dw 2.0
output application/json
---
{
	timestamp: now() as String {format: "yyyy-MM-dd'T'HH:mm:ss'Z'"},
	statusCode: vars.httpStatus default 500,
	errorType: error.errorType.namespace ++ ":" ++ error.errorType.identifier,
	message: vars.errorMessage default error.description default "An error occurred while processing the request",
	details: vars.errorDetails default error.detailedDescription default "Internal server execution failure",
	path: attributes.requestPath default "/api/flights"
}
