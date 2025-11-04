/**
 * COMPLETE SOCIAL MEDIA AUTOMATION SYSTEM
 * Integrates all components: Twitter, Instagram, AI Content, Scheduler
 *
 * This is the master orchestration file that brings together:
 * - TWITTER_API_INTEGRATION.js
 * - INSTAGRAM_API_INTEGRATION.js
 * - AI_CONTENT_GENERATOR_SOCIAL_MEDIA.js
 * - AUTOMATED_POSTING_SCHEDULER.js
 * - SOCIAL_MEDIA_ORCHESTRATOR.js (original)
 */

const { TwitterAPIClient, TwitterOrchestrator } = require('./TWITTER_API_INTEGRATION');
const { InstagramAPIClient, InstagramOrchestrator } = require('./INSTAGRAM_API_INTEGRATION');
const { AIContentGenerator } = require('./AI_CONTENT_GENERATOR_SOCIAL_MEDIA');
const { AutomatedPostingScheduler } = require('./AUTOMATED_POSTING_SCHEDULER');

class CompleteSocialMediaSystem {
    constructor(config = {}) {
        // Initialize platform clients
        this.twitterClient = new TwitterAPIClient({
            apiKey: process.env.TWITTER_API_KEY,
            apiSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
        });

        this.instagramClient = new InstagramAPIClient({
            accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
            accountId: process.env.INSTAGRAM_ACCOUNT_ID
        });

        // Initialize AI content generator
        this.aiContentGenerator = new AIContentGenerator(null); // TODO: Connect AI framework

        // Initialize scheduler
        this.scheduler = new AutomatedPostingScheduler(config.scheduler);

        // Profile database (load from config or database)
        this.profiles = config.profiles || this.loadProfiles();

        console.log('✅ Complete Social Media System initialized');
        console.log(`   Profiles loaded: ${this.profiles.length}`);
    }

    /**
     * OPERATION JACK IN THE BOX - Full 150-profile deployment
     * @param {string} content - Original content to distribute
     * @param {object} options - Configuration options
     */
    async executeOperationJackInTheBox(content, options = {}) {
        const {
            platforms = ['twitter', 'instagram'],
            profileCount = this.profiles.length,
            variationsPerProfile = 1,
            immediate = false
        } = options;

        console.log('\n🎬 EXECUTING OPERATION JACK IN THE BOX');
        console.log(`   Content: "${content.substring(0, 50)}..."`);
        console.log(`   Platforms: ${platforms.join(', ')}`);
        console.log(`   Profiles: ${profileCount}`);
        console.log(`   Total posts: ${profileCount * platforms.length}\n`);

        // Step 1: Generate AI-powered content variations
        console.log('🤖 Step 1: Generating AI content variations...');

        const contentByPlatform = await this.aiContentGenerator.generateMultiPlatformContent(
            content,
            platforms,
            profileCount
        );

        // Step 2: Schedule posts for all profiles
        console.log('\n📅 Step 2: Scheduling posts across all profiles...');

        const scheduledPosts = [];
        const profilesToUse = this.profiles.slice(0, profileCount);

        for (let i = 0; i < profilesToUse.length; i++) {
            const profile = profilesToUse[i];

            for (const platform of platforms) {
                const variation = contentByPlatform[platform][i];

                const scheduledTime = immediate
                    ? new Date(Date.now() + (i * 5000)) // Immediate with 5s stagger
                    : this.scheduler.getNextOptimalTime(platform);

                const postId = this.scheduler.schedulePost({
                    platform: platform,
                    profileId: profile.id,
                    content: variation.text,
                    metadata: {
                        operationJackInTheBox: true,
                        profileUsername: profile.username,
                        variationIndex: variation.variationIndex
                    }
                });

                scheduledPosts.push(postId);
            }

            // Progress indicator
            if ((i + 1) % 10 === 0) {
                console.log(`   ✓ Scheduled ${i + 1}/${profilesToUse.length} profiles`);
            }
        }

        console.log(`\n✅ Operation Jack in the Box setup complete`);
        console.log(`   Total posts scheduled: ${scheduledPosts.length}`);

        // Step 3: Start scheduler if not running
        if (!this.scheduler.isRunning) {
            console.log('\n🚀 Starting automated scheduler...');
            this.scheduler.start();
        }

        return {
            success: true,
            totalPosts: scheduledPosts.length,
            platforms: platforms,
            profiles: profileCount,
            postIds: scheduledPosts,
            queueStatus: this.scheduler.getQueueStatus()
        };
    }

