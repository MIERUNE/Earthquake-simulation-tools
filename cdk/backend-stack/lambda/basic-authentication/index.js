function handler(event) {
  var request = event.request;
  var headers = request.headers;

  //         user:password
  // echo -n user:password | base64
  var authString = 'Basic ' + 'SET_BASE64_ENCODED_CREDENTIALS';

  if (typeof headers.authorization === 'undefined' || headers.authorization.value !== authString) {
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
      headers: { 'www-authenticate': { value: 'Basic' } }
    };
  }

  return request;
}
