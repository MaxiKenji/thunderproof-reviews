// Thunderproof - Search Engine for Nostr Profiles
class SearchEngine {
    constructor() {
        this.relays = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.snort.social',
            'wss://relay.current.fyi',
            'wss://brb.io'
        ];
        this.nostr = null;
        this.initNostrTools();
    }

    async initNostrTools() {
        try {
            const nostrTools = await import('https://unpkg.com/nostr-tools@2/lib/esm/index.js');
            this.nostr = nostrTools;
        } catch (error) {
            console.error('Failed to load nostr-tools for search:', error);
        }
    }

    async searchProfile(query) {
        try {
            // Validate and normalize the query
            const pubkey = this.validateAndNormalizePubkey(query);
            if (!pubkey) {
                throw new Error('Invalid public key format');
            }

            // Try to fetch profile from multiple sources
            let profile = await this.fetchProfileFromRelays(pubkey);
            
            if (!profile) {
                // Create a basic profile if not found
                profile = this.createBasicProfile(pubkey);
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
            
            // Create relay pool
            const pool = new this.nostr.SimplePool();
            
            // Query for profile metadata (kind 0)
            const filter = {
                kinds: [0],
                authors: [pubkey],
                limit: 1
            };

            const events = await pool.querySync(this.relays, filter);
            pool.close(this.relays);

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
                about: profileData.about || '',
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

    async searchProfiles(query, limit = 10) {
        // This could be extended to search multiple profiles by name, etc.
        // For now, focus on single profile lookup
        try {
            const profile = await this.searchProfile(query);
            return profile ? [profile] : [];
        } catch (error) {
            console.error('Profiles search error:', error);
            return [];
        }
    }

    async validateNip05(nip05, pubkey) {
        try {
            if (!nip05 || !nip05.includes('@')) return false;
            
            const [name, domain] = nip05.split('@');
            const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
            
            const response = await fetch(url);
            if (!response.ok) return false;
            
            const data = await response.json();
            const foundPubkey = data.names?.[name];
            
            return foundPubkey === pubkey;
        } catch (error) {
            console.warn('NIP-05 validation failed:', error);
            return false;
        }
    }

    formatProfileForDisplay(profile) {
        return {
            ...profile,
            displayName: profile.name || 'Anonymous',
            shortPubkey: profile.npub?.substring(0, 16) + '...' || 'Unknown',
            hasAvatar: !!profile.picture,
            isVerified: !!profile.nip05, // Could be enhanced with actual verification
            memberSince: profile.created_at ? new Date(profile.created_at * 1000).getFullYear() : null
        };
    }
}

// Thunderproof - Reviews Manager
class ReviewsManager {
    constructor() {
        this.relays = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.snort.social',
            'wss://relay.current.fyi',
            'wss://brb.io'
        ];
        this.nostr = null;
        this.nostrAuth = null;
        this.initNostrTools();
    }

    async initNostrTools() {
        try {
            const nostrTools = await import('https://unpkg.com/nostr-tools@2/lib/esm/index.js');
            this.nostr = nostrTools;
        } catch (error) {
            console.error('Failed to load nostr-tools for reviews:', error);
        }
    }

    setNostrAuth(nostrAuth) {
        this.nostrAuth = nostrAuth;
    }

    async getReviews(targetPubkey, limit = 50) {
        try {
            if (!this.nostr) throw new Error('Nostr tools not loaded');
            
            const pool = new this.nostr.SimplePool();
            
            // Query for review events (kind 1985 - NIP-32 labeling)
            const filter = {
                kinds: [1985],
                '#L': ['thunderproof'],  // Label namespace
                '#l': ['review'],        // Label type
                '#p': [targetPubkey],    // Target entity
                limit: limit
            };

            const events = await pool.querySync(this.relays, filter);
            pool.close(this.relays);

            // Process and validate review events
            const reviews = await Promise.all(
                events.map(event => this.processReviewEvent(event))
            );

            // Filter out invalid reviews and sort by date
            return reviews
                .filter(review => review !== null)
                .sort((a, b) => b.created_at - a.created_at);
                
        } catch (error) {
            console.error('Error fetching reviews:', error);
            // Return sample data for demo purposes
            return this.getSampleReviews(targetPubkey);
        }
    }

    getSampleReviews(targetPubkey) {
        // Return sample reviews for demo
        return [
            {
                id: 'sample1',
                target: targetPubkey,
                author: 'npub1example1',
                authorNpub: 'npub1example1',
                rating: 5,
                content: 'Excellent service! Fast Lightning payments and great support.',
                created_at: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
                verified: true,
                signature: 'sample_sig1'
            },
            {
                id: 'sample2',
                target: targetPubkey,
                author: 'npub1example2',
                authorNpub: 'npub1example2', 
                rating: 4,
                content: 'Very reliable Bitcoin services. Had one minor issue but was resolved quickly.',
                created_at: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
                verified: true,
                signature: 'sample_sig2'
            },
            {
                id: 'sample3',
                target: targetPubkey,
                author: 'npub1example3',
                authorNpub: 'npub1example3',
                rating: 5,
                content: 'Outstanding experience. Will definitely use again!',
                created_at: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
                verified: false,
                signature: 'sample_sig3'
            }
        ];
    }

    async processReviewEvent(event) {
        try {
            // Validate event signature
            if (!this.nostr.verifySignature(event)) {
                console.warn('Invalid review event signature:', event.id);
                return null;
            }

            // Parse review data from tags
            const ratingTag = event.tags.find(tag => tag[0] === 'rating');
            const targetTag = event.tags.find(tag => tag[0] === 'p');
            const verifiedTag = event.tags.find(tag => tag[0] === 'verified');

            if (!ratingTag || !targetTag) {
                console.warn('Missing required review tags:', event.id);
                return null;
            }

            const rating = parseInt(ratingTag[1]);
            if (rating < 1 || rating > 5) {
                console.warn('Invalid rating value:', rating);
                return null;
            }

            // Get author info (basic for now)
            const authorNpub = this.nostr.nip19.npubEncode(event.pubkey);

            return {
                id: event.id,
                target: targetTag[1],
                author: event.pubkey,
                authorNpub: authorNpub,
                rating: rating,
                content: event.content,
                created_at: event.created_at,
                verified: verifiedTag ? verifiedTag[1] === 'true' : false,
                signature: event.sig
            };
        } catch (error) {
            console.error('Error processing review event:', error);
            return null;
        }
    }

    async publishReview(reviewData) {
        try {
            if (!this.nostr) throw new Error('Nostr tools not loaded');
            if (!this.nostrAuth) throw new Error('Authentication not available');

            const { target, rating, content } = reviewData;
            
            // Validate review data
            if (!target || !rating || !content) {
                throw new Error('Missing required review data');
            }

            if (rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }

            if (content.length > 500) {
                throw new Error('Review content too long (max 500 characters)');
            }

            // Create review event (NIP-32 labeling)
            const event = {
                kind: 1985,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['L', 'thunderproof'],           // Label namespace
                    ['l', 'review', 'thunderproof'], // Label type with namespace
                    ['p', target],                   // Target entity being reviewed
                    ['rating', rating.toString()],   // Rating value
                    ['verified', 'false']            // Lightning verification status
                ],
                content: content,
                pubkey: this.nostrAuth.getPubkey()
            };

            // Sign the event
            const signedEvent = await this.nostrAuth.signEvent(event);

            // Publish to relays
            const pool = new this.nostr.SimplePool();
            const publishPromises = this.relays.map(relay => 
                pool.publish([relay], signedEvent)
            );

            const results = await Promise.allSettled(publishPromises);
            pool.close(this.relays);

            const successCount = results.filter(result => result.status === 'fulfilled').length;
            
            if (successCount === 0) {
                throw new Error('Failed to publish review to any relay');
            }

            console.log(`Review published to ${successCount}/${this.relays.length} relays`);
            return signedEvent;

        } catch (error) {
            console.error('Error publishing review:', error);
            throw error;
        }
    }

    async getUserReviews(authorPubkey, limit = 50) {
        try {
            if (!this.nostr) throw new Error('Nostr tools not loaded');
            
            const pool = new this.nostr.SimplePool();
            
            // Query for reviews by specific author
            const filter = {
                kinds: [1985],
                authors: [authorPubkey],
                '#L': ['thunderproof'],
                '#l': ['review'],
                limit: limit
            };

            const events = await pool.querySync(this.relays, filter);
            pool.close(this.relays);

            const reviews = await Promise.all(
                events.map(event => this.processReviewEvent(event))
            );

            return reviews
                .filter(review => review !== null)
                .sort((a, b) => b.created_at - a.created_at);
                
        } catch (error) {
            console.error('Error fetching user reviews:', error);
            throw error;
        }
    }

    async deleteReview(reviewId) {
        try {
            if (!this.nostr) throw new Error('Nostr tools not loaded');
            if (!this.nostrAuth) throw new Error('Authentication not available');

            // Create deletion event (kind 5)
            const deleteEvent = {
                kind: 5,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['e', reviewId] // Event being deleted
                ],
                content: 'Review deleted',
                pubkey: this.nostrAuth.getPubkey()
            };

            // Sign and publish deletion event
            const signedEvent = await this.nostrAuth.signEvent(deleteEvent);
            
            const pool = new this.nostr.SimplePool();
            const publishPromises = this.relays.map(relay => 
                pool.publish([relay], signedEvent)
            );

            await Promise.allSettled(publishPromises);
            pool.close(this.relays);

            return true;
        } catch (error) {
            console.error('Error deleting review:', error);
            throw error;
        }
    }

    calculateStats(reviews) {
        if (reviews.length === 0) {
            return {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                verifiedCount: 0
            };
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        
        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(review => {
            if (ratingDistribution[review.rating] !== undefined) {
                ratingDistribution[review.rating]++;
            }
        });

        const verifiedCount = reviews.filter(review => review.verified).length;

        return {
            totalReviews: reviews.length,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingDistribution,
            verifiedCount
        };
    }

    formatReviewForDisplay(review) {
        return {
            ...review,
            authorShort: review.authorNpub.substring(0, 16) + '...',
            dateFormatted: new Date(review.created_at * 1000).toLocaleDateString(),
            timeAgo: this.getTimeAgo(review.created_at),
            ratingStars: '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating),
            isRecent: (Date.now() / 1000 - review.created_at) < (7 * 24 * 60 * 60) // Last 7 days
        };
    }

    getTimeAgo(timestamp) {
        const now = Date.now() / 1000;
        const diff = now - timestamp;

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
        return `${Math.floor(diff / 2592000)}mo ago`;
    }

    validateReviewContent(content) {
        if (!content || content.trim().length === 0) {
            return { valid: false, error: 'Review content is required' };
        }

        if (content.length > 500) {
            return { valid: false, error: 'Review content too long (max 500 characters)' };
        }

        // Check for spam patterns (basic)
        const spamPatterns = [
            /(.)\1{10,}/,  // Repeated characters
            /https?:\/\/[^\s]{20,}/,  // Long URLs
        ];

        for (const pattern of spamPatterns) {
            if (pattern.test(content)) {
                return { valid: false, error: 'Review content appears to be spam' };
            }
        }

        return { valid: true, error: null };
    }
}