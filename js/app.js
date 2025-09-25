// Thunderproof - Main Application Logic
class ThunderproofApp {
    constructor() {
        this.currentProfile = null;
        this.currentReviews = [];
        this.userProfile = null;
        this.isLoggedIn = false;
        this.nostrAuth = null;
        this.searchEngine = null;
        this.reviewsManager = null;
        
        this.init();
    }

    async init() {
        // Initialize modules
        this.nostrAuth = new NostrAuth();
        this.searchEngine = new SearchEngine();
        this.reviewsManager = new ReviewsManager();
        
        // Connect the reviews manager to auth
        this.reviewsManager.setNostrAuth(this.nostrAuth);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check if user is already logged in
        await this.checkLoginStatus();
        
        // Handle direct profile links
        this.handleURLParams();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Example keys
        document.querySelectorAll('.example-key').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                document.getElementById('search-input').value = key;
                this.handleSearch();
            });
        });

        // Navigation
        document.getElementById('back-btn').addEventListener('click', () => this.showHeroSection());

        // Profile actions
        document.getElementById('add-review-btn').addEventListener('click', () => this.showReviewModal());
        document.getElementById('share-profile-btn').addEventListener('click', () => this.showShareModal());

        // Login/Logout
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Review modal
        document.getElementById('close-modal').addEventListener('click', () => this.hideReviewModal());
        document.getElementById('modal-overlay').addEventListener('click', () => this.hideReviewModal());
        document.getElementById('cancel-review').addEventListener('click', () => this.hideReviewModal());
        document.getElementById('submit-review').addEventListener('click', () => this.submitReview());

        // Share modal
        document.getElementById('close-share-modal').addEventListener('click', () => this.hideShareModal());
        document.getElementById('share-modal-overlay').addEventListener('click', () => this.hideShareModal());
        document.getElementById('copy-url-btn').addEventListener('click', () => this.copyShareURL());
        document.getElementById('copy-embed-btn').addEventListener('click', () => this.copyEmbedCode());

        // Star rating selector
        document.querySelectorAll('.star-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectRating(e.target.closest('.star-btn').dataset.rating));
        });

        // Review comment character count
        document.getElementById('review-comment').addEventListener('input', (e) => {
            document.getElementById('char-count').textContent = e.target.value.length;
            this.validateReviewForm();
        });

        // Embed config changes
        ['embed-width', 'embed-height', 'embed-max'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateEmbedCode());
        });

        // Sort reviews
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.sortReviews(e.target.value);
        });
    }

    async checkLoginStatus() {
        try {
            const isLoggedIn = await this.nostrAuth.checkLoginStatus();
            if (isLoggedIn) {
                this.userProfile = await this.nostrAuth.getUserProfile();
                this.updateLoginUI(true);
            }
        } catch (error) {
            console.error('Error checking login status:', error);
        }
    }

    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const profileKey = urlParams.get('profile');
        
        if (profileKey) {
            document.getElementById('search-input').value = profileKey;
            this.handleSearch();
        }
    }

    async handleSearch() {
        const query = document.getElementById('search-input').value.trim();
        
        if (!query) {
            this.showToast('Please enter a Nostr public key', 'error');
            return;
        }

        if (!this.isValidNpub(query)) {
            this.showToast('Please enter a valid npub key', 'error');
            return;
        }

        this.showLoading('Searching profile...');

        try {
            const profile = await this.searchEngine.searchProfile(query);
            if (profile) {
                this.currentProfile = profile;
                await this.loadProfileReviews();
                this.showProfileSection();
                this.updateURL(query);
            } else {
                this.showToast('Profile not found', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Error searching profile', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadProfileReviews() {
        if (!this.currentProfile) return;

        try {
            this.currentReviews = await this.reviewsManager.getReviews(this.currentProfile.pubkey);
            this.displayReviews();
            this.updateProfileStats();
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.showToast('Error loading reviews', 'error');
        }
    }

    displayReviews() {
        const reviewsList = document.getElementById('reviews-list');
        const noReviews = document.getElementById('no-reviews');

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
                            <img src="assets/${this.getRatingAsset(review.rating * 20)}.svg" alt="${review.rating} stars" class="stars-image">
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

        document.getElementById('reviews-count').textContent = reviewsCount;
        document.getElementById('avg-rating').textContent = avgRating;
        document.getElementById('overall-rating-number').textContent = avgRating;
        
        const ratingPercentage = parseFloat(avgRating) * 20;
        document.getElementById('overall-stars').src = `assets/${this.getRatingAsset(ratingPercentage)}.svg`;

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

        document.getElementById('rating-breakdown').innerHTML = breakdownHTML;
    }

    async handleLogin() {
        try {
            this.showLoading('Connecting to Nostr...');
            
            const success = await this.nostrAuth.login();
            if (success) {
                this.userProfile = await this.nostrAuth.getUserProfile();
                this.updateLoginUI(true);
                this.showToast('Successfully connected!', 'success');
            } else {
                this.showToast('Login cancelled or failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Error connecting to Nostr', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        try {
            await this.nostrAuth.logout();
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

        if (isLoggedIn && this.userProfile) {
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
            
            document.getElementById('user-avatar').src = this.userProfile.picture || 'assets/default-avatar.svg';
            document.getElementById('user-name').textContent = this.userProfile.name || 'Anonymous';
            
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

        document.getElementById('review-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Reset form
        this.resetReviewForm();
    }

    hideReviewModal() {
        document.getElementById('review-modal').classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    showShareModal() {
        if (!this.currentProfile) return;

        const baseURL = window.location.origin + window.location.pathname;
        const shareURL = `${baseURL}?profile=${encodeURIComponent(this.currentProfile.npub)}`;
        
        document.getElementById('share-url').value = shareURL;
        this.updateEmbedCode();
        
        document.getElementById('share-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideShareModal() {
        document.getElementById('share-modal').classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    selectRating(rating) {
        // Clear previous selection
        document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('selected'));
        
        // Select current rating
        document.querySelector(`[data-rating="${rating}"]`).classList.add('selected');
        
        // Update display
        const ratingAsset = this.getRatingAsset(parseInt(rating) * 20);
        document.getElementById('selected-star-img').src = `assets/${ratingAsset}.svg`;
        document.getElementById('rating-text').textContent = `${rating} star${rating !== '1' ? 's' : ''}`;
        
        this.validateReviewForm();
    }

    validateReviewForm() {
        const rating = document.querySelector('.star-btn.selected');
        const comment = document.getElementById('review-comment').value.trim();
        const submitBtn = document.getElementById('submit-review');
        
        const isValid = rating && comment.length > 0;
        submitBtn.disabled = !isValid;
    }

    resetReviewForm() {
        document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById('review-comment').value = '';
        document.getElementById('char-count').textContent = '0';
        document.getElementById('selected-star-img').src = 'assets/0.svg';
        document.getElementById('rating-text').textContent = 'Select a rating';
        document.getElementById('submit-review').disabled = true;
    }

    async submitReview() {
        const selectedRating = document.querySelector('.star-btn.selected');
        const comment = document.getElementById('review-comment').value.trim();
        
        if (!selectedRating || !comment) {
            this.showToast('Please provide a rating and comment', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-review');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Publishing...';
            
            const rating = parseInt(selectedRating.dataset.rating);
            const reviewData = {
                target: this.currentProfile.pubkey,
                rating: rating,
                content: comment,
                author: this.userProfile.pubkey
            };

            const success = await this.reviewsManager.publishReview(reviewData);
            
            if (success) {
                this.showToast('Review published successfully!', 'success');
                this.hideReviewModal();
                
                // Reload reviews
                setTimeout(() => {
                    this.loadProfileReviews();
                }, 2000);
            } else {
                throw new Error('Failed to publish review');
            }
            
        } catch (error) {
            console.error('Error submitting review:', error);
            this.showToast('Error publishing review', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
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

        const width = document.getElementById('embed-width').value;
        const height = document.getElementById('embed-height').value;
        const maxReviews = document.getElementById('embed-max').value;
        
        const baseURL = window.location.origin;
        const embedURL = `${baseURL}/embed.html?profile=${encodeURIComponent(this.currentProfile.npub)}&max=${maxReviews}`;
        
        const embedCode = `<iframe
    src="${embedURL}"
    width="${width}"
    height="${height}"
    frameborder="0"
    style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
    loading="lazy">
</iframe>`;

        document.getElementById('embed-code').value = embedCode;
    }

    copyShareURL() {
        const input = document.getElementById('share-url');
        input.select();
        input.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(input.value);
        
        const btn = document.getElementById('copy-url-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    }

    copyEmbedCode() {
        const textarea = document.getElementById('embed-code');
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(textarea.value);
        
        const btn = document.getElementById('copy-embed-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    }

    showProfileSection() {
        document.querySelector('.hero').style.display = 'none';
        document.querySelector('.about-section').style.display = 'none';
        document.querySelector('.how-it-works').style.display = 'none';
        document.getElementById('search-results').classList.remove('hidden');
        
        // Update profile display
        if (this.currentProfile) {
            document.getElementById('profile-avatar').src = this.currentProfile.picture || 'assets/default-avatar.svg';
            document.getElementById('profile-name').textContent = this.currentProfile.name || 'Anonymous';
            document.getElementById('profile-about').textContent = this.currentProfile.about || 'No bio available';
            document.getElementById('profile-pubkey').textContent = this.formatPubkey(this.currentProfile.npub);
        }
    }

    showHeroSection() {
        document.querySelector('.hero').style.display = 'block';
        document.querySelector('.about-section').style.display = 'block';
        document.querySelector('.how-it-works').style.display = 'block';
        document.getElementById('search-results').classList.add('hidden');
        
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
        spinner.querySelector('p').textContent = message;
        spinner.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-spinner').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    // Utility methods
    isValidNpub(key) {
        return key.startsWith('npub') && key.length === 63;
    }

    getRatingAsset(percentage) {
        // Convert percentage to asset filename
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
            return pubkey.substring(0, 12) + '...';
        }
        return pubkey.substring(0, 8) + '...';
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
    window.thunderproof = new ThunderproofApp();
});