// Thunderproof - Nostr Authentication (Stacker News Style)
class NostrAuth {
    constructor() {
        this.pubkey = null;
        this.privkey = null;
        this.relays = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.snort.social',
            'wss://relay.current.fyi',
            'wss://brb.io'
        ];
        this.connectedRelays = new Map();
        this.pool = null;
        this.nostr = null;
        
        this.initNostrTools();
    }

    async initNostrTools() {
        try {
            // Import nostr-tools dynamically
            const nostrTools = await import('https://unpkg.com/nostr-tools@2/lib/esm/index.js');
            this.nostr = nostrTools;
            console.log('Nostr tools loaded successfully');
        } catch (error) {
            console.error('Failed to load nostr-tools:', error);
        }
    }

    async login() {
        try {
            // Check for NIP-07 extension (like nos2x, Alby, etc.)
            if (window.nostr) {
                return await this.loginWithExtension();
            }
            
            // Fallback to other methods
            return await this.showLoginOptions();
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async loginWithExtension() {
        try {
            // Request public key from extension
            this.pubkey = await window.nostr.getPublicKey();
            
            // Test signing capability
            const testEvent = {
                kind: 1,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: 'Test signature for Thunderproof login'
            };

            await window.nostr.signEvent(testEvent);
            
            // Store login state
            localStorage.setItem('thunderproof_pubkey', this.pubkey);
            localStorage.setItem('thunderproof_login_method', 'extension');
            
            return true;
        } catch (error) {
            console.error('Extension login failed:', error);
            throw new Error('Failed to connect with Nostr extension');
        }
    }

    async showLoginOptions() {
        return new Promise((resolve, reject) => {
            // Create login modal
            const modal = this.createLoginModal();
            document.body.appendChild(modal);
            
            // Handle different login methods
            modal.querySelector('#login-extension').addEventListener('click', async () => {
                try {
                    if (!window.nostr) {
                        throw new Error('No Nostr extension found. Please install Alby, nos2x, or another NIP-07 extension.');
                    }
                    
                    const success = await this.loginWithExtension();
                    this.removeLoginModal(modal);
                    resolve(success);
                } catch (error) {
                    this.showLoginError(modal, error.message);
                }
            });
            
            modal.querySelector('#login-nsec').addEventListener('click', () => {
                this.showNsecInput(modal, resolve, reject);
            });
            
            modal.querySelector('#login-generate').addEventListener('click', async () => {
                try {
                    const success = await this.generateAndLoginWithKeys();
                    this.removeLoginModal(modal);
                    resolve(success);
                } catch (error) {
                    this.showLoginError(modal, error.message);
                }
            });
            
            modal.querySelector('.close-btn').addEventListener('click', () => {
                this.removeLoginModal(modal);
                resolve(false);
            });
            
            modal.querySelector('.modal-overlay').addEventListener('click', () => {
                this.removeLoginModal(modal);
                resolve(false);
            });
        });
    }

    createLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'modal login-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Connect to Nostr</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="login-options">
                        <button id="login-extension" class="login-option primary">
                            <div class="option-icon">🔌</div>
                            <div class="option-content">
                                <h4>Nostr Extension</h4>
                                <p>Connect using Alby, nos2x, or another NIP-07 extension</p>
                            </div>
                        </button>
                        
                        <button id="login-nsec" class="login-option">
                            <div class="option-icon">🔑</div>
                            <div class="option-content">
                                <h4>Private Key (nsec)</h4>
                                <p>Enter your private key manually (stored locally)</p>
                            </div>
                        </button>
                        
                        <button id="login-generate" class="login-option">
                            <div class="option-icon">✨</div>
                            <div class="option-content">
                                <h4>Generate New Identity</h4>
                                <p>Create a new Nostr keypair for testing</p>
                            </div>
                        </button>
                    </div>
                    <div id="login-error" class="login-error hidden"></div>
                </div>
            </div>
        `;
        
        // Add styles for login modal
        if (!document.querySelector('#login-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'login-modal-styles';
            style.textContent = `
                .login-options {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                
                .login-option {
                    display: flex;
                    align-items: center;
                    gap: var(--space-lg);
                    padding: var(--space-lg);
                    background: var(--dark-accent);
                    border: 2px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: left;
                    width: 100%;
                    font-family: inherit;
                    color: inherit;
                }
                
                .login-option:hover {
                    border-color: var(--primary-orange);
                    background: rgba(247, 147, 26, 0.05);
                }
                
                .login-option.primary {
                    border-color: var(--primary-orange);
                    background: rgba(247, 147, 26, 0.1);
                }
                
                .option-icon {
                    font-size: 2rem;
                    min-width: 40px;
                }
                
                .option-content h4 {
                    color: var(--text-primary);
                    margin-bottom: var(--space-xs);
                    font-weight: 600;
                }
                
                .option-content p {
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                    margin: 0;
                }
                
                .login-error {
                    background: rgba(220, 53, 69, 0.1);
                    border: 1px solid var(--error);
                    border-radius: var(--border-radius-md);
                    padding: var(--space-md);
                    color: var(--error);
                    margin-top: var(--space-md);
                }
                
                .nsec-input-group {
                    margin-top: var(--space-lg);
                }
                
                .nsec-input-group label {
                    display: block;
                    color: var(--text-primary);
                    margin-bottom: var(--space-sm);
                    font-weight: 600;
                }
                
                .nsec-input {
                    width: 100%;
                    background: var(--dark-surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    padding: var(--space-md);
                    color: var(--text-primary);
                    font-family: 'Monaco', 'Consolas', monospace;
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--space-md);
                }
                
                .nsec-actions {
                    display: flex;
                    gap: var(--space-md);
                    justify-content: flex-end;
                }
            `;
            document.head.appendChild(style);
        }
        
        return modal;
    }

    showNsecInput(modal, resolve, reject) {
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="nsec-input-group">
                <label for="nsec-input">Enter your private key (nsec):</label>
                <input type="password" id="nsec-input" class="nsec-input" placeholder="nsec1...">
                <p style="color: var(--text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-md);">
                    Your private key will be stored locally and never sent to any server.
                </p>
                <div class="nsec-actions">
                    <button id="nsec-cancel" class="btn-secondary">Cancel</button>
                    <button id="nsec-login" class="btn-primary">Login</button>
                </div>
            </div>
            <div id="login-error" class="login-error hidden"></div>
        `;
        
        modal.querySelector('#nsec-cancel').addEventListener('click', () => {
            this.removeLoginModal(modal);
            resolve(false);
        });
        
        modal.querySelector('#nsec-login').addEventListener('click', async () => {
            const nsec = modal.querySelector('#nsec-input').value.trim();
            try {
                const success = await this.loginWithNsec(nsec);
                this.removeLoginModal(modal);
                resolve(success);
            } catch (error) {
                this.showLoginError(modal, error.message);
            }
        });
        
        modal.querySelector('#nsec-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('#nsec-login').click();
            }
        });
    }

    async loginWithNsec(nsec) {
        try {
            if (!this.nostr) throw new Error('Nostr tools not loaded');
            
            if (!nsec.startsWith('nsec')) {
                throw new Error('Invalid private key format. Must start with "nsec".');
            }
            
            // Decode nsec to hex
            const { data: privkey } = this.nostr.nip19.decode(nsec);
            this.privkey = privkey;
            this.pubkey = this.nostr.getPublicKey(privkey);
            
            // Store login state
            localStorage.setItem('thunderproof_privkey', nsec);
            localStorage.setItem('thunderproof_pubkey', this.pubkey);
            localStorage.setItem('thunderproof_login_method', 'nsec');
            
            return true;
        } catch (error) {
            console.error('Nsec login failed:', error);
            throw new Error('Invalid private key or login failed');
        }
    }

    async generateAndLoginWithKeys() {
        try {
            if (!this.nostr) throw new Error('Nostr tools not loaded');
            
            // Generate new keypair
            this.privkey = this.nostr.generatePrivateKey();
            this.pubkey = this.nostr.getPublicKey(this.privkey);
            
            const nsec = this.nostr.nip19.nsecEncode(this.privkey);
            const npub = this.nostr.nip19.npubEncode(this.pubkey);
            
            // Store login state
            localStorage.setItem('thunderproof_privkey', nsec);
            localStorage.setItem('thunderproof_pubkey', this.pubkey);
            localStorage.setItem('thunderproof_login_method', 'generated');
            
            // Show the generated keys to user
            this.showGeneratedKeys(nsec, npub);
            
            return true;
        } catch (error) {
            console.error('Key generation failed:', error);
            throw new Error('Failed to generate new identity');
        }
    }

    showGeneratedKeys(nsec, npub) {
        const modal = document.createElement('div');
        modal.className = 'modal keys-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚠️ Save Your Keys</h3>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-primary); margin-bottom: var(--space-lg);">
                        <strong>Important:</strong> Save these keys securely. You'll need the private key (nsec) to access your account again.
                    </p>
                    
                    <div class="key-group">
                        <label>Public Key (npub) - Share this:</label>
                        <div class="key-display">
                            <input type="text" value="${npub}" readonly class="key-input">
                            <button class="btn-copy" data-copy="${npub}">Copy</button>
                        </div>
                    </div>
                    
                    <div class="key-group">
                        <label>Private Key (nsec) - Keep this secret:</label>
                        <div class="key-display">
                            <input type="password" value="${nsec}" readonly class="key-input">
                            <button class="btn-toggle">Show</button>
                            <button class="btn-copy" data-copy="${nsec}">Copy</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="keys-understood" class="btn-primary">I've Saved My Keys</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle copy buttons
        modal.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.copy;
                navigator.clipboard.writeText(text);
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 2000);
            });
        });
        
        // Handle toggle button
        modal.querySelector('.btn-toggle').addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = 'Hide';
            } else {
                input.type = 'password';
                this.textContent = 'Show';
            }
        });
        
        modal.querySelector('#keys-understood').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Add styles for keys modal
        if (!document.querySelector('#keys-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'keys-modal-styles';
            style.textContent = `
                .key-group {
                    margin-bottom: var(--space-lg);
                }
                
                .key-group label {
                    display: block;
                    color: var(--text-primary);
                    margin-bottom: var(--space-sm);
                    font-weight: 600;
                }
                
                .key-display {
                    display: flex;
                    gap: var(--space-sm);
                }
                
                .key-input {
                    flex: 1;
                    background: var(--dark-accent);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    padding: var(--space-md);
                    color: var(--text-primary);
                    font-family: 'Monaco', 'Consolas', monospace;
                    font-size: var(--font-size-sm);
                }
                
                .btn-toggle, .btn-copy {
                    background: var(--dark-surface);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                    padding: var(--space-sm) var(--space-md);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: var(--font-size-sm);
                    white-space: nowrap;
                }
                
                .btn-toggle:hover, .btn-copy:hover {
                    background: var(--primary-orange);
                    color: var(--dark-bg);
                }
            `;
            document.head.appendChild(style);
        }
    }

    showLoginError(modal, message) {
        const errorDiv = modal.querySelector('#login-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    removeLoginModal(modal) {
        if (modal && modal.parentNode) {
            document.body.removeChild(modal);
        }
    }

    async logout() {
        this.pubkey = null;
        this.privkey = null;
        
        localStorage.removeItem('thunderproof_pubkey');
        localStorage.removeItem('thunderproof_privkey');
        localStorage.removeItem('thunderproof_login_method');
        
        return true;
    }

    async checkLoginStatus() {
        const pubkey = localStorage.getItem('thunderproof_pubkey');
        const loginMethod = localStorage.getItem('thunderproof_login_method');
        
        if (!pubkey) return false;
        
        this.pubkey = pubkey;
        
        if (loginMethod === 'extension' && window.nostr) {
            // Verify extension is still available
            try {
                const extensionPubkey = await window.nostr.getPublicKey();
                return extensionPubkey === pubkey;
            } catch {
                return false;
            }
        } else if (loginMethod === 'nsec' || loginMethod === 'generated') {
            const privkey = localStorage.getItem('thunderproof_privkey');
            if (privkey && this.nostr) {
                try {
                    if (privkey.startsWith('nsec')) {
                        const { data } = this.nostr.nip19.decode(privkey);
                        this.privkey = data;
                    } else {
                        this.privkey = privkey;
                    }
                    return true;
                } catch {
                    return false;
                }
            }
        }
        
        return false;
    }

    async getUserProfile() {
        if (!this.pubkey) return null;
        
        try {
            // Try to fetch profile from relays
            const profile = await this.fetchProfileFromRelays(this.pubkey);
            return profile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            
            // Return basic profile with pubkey
            const npub = this.nostr ? this.nostr.nip19.npubEncode(this.pubkey) : this.pubkey;
            return {
                pubkey: this.pubkey,
                npub: npub,
                name: npub.substring(0, 12) + '...',
                picture: null
            };
        }
    }

    async fetchProfileFromRelays(pubkey) {
        if (!this.nostr) return null;
        
        try {
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
                const npub = this.nostr.nip19.npubEncode(pubkey);
                return {
                    pubkey: pubkey,
                    npub: npub,
                    name: npub.substring(0, 12) + '...',
                    about: '',
                    picture: null
                };
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

            const npub = this.nostr.nip19.npubEncode(pubkey);
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
            const npub = this.nostr.nip19.npubEncode(pubkey);
            return {
                pubkey: pubkey,
                npub: npub,
                name: npub.substring(0, 12) + '...',
                about: 'No profile information available',
                picture: null
            };
        }
    }

    async signEvent(event) {
        try {
            if (window.nostr && localStorage.getItem('thunderproof_login_method') === 'extension') {
                return await window.nostr.signEvent(event);
            } else if (this.privkey && this.nostr) {
                return this.nostr.finishEvent(event, this.privkey);
            } else {
                throw new Error('No signing method available');
            }
        } catch (error) {
            console.error('Event signing failed:', error);
            throw error;
        }
    }

    getPubkey() {
        return this.pubkey;
    }

    getNpub() {
        if (this.pubkey && this.nostr) {
            return this.nostr.nip19.npubEncode(this.pubkey);
        }
        return null;
    }
}