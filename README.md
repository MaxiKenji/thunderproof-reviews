# ⚡ Thunderproof - Nostr Review System

A decentralized review system built on the Nostr protocol for authentic, verifiable reviews in the Bitcoin ecosystem.

## 🚀 Quick Deploy to GitHub Pages + Vercel

### Step 1: Create GitHub Repository

1. **Create new repository on GitHub:**
   - Go to https://github.com/new
   - Name: `thunderproof-reviews` (or your preferred name)
   - Set to Public
   - Initialize with README: ✅
   - Click "Create repository"

2. **Clone to your computer:**
   ```bash
   git clone https://github.com/yourusername/thunderproof-reviews.git
   cd thunderproof-reviews
   ```

### Step 2: Add Project Files

Create this exact folder structure in your repository:

```
thunderproof-reviews/
├── index.html              # Main application
├── embed.html             # Embed widget page  
├── css/
│   └── styles.css         # Complete styling
├── js/
│   ├── app.js            # Main application logic
│   ├── nostr-auth.js     # Authentication
│   └── search.js         # Search & Reviews (combined)
├── assets/               # Your SVG star assets
│   ├── 0.svg            # 0% rating (from 0.jpg)
│   ├── 10.svg           # 10% rating (from 10.jpg)
│   ├── 20.svg           # 20% rating (from 20.jpg)
│   ├── 30.svg           # 30% rating (from 30%.jpg)
│   ├── 40.svg           # 40% rating (from 40.jpg)
│   ├── 50.svg           # 50% rating (from 50.jpg)
│   ├── 60.svg           # 60% rating (from 60.jpg)
│   ├── 70.svg           # 70% rating (from 70%.jpg)
│   ├── 80.svg           # 80% rating (from 80%.jpg)
│   ├── 90.svg           # 90% rating (from 90.jpg)
│   ├── 100.svg          # 100% rating (from 100.jpg)
│   └── logo.svg         # Thunderproof logo (from Logo.jpg)
├── package.json          # Dependencies
├── vercel.json          # Vercel config
└── README.md            # This file
```

### Step 3: Convert Your Assets

**IMPORTANT:** You need to convert your JPG files to SVG format:

- `0%.jpg` → `assets/0.svg`
- `10.jpg` → `assets/10.svg`  
- `20.jpg` → `assets/20.svg`
- `30%.jpg` → `assets/30.svg`
- `40.jpg` → `assets/40.svg`
- `50.jpg` → `assets/50.svg`
- `60.jpg` → `assets/60.svg`
- `70%.jpg` → `assets/70.svg`
- `80%.jpg` → `assets/80.svg`
- `90.jpg` → `assets/90.svg`
- `100.jpg` → `assets/100.svg`
- `Logo.jpg` → `assets/logo.svg`

**How to convert:**
1. Use online tools like CloudConvert or Vector Magic
2. Or use design software like Figma, Illustrator, or Inkscape
3. Or use command line: `convert image.jpg image.svg` (requires ImageMagick)

### Step 4: Deploy Frontend (GitHub Pages)

1. **Add all files and commit:**
   ```bash
   git add .
   git commit -m "Add Thunderproof website"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click "Settings" tab
   - Click "Pages" in left sidebar
   - Source: "Deploy from a branch"
   - Branch: `main` / `(root)`
   - Click "Save"

3. **Your site will be live at:**
   ```
   https://yourusername.github.io/thunderproof-reviews/
   ```

### Step 5: Deploy Backend (Vercel)

1. **Sign up for Vercel:**
   - Go to https://vercel.com
   - Sign up with GitHub account

2. **Import your repository:**
   - Click "New Project"
   - Import your `thunderproof-reviews` repository
   - Keep all default settings
   - Click "Deploy"

3. **Your backend will be at:**
   ```
   https://your-project.vercel.app/
   ```

### Step 6: Test Everything

1. Visit your GitHub Pages URL
2. Test search with example npub keys
3. Try logging in with Nostr extension (install Alby if needed)
4. Add a test review
5. Generate embed widget code
6. Test responsive design on mobile

## 🎯 Features

- **Hero Section**: Search bar for Nostr public keys (npub)
- **Profile Display**: Shows user info and review statistics  
- **Nostr Login**: Stacker News style with extensions, nsec, or key generation
- **Review System**: 5-star ratings using your custom SVG assets
- **Share/Embed**: Generate iframe widgets for websites (FREE)
- **Responsive**: Works on desktop and mobile
- **Free Hosting**: GitHub Pages + Vercel free tiers

## 🔧 Configuration

### Update Example Keys

In `index.html`, update the example keys:

```html
<button class="example-key" data-key="npub1your-real-example1">Your Name 1</button>
<button class="example-key" data-key="npub1your-real-example2">Your Name 2</button>
<button class="example-key" data-key="npub1your-real-example3">Your Name 3</button>
```

### Custom Relays

Edit relay lists in `js/nostr-auth.js` and `js/search.js`:

```javascript
this.relays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social',
    'wss://your-custom-relay.com'
];
```

### Branding

1. Replace logo in `assets/logo.svg`
2. Update colors in `css/styles.css` `:root` section
3. Change site title in `index.html`
4. Update footer links and social media

## 🧪 Testing Checklist

- [ ] Site loads on GitHub Pages
- [ ] Search works with valid npub keys
- [ ] Login modal appears when clicking "Connect Nostr"
- [ ] Can login with Nostr extension (Alby, nos2x)
- [ ] Can login with manual nsec
- [ ] Can generate new keys
- [ ] Add review modal opens when logged in
- [ ] Star rating selection works
- [ ] Review form validation works
- [ ] Share modal generates correct URLs
- [ ] Embed code is properly formatted
- [ ] Copy buttons work
- [ ] Responsive design on mobile
- [ ] All your SVG assets load correctly

## 🔒 Privacy & Security

- **No server-side storage**: Private keys stored locally only
- **Decentralized data**: All reviews on Nostr relays
- **Open source**: Fully auditable code
- **NIP-07 compatible**: Works with all major Nostr extensions

## 🐛 Common Issues

**Site not loading?**
- Check GitHub Pages is enabled in Settings
- Ensure all files are committed and pushed
- Check browser console for errors

**Login not working?**  
- Install Alby or nos2x browser extension
- Check extension permissions
- Try manual nsec input or generate new keys

**Assets not showing?**
- Convert all JPG files to SVG format
- Place in correct `assets/` folder
- Check file naming matches exactly

**Reviews not loading?**
- Check Nostr relay connections in browser console
- Verify npub format is correct
- Sample reviews will show for demo

## 🚀 Going Live

1. **Test thoroughly** with the checklist above
2. **Update branding** (logo, colors, example keys)
3. **Add your domain** (optional - GitHub Pages supports custom domains)
4. **Share on social media** and Nostr
5. **Monitor for issues** and user feedback

## 📞 Support

- **GitHub Issues**: Report bugs in your repository
- **Nostr**: Find the community on Nostr relays
- **Documentation**: This README has all the details

## 🎉 You're Done!

Your Thunderproof site will be running at:
- **Frontend**: `https://yourusername.github.io/thunderproof-reviews/`
- **Embed**: `https://yourusername.github.io/thunderproof-reviews/embed.html`

**Next steps:**
1. Share your site URL
2. Encourage users to leave reviews
3. Embed review widgets on other websites
4. Build the Bitcoin review ecosystem!

---

Built with ❤️ for the Bitcoin and Nostr communities.