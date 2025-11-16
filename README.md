This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

Create a `.env.local` file populated with the following keys:

```
OPENAI_API_KEY=sk-...
ARKIV_PRIVATE_KEY=0x...
ARKIV_RPC_URL=https://mendoza.hoodi.arkiv.network/rpc
ARKIV_WS_URL=wss://mendoza.hoodi.arkiv.network/rpc/ws
```

- `OPENAI_API_KEY` powers the `/api/parse-payment` endpoint.
- `ARKIV_PRIVATE_KEY` should be a dedicated server wallet used to write to Arkiv; never share this key.
- `ARKIV_RPC_URL`/`ARKIV_WS_URL` can point to any Arkiv-compatible RPC (defaults fallback to Mendoza testnet if omitted).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
