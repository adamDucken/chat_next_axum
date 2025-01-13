type ApiErrorResponse = {
  error: string;
}

interface ErrorMessage {
  title: string;
  description: string;
}

function isApiErrorResponse(error: any): error is ApiErrorResponse {
  return typeof error === 'object' && error !== null && 'error' in error;
}

export function getLoginErrorMessage(error: unknown): ErrorMessage {
  let title = 'Login Failed';
  let description = 'An unexpected error occurred. Please try again.';

  if (error instanceof Error) {
    try {
      const errorData = JSON.parse(error.message);

      switch (errorData.error) {
        case 'Wrong credentials':
          title = 'Invalid Credentials';
          description = 'The email or password you entered is incorrect. Please try again.';
          break;
        case 'Missing credentials':
          title = 'Missing Information';
          description = 'Please provide both email and password.';
          break;
        case 'Invalid token':
          title = 'Authentication Failed';
          description = 'There was a problem with your login. Please try again.';
          break;
        case 'Database error':
          title = 'Service Unavailable';
          description = 'We\'re experiencing technical difficulties. Please try again later.';
          break;
        default:
          description = errorData.error;
      }
    } catch {
      description = error.message;
    }
  }

  return { title, description };
}

export function getRegistrationErrorMessage(error: unknown): ErrorMessage {
  let title = 'Registration Failed';
  let description = 'An unexpected error occurred. Please try again.';

  if (error instanceof Error) {
    try {
      const errorData: ApiErrorResponse = JSON.parse(error.message);

      switch (errorData.error) {
        case 'User already exists':
          title = 'Account Exists';
          description = 'An account with this email already exists. Please try logging in instead.';
          break;
        case 'Missing credentials':
          title = 'Missing Information';
          description = 'Please fill in all required fields.';
          break;
        case 'Password processing error':
          title = 'Invalid Password';
          description = 'Please choose a different password that meets our requirements.';
          break;
        case 'Database error':
          title = 'Service Unavailable';
          description = 'We\'re experiencing technical difficulties. Please try again later.';
          break;
        default:
          description = errorData.error;
      }
    } catch {
      description = error.message;
    }
  }

  return { title, description };
}
