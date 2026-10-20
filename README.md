# Digital Banking API

This project includes a browser-based banking interface served by the Express
API. It uses the existing customer, account, transfer, and transaction
endpoints, and is available at `/app/` when the server is running.

## Run locally

1. Set the following environment variables in `.env`:

   ```text
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_long_random_secret
   NIBSS_BASE_URL=your_nibss_api_url
   NIBSS_API_KEY=your_nibss_api_key
   NIBSS_API_SECRET=your_nibss_api_secret
   ```

2. Install dependencies and start the API:

   ```sh
   npm install
   npm start
   ```

3. Open `http://localhost:5000/app/`. The API health check remains at
   `http://localhost:5000/`.

The frontend is served by the same Express app as the API, so browser API
requests use the same origin. Deploy the API and `public/` directory together;
keep the NIBSS credentials and JWT secret in the host's private environment
configuration, not in frontend files.

## Frontend features

- Customer registration with BVN/NIN identity verification and sign-in.
- Authenticated account creation and account details.
- Balance synchronization with NIBSS.
- Recipient name enquiry, transfers, transaction history, and pending-status
  checks.

The backend requires a customer to create an account before transfers and
transaction history are available. Account creation asks for identity details
again because the API does not store the identity number or date of birth from
registration.
