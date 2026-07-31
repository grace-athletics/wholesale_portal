# Wholesale Cart Transform API

Express.js service that transforms Shopify carts to handle wholesale volume pricing and uplift quantity syncing.

## Features

- ✅ Syncs uplift product quantities to match parent product quantities
- ✅ Calculates volume pricing per recipe ID (not total cart quantity)
- ✅ Applies discount codes automatically for volume pricing
- ✅ Works with custom line item properties (_AssociationKey, _ParentKey)

## Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## Deployment to Railway

### 1. Push to GitHub

```bash
git add .
git commit -m "Add cart transform API"
git push origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Select the `cart-transform-api` directory as root
5. Set environment:
   - `PORT`: 3000
   - `NODE_ENV`: production
6. Click **Deploy**

Railway will give you a URL like: `https://wholesale-cart-transform-xxx.railway.app`

## Shopify Integration

### 3. Register Cart Transform in Shopify

1. Go to **Shopify Admin** → **Settings** → **Apps and integrations**
2. Click **Develop apps** → **Create an app**
3. Name it "Cart Transform"
4. Go to **Configuration** tab
5. Under **Admin API access scopes**, enable:
   - `write_orders`
   - `read_products`
6. Under **Webhooks**, go to **Cart Transform** section
7. Paste your Railway URL:
   ```
   https://wholesale-cart-transform-xxx.railway.app/cart/transform
   ```
8. Save and install app

### 4. Test

1. Add a glove + Japan Kip to your cart
2. Change qty from 1 to 5
3. Japan Kip should instantly sync to qty 5 (no delays!)
4. Price should drop by $20 per item if volume discount applies

## How It Works

```
User changes qty in cart
    ↓
Shopify calls your endpoint
    ↓
Server receives cart JSON
    ↓
Groups items by recipe ID
    ↓
Syncs uplift quantities
    ↓
Calculates volume pricing
    ↓
Returns modified cart
    ↓
Shopify updates display instantly
```

## Troubleshooting

**Check logs on Railway:**
1. Go to Railway project
2. Click **Logs** tab
3. Look for `[Cart Transform]` entries

**Test endpoint manually:**
```bash
curl -X POST http://localhost:3000/cart/transform \
  -H "Content-Type: application/json" \
  -d '{"cart": {"lines": []}}'
```

**Health check:**
```bash
curl http://localhost:3000/health
```
