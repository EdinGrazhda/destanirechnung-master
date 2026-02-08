# Security Configuration

This project uses environment variables to securely store sensitive information like database credentials and JWT secrets.

## Setup Instructions

### 1. Environment Files

Two environment files are included in this project:

- `.env.local` - Contains actual sensitive data (ignored by Git)
- `.env.example` - Template file showing required variables (committed to Git)

### 2. Required Environment Variables

The following environment variables must be set:

#### `MONGODB_URI`

Your MongoDB connection string. Format:

```
mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=yourapp
```

#### `JWT_SECRET_KEY`

A strong secret key for JWT token signing. Should be at least 256 characters long, random, and kept secret.

#### `NODE_ENV`

The application environment: `development`, `production`, or `test`

### 3. Initial Setup

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and replace placeholder values with your actual credentials

3. Never commit `.env.local` to version control (already in `.gitignore`)

### 4. Generating a New JWT Secret

If you need to generate a new JWT secret key, use a secure random string generator:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(128).toString('base64'))"
```

### 5. Security Best Practices

✅ **DO:**

- Keep `.env.local` in `.gitignore`
- Use different secrets for development and production
- Rotate secrets regularly
- Use strong, random values for JWT secrets
- Restrict database user permissions

❌ **DON'T:**

- Commit `.env.local` to Git
- Share secrets via email or chat
- Use weak or predictable secrets
- Reuse secrets across environments

## Files Updated for Security

The following files now use environment variables:

- `utils/dbConnect.js` - MongoDB connection
- `middleware.ts` - JWT verification
- `app/api/login/route.ts` - JWT signing

## Deployment

When deploying to production:

1. Set environment variables in your hosting platform (Vercel, Heroku, etc.)
2. Never expose `.env.local` in production builds
3. Use platform-specific secret management tools
4. Enable HTTPS for all connections

## Troubleshooting

If you get errors about missing environment variables:

1. Ensure `.env.local` exists in the project root
2. Check that all required variables are defined
3. Restart the development server after changing `.env.local`
4. Verify variable names match exactly (including case)
