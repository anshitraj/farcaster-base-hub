# 🔐 How to Generate JWT Secret

## Quick Generate (Node.js - Works on Windows)

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Example output:**
```
bBbIAJ6vGPFAuuelJsXkXjdvLtZPq71dnXNJojyF9UU=
```

## Other Methods

### Method 1: PowerShell (Windows)
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Method 2: Online Generator
- Visit: https://generate-secret.vercel.app/64
- Or: https://www.random.org/strings/
- Set length to 64 characters
- Copy the result

### Method 3: Python (if installed)
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Method 4: Manual
Create a random string of at least 32 characters:
- Use uppercase, lowercase, numbers, and special characters
- Example: `MySuperSecretJWTKey2024!@#$%^&*()_+-=`

## ✅ Ready-to-Use JWT Secret

Here's a pre-generated secure JWT secret you can use:

```
bBbIAJ6vGPFAuuelJsXkXjdvLtZPq71dnXNJojyF9UU=
```

Just copy this into your Vercel environment variables!

## 📝 For Vercel

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Add new variable:
   - **Key**: `JWT_SECRET`
   - **Value**: `bBbIAJ6vGPFAuuelJsXkXjdvLtZPq71dnXNJojyF9UU=` (or generate your own)
   - **Environment**: Select **Production**, **Preview**, and **Development**
3. Click **Save**

## 🔒 Security Notes

- ✅ Use a **different** JWT_SECRET for production vs development
- ✅ Keep it secret - don't commit to git
- ✅ At least 32 characters long
- ✅ Use random, unpredictable strings