    /**
     * Post to single platform immediately
     */
    async postImmediately(content, platform, profiles = []) {
        console.log(`\n📤 Posting to ${platform} immediately...`);

        const profilesToUse = profiles.length > 0
            ? profiles
            : this.profiles.slice(0, 5); // Default: first 5 profiles

        // Generate variations
        const variations = await this.aiContentGenerator.generateVariations(
            content,
            platform,
            profilesToUse.length
        );

        const results = [];

        for (let i = 0; i < profilesToUse.length; i++) {
            const profile = profilesToUse[i];
            const variation = variations[i];

            try {
                let result;

                if (platform === 'twitter') {
                    result = await this.twitterClient.postTweet(variation.text);
                } else if (platform === 'instagram') {
                    // Instagram requires media URL
                    console.log(`⚠️  Instagram posting requires media URL - skipping for immediate post`);
                    continue;
                }

                results.push({
                    success: true,
                    profile: profile.username,
                    platform: platform,
                    url: result.url
                });

                console.log(`   ✅ Posted to @${profile.username}`);

                // Stagger posts
                await this.sleep(5000);

            } catch (error) {
                results.push({
                    success: false,
                    profile: profile.username,
                    platform: platform,
                    error: error.message
                });

                console.log(`   ❌ Failed for @${profile.username}: ${error.message}`);
            }
        }

        return results;
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            profiles: {
                total: this.profiles.length,
                active: this.profiles.filter(p => p.status === 'active').length
            },
            scheduler: this.scheduler.getQueueStatus(),
            analytics: this.scheduler.getAnalytics(),
            platforms: {
                twitter: this.twitterClient.getStats(),
                instagram: this.instagramClient.getStats()
            },
            rateLimits: {
                twitter: this.twitterClient.getRateLimit(),
                instagram: this.instagramClient.getRateLimit()
            }
        };
    }

    /**
     * Stop all operations
     */
    stop() {
        console.log('🛑 Stopping social media system...');
        this.scheduler.stop();
        console.log('✅ System stopped');
    }

    /**
     * Load profiles (mock for now)
     * @private
     */
    loadProfiles() {
        // In production, load from database
        const mockProfiles = [];

        for (let i = 1; i <= 150; i++) {
            mockProfiles.push({
                id: i,
                username: `profile_${i}`,
                platform: i % 2 === 0 ? 'twitter' : 'instagram',
                status: 'active'
            });
        }

        return mockProfiles;
    }

    /**
     * Sleep utility
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== COMPLETE SYSTEM DEMO =====

async function demonstrateCompleteSystem() {
    console.log('🚀 COMPLETE SOCIAL MEDIA AUTOMATION SYSTEM - DEMO\n');
    console.log('This demonstrates the full integration of:');
    console.log('  - Twitter API');
    console.log('  - Instagram API');
    console.log('  - AI Content Generator');
    console.log('  - Automated Scheduler');
    console.log('  - Multi-profile orchestration\n');

    const system = new CompleteSocialMediaSystem({
        scheduler: {
            maxConcurrentPosts: 5,
            staggerDelay: 3000
        }
    });

    // Demo: Operation Jack in the Box
    console.log('═══════════════════════════════════════════════════════');
    console.log('DEMO: OPERATION JACK IN THE BOX');
    console.log('═══════════════════════════════════════════════════════\n');

    const result = await system.executeOperationJackInTheBox(
        'We just launched an amazing new social media automation tool that works across all platforms!',
        {
            platforms: ['twitter', 'instagram'],
            profileCount: 10, // Test with 10 profiles
            immediate: true // Post immediately for demo
        }
    );

    console.log('\n📊 Operation Results:');
    console.log(`   Total posts scheduled: ${result.totalPosts}`);
    console.log(`   Platforms: ${result.platforms.join(', ')}`);
    console.log(`   Profiles: ${result.profiles}`);

    // Let scheduler process
    await system.sleep(15000);

    // Show system status
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('SYSTEM STATUS');
    console.log('═══════════════════════════════════════════════════════\n');

    const status = system.getStatus();

    console.log('Profiles:', status.profiles);
    console.log('\nScheduler:', status.scheduler);
    console.log('\nPlatform Stats:');
    console.log('  Twitter:', status.platforms.twitter);
    console.log('  Instagram:', status.platforms.instagram);
    console.log('\nRate Limits:');
    console.log('  Twitter:', status.rateLimits.twitter);
    console.log('  Instagram:', status.rateLimits.instagram);

    // Stop system
    system.stop();

    console.log('\n✅ Complete system demonstration finished!');
    console.log('\n🎯 READY FOR PRODUCTION:');
    console.log('  1. Add real API credentials to environment variables');
    console.log('  2. Connect to production database for profile management');
    console.log('  3. Deploy scheduler as background service');
    console.log('  4. Monitor via dashboard (COCKPIT_LIVE_SERVER.js)');
    console.log('  5. Scale to 150 profiles across all platforms\n');
}

module.exports = {
    CompleteSocialMediaSystem,
    demonstrateCompleteSystem
};

// Run demo if executed directly
if (require.main === module) {
    demonstrateCompleteSystem().catch(console.error);
}
