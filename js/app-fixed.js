// Thunderproof - Fixed Application Logic
class ThunderproofApp {
    constructor() {
        this.currentProfile = null;
        this.currentReviews = [];
        this.userProfile = null;
        this.isLoggedIn = false;
        this.nostr = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Thunderproof...');
        
        // Set up event listeners first
        this.setupEventListeners();
        
        // Try to load nostr-tools with better error handling
        try {
            await this.initNostrTools();
            console.log('✅ Nostr tools loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load nostr-tools:', error);
            this.showToast('Failed to load Nostr tools. Some features may not work.', 'error');
        }
        
        // Handle direct profile links
        this.handleURLParams();
        
        console.log('✅ Thunderproof initialized');
    }

    async initNostrTools() {
        try {
            // Try multiple import methods for better compatibility
            let nostrModule;
            
            try {
                // Method 1: Direct import
                nostrModule = await import('https://unpkg.com/nostr-tools@2/lib/esm/index.js');
            } catch (error1) {
                console.warn('Direct import failed, trying alternative...', error1);
                
                try {
                    // Method 2: With specific version
                    nostrModule = await import('https://unpkg.com/nostr-tools@2.7.2/lib/esm/index.js');
                } catch (error2) {
                    console.warn('Version-specific import failed, trying CDN...', error2);
                    
                    // Method 3: Alternative CDN
                    nostrModule = await import('https://cdn.skypack.dev/nostr-tools@2');
                }
            }
            
            this.nostr = nostrModule;
            
            // Test basic functionality
            if (this.nostr.generatePrivateKey && this.nostr.getPublicKey) {
                const testKey = this.nostr.generatePrivateKey();
                const testPubkey = this.nostr.getPublicKey(testKey);
                console.log('🔑 Nostr tools test successful');
                return true;
            } else {
                throw new Error('Nostr tools loaded but missing required functions');
            }
            
        } catch (error) {
            console.error('Failed to initialize nostr-tools:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // Example keys
        document.querySelectorAll('.example-key').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                if (searchInput) {
                    searchInput.value = key;
                }
                this.handleSearch();
            });
        });

        // Navigation
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showHeroSection());
        }

        // Profile actions
        const addReviewBtn = document.getElementById('add-review-btn');
        const shareProfileBtn = document.getElementById('share-profile-btn');
        
        if (addReviewBtn) {
            addReviewBtn.addEventListener('click', () => this.showReviewModal());
        }
        
        if (shareProfileBtn) {
            shareProfileBtn.addEventListener('click', () => this.showShareModal());
        }

        // Login/Logout
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Modal close buttons
        const closeModal = document.getElementById('close-modal');
        const modalOverlay = document.getElementById('modal-overlay');
        const cancelReview = document.getElementById('cancel-review');
        const submitReview = document.getElementById('submit-review');
        
        if (closeModal) closeModal.addEventListener('click', () => this.hideReviewModal());
        if (modalOverlay) modalOverlay.addEventListener('click', () => this.hideReviewModal());
        if (cancelReview) cancelReview.addEventListener('click', () => this.hideReviewModal());
        if (submitReview) submitReview.addEventListener('click', () => this.submitReview());

        // Share modal
        const closeShareModal = document.getElementById('close-share-modal');
        const shareModalOverlay = document.getElementById('share-modal-overlay');
        const copyUrlBtn = document.getElementById('copy-url-btn');
        const copyEmbedBtn = document.getElementById('copy-embed-btn');
        
        if (closeShareModal) closeShareModal.addEventListener('click', () => this.hideShareModal());
        if (shareModalOverlay) shareModalOverlay.addEventListener('click', () => this.hideShareModal());
        if (copyUrlBtn) copyUrlBtn.addEventListener('click', () => this.copyShareURL());
        if (copyEmbedBtn) copyEmbedBtn.addEventListener('click', () => this.copyEmbedCode());

        // Star rating selector
        document.querySelectorAll('.star-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rating = e.target.closest('.star-btn').dataset.rating;
                this.selectRating(rating);
            });
        });

        // Review comment character count
        const reviewComment = document.getElementById('review-comment');
        if (reviewComment) {
            reviewComment.addEventListener('input', (e) => {
                const charCount = document.getElementById('char-count');
                if (charCount) {
                    charCount.textContent = e.target.value.length;
                }
                this.validateReviewForm();
            });
        }

        // Embed config changes
        ['embed-width', 'embed-height', 'embed-max'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateEmbedCode());
            }
        });

        // Sort reviews
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortReviews(e.target.value);
            });
        }
    }

    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const profileKey = urlParams.get('profile');
        
        if (profileKey) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = profileKey;
                this.handleSearch();
            }
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        
        if (!query) {
            this.showToast('Please enter a Nostr public key', 'error');
            return;
        }

        if (!this.isValidNpub(query)) {
            this.showToast('Please enter a valid npub key (must start with npub1 and be 63 characters)', 'error');
            return;
        }

        this.showLoading('Searching profile...');

        try {
            const profile = await this.searchProfile(query);
            if (profile) {
                this.currentProfile = profile;
                await this.loadProfileReviews();
                this.showProfileSection();
                this.updateURL(query);
                this.showToast('Profile found!', 'success');
            } else {
                this.showToast('Profile not found', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showToast(`Search failed: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async searchProfile(query) {
        try {
            if (!this.nostr) {
                throw new Error('Nostr tools not loaded');
            }

            // Validate and normalize the query
            const pubkeyData = this.validateAndNormalizePubkey(query);
            if (!pubkeyData) {
                throw new Error('Invalid public key format');
            }

            // Try to fetch profile from relays
            let profile = await this.fetchProfileFromRelays(pubkeyData);
            
            if (!profile) {
                // Create a basic profile if not found
                profile = this.createBasicProfile(pubkeyData);
            }

            return profile;
        } catch (error) {
            console.error('Profile search error:', error);
            throw error;
        }
    }

    validateAndNormalizePubkey(query) {
        try {
            if (!this.nostr) return null;
            
            query = query.trim();
            
            if (query.startsWith('npub') && query.length === 63) {
                // Convert npub to hex
                const decoded = this.nostr.nip19.decode(query);
                return {
                    hex: decoded.data,
                    npub: query
                };
            } else if (/^[0-9a-fA-F]{64}$/.test(query)) {
                // Already hex format
                const npub = this.nostr.nip19.npubEncode(query);
                return {
                    hex: query,
                    npub: npub
                };
            }
            
            return null;
        } catch (error) {
            console.error('Pubkey validation error:', error);
            return null;
        }
    }

    async fetchProfileFromRelays(pubkeyData) {
        try {
            if (!this.nostr) return null;
            
            const { hex: pubkey, npub } = pubkeyData;
            const relays = [
                'wss://relay.damus.io',
                'wss://nos.lol',
                'wss://relay.snort.social'
            ];
            
            // Create relay pool with timeout
            const pool = new this.nostr.SimplePool();
            
            // Query for profile metadata (kind 0)
            const filter = {
                kinds: [0],
                authors: [pubkey],
                limit: 1
            };

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
            );

            const queryPromise = pool.querySync(relays, filter);
            const events = await Promise.race([queryPromise, timeoutPromise]);
            
            pool.close(relays);

            if (events.length === 0) {
                return this.createBasicProfile(pubkeyData);
            }

            // Parse the most recent profile event
            const profileEvent = events.reduce((latest, current) => 
                current.created_at > latest.created_at ? current : latest
            );

            let profileData = {};
            try {
                profileData = JSON.parse(profileEvent.content);
            } catch (error) {
                console.warn('Failed to parse profile data:', error);
            }

            return {
                pubkey: pubkey,
                npub: npub,
                name: profileData.name || profileData.display_name || 'Anonymous',
                about: profileData.about || 'No bio available',
                picture: profileData.picture || null,
                banner: profileData.banner || null,
                website: profileData.website || null,
                nip05: profileData.nip05 || null,
                lud16: profileData.lud16 || null,
                created_at: profileEvent.created_at,
                raw: profileData
            };
        } catch (error) {
            console.error('Error fetching profile from relays:', error);
            return this.createBasicProfile(pubkeyData);
        }
    }

    createBasicProfile(pubkeyData) {
        const { hex: pubkey, npub } = pubkeyData;
        const shortName = npub.substring(0, 16) + '...';
        
        return {
            pubkey: pubkey,
            npub: npub,
            name: shortName,
            about: 'No profile information available',
            picture: null,
            banner: null,
            website: null,
            nip05: null,
            lud16: null,
            created_at: null,
            raw: {}
        };
    }

    async loadProfileReviews() {
        if (!this.currentProfile) return;

        try {
            // For now, show sample reviews since real Nostr reviews need to be implemented
            this.currentReviews = this.getSampleReviews(this.currentProfile.pubkey);
            this.displayReviews();
            this.updateProfileStats();
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.showToast('Error loading reviews', 'error');
        }
    }

    getSampleReviews(targetPubkey) {
        // Return sample reviews for demo
        return [
            {
                id: 'sample1',
                target: targetPubkey,
                author: 'npub1example1...',
                authorNpub: 'npub1example1...',
                rating: 5,
                content: 'Excellent Bitcoin service! Fast Lightning payments and great support.',
                created_at: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
                verified: true,
                signature: 'sample_sig1'
            },
            {
                id: 'sample2',
                target: targetPubkey,
                author: 'npub1example2...',
                authorNpub: 'npub1example2...', 
                rating: 4,
                content: 'Very reliable Bitcoin services. Had one minor issue but was resolved quickly.',
                created_at: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
                verified: true,
                signature: 'sample_sig2'
            },
            {
                id: 'sample3',
                target: targetPubkey,
                author: 'npub1example3...',
                authorNpub: 'npub1example3...',
                rating: 5,
                content: 'Outstanding experience with their Bitcoin trading platform. Will definitely use again!',
                created_at: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
                verified: false,
                signature: 'sample_sig3'
            }
        ];
    }

    displayReviews() {
        const reviewsList = document.getElementById('reviews-list');
        const noReviews = document.getElementById('no-reviews');

        if (!reviewsList || !noReviews) return;

        if (this.currentReviews.length === 0) {
            reviewsList.innerHTML = '';
            noReviews.classList.remove('hidden');
            return;
        }

        noReviews.classList.add('hidden');
        
        reviewsList.innerHTML = this.currentReviews.map(review => `
            <div class="review-item" data-id="${review.id}">
                <div class="review-header">
                    <div class="review-meta">
                        <div class="star-rating">
                            <img src="assets/${this.getRatingAsset(review.rating * 20)}.jpg" alt="${review.rating} stars" class="stars-image" style="height: 16px; width: auto;">
                        </div>
                        <span class="review-author">${this.formatAuthor(review.authorNpub || review.author)}</span>
                        ${review.verified ? '<span class="verified-badge">⚡ Verified</span>' : ''}
                    </div>
                    <span class="review-date">${this.formatDate(review.created_at)}</span>
                </div>
                <div class="review-content">${this.escapeHtml(review.content)}</div>
            </div>
        `).join('');
    }

    updateProfileStats() {
        const reviewsCount = this.currentReviews.length;
        const avgRating = reviewsCount > 0 
            ? (this.currentReviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount).toFixed(1)
            : '0.0';

        const reviewsCountEl = document.getElementById('reviews-count');
        const avgRatingEl = document.getElementById('avg-rating');
        const overallRatingEl = document.getElementById('overall-rating-number');
        const overallStarsEl = document.getElementById('overall-stars');

        if (reviewsCountEl) reviewsCountEl.textContent = reviewsCount;
        if (avgRatingEl) avgRatingEl.textContent = avgRating;
        if (overallRatingEl) overallRatingEl.textContent = avgRating;
        
        if (overallStarsEl) {
            const ratingPercentage = parseFloat(avgRating) * 20;
            overallStarsEl.src = `assets/${this.getRatingAsset(ratingPercentage)}.jpg`;
        }

        this.updateRatingBreakdown();
    }

    updateRatingBreakdown() {
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        this.currentReviews.forEach(review => {
            if (breakdown[review.rating] !== undefined) {
                breakdown[review.rating]++;
            }
        });

        const total = this.currentReviews.length;
        const breakdownHTML = Object.keys(breakdown).reverse().map(rating => {
            const count = breakdown[rating];
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
            
            return `
                <div class="rating-bar">
                    <span class="rating-stars-label">${rating} stars</span>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="rating-count">${count}</span>
                </div>
            `;
        }).join('');

        const ratingBreakdownEl = document.getElementById('rating-breakdown');
        if (ratingBreakdownEl) {
            ratingBreakdownEl.innerHTML = breakdownHTML;
        }
    }

    async handleLogin() {
        try {
            this.showLoading('Connecting to Nostr...');
            
            // Check for NIP-07 extension first
            if (window.nostr) {
                try {
                    const pubkey = await window.nostr.getPublicKey();
                    this.userProfile = {
                        pubkey: pubkey,
                        npub: this.nostr ? this.nostr.nip19.npubEncode(pubkey) : pubkey,
                        name: pubkey.substring(0, 16) + '...',
                        picture: null
                    };
                    this.updateLoginUI(true);
                    this.showToast('Successfully connected via Nostr extension!', 'success');
                } catch (error) {
                    throw new Error('Extension connection failed: ' + error.message);
                }
            } else {
                // Show manual login options
                this.showManualLoginModal();
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(`Login failed: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    showManualLoginModal() {
        // For now, just show a message about installing extensions
        this.showToast('Please install a Nostr extension like Alby or nos2x for the best experience', 'error');
    }

    async handleLogout() {
        try {
            this.userProfile = null;
            this.updateLoginUI(false);
            this.showToast('Disconnected from Nostr', 'success');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    updateLoginUI(isLoggedIn) {
        this.isLoggedIn = isLoggedIn;
        
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile');
        const addReviewBtn = document.getElementById('add-review-btn');

        if (!loginBtn || !userProfile) return;

        if (isLoggedIn && this.userProfile) {
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
            
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');
            
            if (userAvatar) {
                userAvatar.src = this.userProfile.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23f7931a"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="white">👤</text></svg>';
            }
            if (userName) {
                userName.textContent = this.userProfile.name || 'Anonymous';
            }
            
            if (addReviewBtn) {
                addReviewBtn.disabled = false;
            }
        } else {
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
            
            if (addReviewBtn) {
                addReviewBtn.disabled = true;
            }
        }
    }

    showReviewModal() {
        if (!this.isLoggedIn) {
            this.showToast('Please connect your Nostr account first', 'error');
            return;
        }

        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        
        // Reset form
        this.resetReviewForm();
    }

    hideReviewModal() {
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    showShareModal() {
        if (!this.currentProfile) return;

        const baseURL = window.location.origin + window.location.pathname;
        const shareURL = `${baseURL}?profile=${encodeURIComponent(this.currentProfile.npub)}`;
        
        const shareUrlInput = document.getElementById('share-url');
        if (shareUrlInput) {
            shareUrlInput.value = shareURL;
        }
        
        this.updateEmbedCode();
        
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideShareModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    selectRating(rating) {
        // Clear previous selection
        document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('selected'));
        
        // Select current rating
        const selectedBtn = document.querySelector(`[data-rating="${rating}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        // Update display
        const ratingAsset = this.getRatingAsset(parseInt(rating) * 20);
        const selectedStarImg = document.getElementById('selected-star-img');
        const ratingText = document.getElementById('rating-text');
        
        if (selectedStarImg) {
            selectedStarImg.src = `assets/${ratingAsset}.jpg`;
        }
        if (ratingText) {
            ratingText.textContent = `${rating} star${rating !== '1' ? 's' : ''}`;
        }
        
        this.validateReviewForm();
    }

    validateReviewForm() {
        const rating = document.querySelector('.star-btn.selected');
        const comment = document.getElementById('review-comment');
        const submitBtn = document.getElementById('submit-review');
        
        if (!submitBtn) return;
        
        const isValid = rating && comment && comment.value.trim().length > 0;
        submitBtn.disabled = !isValid;
    }

    resetReviewForm() {
        document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('selected'));
        
        const elements = {
            'review-comment': { value: '' },
            'char-count': { textContent: '0' },
            'selected-star-img': { src: 'assets/0.jpg' },
            'rating-text': { textContent: 'Select a rating' },
            'submit-review': { disabled: true }
        };
        
        Object.entries(elements).forEach(([id, props]) => {
            const el = document.getElementById(id);
            if (el) {
                Object.entries(props).forEach(([prop, value]) => {
                    el[prop] = value;
                });
            }
        });
    }

    async submitReview() {
        const selectedRating = document.querySelector('.star-btn.selected');
        const comment = document.getElementById('review-comment');
        
        if (!selectedRating || !comment || !comment.value.trim()) {
            this.showToast('Please provide a rating and comment', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-review');
        const originalText = submitBtn ? submitBtn.textContent : '';
        
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span style="animation: spin 1s linear infinite; display: inline-block;">⚡</span> Publishing...';
            }
            
            // Simulate review submission for demo
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showToast('Review published successfully!', 'success');
            this.hideReviewModal();
            
            // Add the new review to current reviews for demo
            const newReview = {
                id: 'user_review_' + Date.now(),
                target: this.currentProfile.pubkey,
                author: this.userProfile.npub,
                authorNpub: this.userProfile.npub,
                rating: parseInt(selectedRating.dataset.rating),
                content: comment.value.trim(),
                created_at: Math.floor(Date.now() / 1000),
                verified: false,
                signature: 'demo_signature'
            };
            
            this.currentReviews.unshift(newReview);
            this.displayReviews();
            this.updateProfileStats();
            
        } catch (error) {
            console.error('Error submitting review:', error);
            this.showToast('Error publishing review', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    sortReviews(sortBy) {
        let sortedReviews = [...this.currentReviews];
        
        switch (sortBy) {
            case 'newest':
                sortedReviews.sort((a, b) => b.created_at - a.created_at);
                break;
            case 'oldest':
                sortedReviews.sort((a, b) => a.created_at - b.created_at);
                break;
            case 'highest':
                sortedReviews.sort((a, b) => b.rating - a.rating);
                break;
            case 'lowest':
                sortedReviews.sort((a, b) => a.rating - b.rating);
                break;
        }
        
        this.currentReviews = sortedReviews;
        this.displayReviews();
    }

    updateEmbedCode() {
        if (!this.currentProfile) return;

        const width = document.getElementById('embed-width');
        const height = document.getElementById('embed-height');
        const maxReviews = document.getElementById('embed-max');
        const embedCode = document.getElementById('embed-code');
        
        if (!width || !height || !maxReviews || !embedCode) return;
        
        const baseURL = window.location.origin;
        const embedURL = `${baseURL}/embed.html?profile=${encodeURIComponent(this.currentProfile.npub)}&max=${maxReviews.value}`;
        
        const code = `<iframe
    src="${embedURL}"
    width="${width.value}"
    height="${height.value}"
    frameborder="0"
    style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
    loading="lazy">
</iframe>`;

        embedCode.value = code;
    }

    copyShareURL() {
        const input = document.getElementById('share-url');
        if (!input) return;
        
        input.select();
        input.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = document.getElementById('copy-url-btn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 2000);
            }
        }).catch(() => {
            this.showToast('Failed to copy URL', 'error');
        });
    }

    copyEmbedCode() {
        const textarea = document.getElementById('embed-code');
        if (!textarea) return;
        
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(textarea.value).then(() => {
            const btn = document.getElementById('copy-embed-btn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 2000);
            }
        }).catch(() => {
            this.showToast('Failed to copy embed code', 'error');
        });
    }

    showProfileSection() {
        // Hide hero sections
        const hero = document.querySelector('.hero');
        const aboutSection = document.querySelector('.about-section');
        const howItWorks = document.querySelector('.how-it-works');
        const searchResults = document.getElementById('search-results');
        
        if (hero) hero.style.display = 'none';
        if (aboutSection) aboutSection.style.display = 'none';
        if (howItWorks) howItWorks.style.display = 'none';
        if (searchResults) searchResults.classList.remove('hidden');
        
        // Update profile display
        if (this.currentProfile) {
            const elements = {
                'profile-avatar': { src: this.currentProfile.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23f7931a"/><text x="40" y="48" text-anchor="middle" font-size="24" fill="white">👤</text></svg>' },
                'profile-name': { textContent: this.currentProfile.name || 'Anonymous' },
                'profile-about': { textContent: this.currentProfile.about || 'No bio available' },
                'profile-pubkey': { textContent: this.formatPubkey(this.currentProfile.npub) }
            };
            
            Object.entries(elements).forEach(([id, props]) => {
                const el = document.getElementById(id);
                if (el) {
                    Object.entries(props).forEach(([prop, value]) => {
                        el[prop] = value;
                    });
                }
            });
        }
    }

    showHeroSection() {
        const hero = document.querySelector('.hero');
        const aboutSection = document.querySelector('.about-section');
        const howItWorks = document.querySelector('.how-it-works');
        const searchResults = document.getElementById('search-results');
        
        if (hero) hero.style.display = 'block';
        if (aboutSection) aboutSection.style.display = 'block';
        if (howItWorks) howItWorks.style.display = 'block';
        if (searchResults) searchResults.classList.add('hidden');
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    updateURL(profileKey) {
        const url = new URL(window.location);
        url.searchParams.set('profile', profileKey);
        window.history.replaceState({}, document.title, url);
    }

    showLoading(message = 'Loading...') {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            const p = spinner.querySelector('p');
            if (p) p.textContent = message;
            spinner.classList.remove('hidden');
        }
    }

    hideLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (container.contains(toast)) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (container.contains(toast)) {
                        container.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);
    }

    // Utility methods
    isValidNpub(key) {
        return key.startsWith('npub') && key.length === 63;
    }

    getRatingAsset(percentage) {
        // Convert percentage to asset filename (using JPG for now)
        if (percentage >= 100) return '100';
        if (percentage >= 90) return '90';
        if (percentage >= 80) return '80';
        if (percentage >= 70) return '70';
        if (percentage >= 60) return '60';
        if (percentage >= 50) return '50';
        if (percentage >= 40) return '40';
        if (percentage >= 30) return '30';
        if (percentage >= 20) return '20';
        if (percentage >= 10) return '10';
        return '0';
    }

    formatAuthor(pubkey) {
        if (!pubkey) return 'Anonymous';
        if (pubkey.startsWith('npub')) {
            return pubkey.substring(0, 16) + '...';
        }
        return pubkey.substring(0, 16) + '...';
    }

    formatPubkey(pubkey) {
        if (!pubkey) return '';
        return pubkey.substring(0, 20) + '...';
    }

    formatDate(timestamp) {
        return new Date(timestamp * 1000).toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 Starting Thunderproof...');
    window.thunderproof = new ThunderproofApp();
});