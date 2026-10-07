// Runs before each test file. Never point tests at a real database or email provider.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
delete process.env.MONGO_URI;

// sendEmail() throws if these are missing; the HTTP call itself is mocked in the auth tests
process.env.EMAILJS_SERVICE_ID = 'svc_test';
process.env.EMAILJS_TEMPLATE_ID = 'tpl_test';
process.env.EMAILJS_FORGOT_TEMPLATE_ID = 'tpl_forgot_test';
process.env.EMAILJS_PUBLIC_KEY = 'pub_test';
