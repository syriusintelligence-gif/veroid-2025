# Vero iD - Digital Content Verification Platform

Vero iD is a web application that provides a secure platform for verifying digital content signatures, effectively tackling the issues of deepfakes and misinformation.

## Features

- **User Authentication**: Secure registration and login with identity verification
- **Content Signing**: Digitally sign content with cryptographic signatures
- **Content Verification**: Verify the authenticity of signed content
- **Admin Dashboard**: Comprehensive management and analytics tools
- **QR Code Generation**: Generate QR codes for easy content verification

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Supabase (Required for Production)

The application uses Supabase for backend services. To set it up:

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Copy your project URL and anon key from the project settings
3. Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Run the SQL setup script in your Supabase SQL editor:
   - Use the file `src/lib/supabase-setup-fixed.sql` or
   - Use the manual script `EXECUTE-NO-SUPABASE.sql`

### 3. Development Mode (Without Supabase)

The application can run in development mode without Supabase configured. It will use local storage for data persistence. However, some features will be limited:

- No real-time synchronization
- Data stored only in browser
- No server-side authentication

To run in development mode:

```bash
pnpm run dev
```

### 4. Build for Production

```bash
pnpm run build
```

### 5. Preview Production Build

```bash
pnpm run preview
```

## Admin Account

To create an admin account:

1. Navigate to `/create-admin` in your browser
2. Click "Criar Conta Admin"
3. Use the credentials:
   - Email: `marcelo@vsparticipacoes.com`
   - Password: `Admin@123`

Or register normally at `/cadastro` using the email `marcelo@vsparticipacoes.com` - the system will automatically grant admin privileges.

## Project Structure

```
shadcn-ui/
├── src/
│   ├── components/      # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and configurations
│   │   ├── auth.ts     # Authentication logic
│   │   ├── supabase.ts # Supabase client configuration
│   │   └── crypto.ts   # Cryptographic functions
│   ├── pages/          # Application pages
│   └── styles/         # Global styles
├── public/             # Static assets
└── package.json        # Project dependencies
```

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn-ui
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Cryptography**: Web Crypto API
- **Charts**: Recharts
- **QR Codes**: qrcode.react
- **PDF Export**: jsPDF
- **Excel Export**: XLSX

## Troubleshooting

### Error: "Faltam as variáveis de ambiente do Supabase"

This error occurs when Supabase environment variables are not configured. To fix:

1. Create a `.env.local` file in the project root
2. Add your Supabase credentials (see Setup Instructions above)
3. Restart the development server

### Data Not Persisting

If data is not persisting between sessions:

1. Ensure Supabase is properly configured
2. Check that the database tables are created (run the SQL setup script)
3. Verify your Supabase project is active

## License

This project is proprietary software. All rights reserved.