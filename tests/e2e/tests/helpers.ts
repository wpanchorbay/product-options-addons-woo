import { Page, expect } from '@playwright/test';
import qit from '@woocommerce/qit-runtime';
import { TestLogger } from './test-logger';

export async function login(page: Page, log?: TestLogger) {
    await page.goto('/wp-admin/');
    
    if (page.url().includes('wp-login.php')) {
        let username = 'admin';
        let password = 'password';

        try {
            username = qit.env.wp.username;
            password = qit.env.wp.password;
            log?.info(`Using QIT credentials (user: ${username})`);
        } catch (e) {
            // Use defaults if QIT env vars are not set
            log?.info(`Using default credentials (user: ${username})`);
        }

        await page.fill('#user_login', username);
        await page.fill('#user_pass', password);
        await page.click('#wp-submit');
        await page.waitForLoadState('networkidle');
    }

    const bypassSetup = async () => {
        if (page.url().includes('setup-wizard') || page.url().includes('wc-setup') || page.url().includes('wc-admin')) {
            log?.warn('Detected WooCommerce Setup/Admin Wizard. Bypassing...');
            await page.goto('/wp-admin/index.php');
            return true;
        }
        return false;
    };

    await bypassSetup();

    await page.waitForSelector('#wpadminbar', { timeout: 45000 }).catch(async () => {
        if (await bypassSetup()) {
            await page.waitForSelector('#wpadminbar', { timeout: 30000 });
        } else {
            log?.error('Failed to reach dashboard', { url: page.url() });
            throw new Error('Failed to reach admin dashboard');
        }
    });

    log?.success('Logged in successfully');
}
