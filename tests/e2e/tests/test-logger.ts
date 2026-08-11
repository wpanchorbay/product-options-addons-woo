import { Page } from '@playwright/test';

// ─── ANSI Color Codes ────────────────────────────────────────────
const c = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m',
    white:   '\x1b[37m',
    gray:    '\x1b[90m',
    bgRed:   '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow:'\x1b[43m',
};

// ─── Circled step numbers ────────────────────────────────────────
const STEP_ICONS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];

function stepIcon(n: number): string {
    return n >= 1 && n <= 20 ? STEP_ICONS[n - 1] : `(${n})`;
}

// ─── Box drawing helpers ─────────────────────────────────────────
const BOX_WIDTH = 70;

function boxTop(): string {
    return `${c.cyan}┌${'─'.repeat(BOX_WIDTH)}┐${c.reset}`;
}

function boxBottom(): string {
    return `${c.cyan}└${'─'.repeat(BOX_WIDTH)}┘${c.reset}`;
}

function boxLine(text: string): string {
    // Strip ANSI for length calculation
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = Math.max(0, BOX_WIDTH - 2 - stripped.length);
    return `${c.cyan}│${c.reset} ${text}${' '.repeat(padding)}${c.cyan}│${c.reset}`;
}

function boxDivider(): string {
    return `${c.cyan}├${'─'.repeat(BOX_WIDTH)}┤${c.reset}`;
}

// ─── Table renderer ──────────────────────────────────────────────
function renderTable(headers: string[], rows: string[][]): string[] {
    const colCount = headers.length;
    const colWidths: number[] = headers.map(h => h.length);

    for (const row of rows) {
        for (let i = 0; i < colCount; i++) {
            const cellLen = (row[i] || '').length;
            if (cellLen > colWidths[i]) colWidths[i] = cellLen;
        }
    }

    const line = (char: string, left: string, mid: string, right: string) =>
        `  ${c.gray}${left}${colWidths.map(w => char.repeat(w + 2)).join(mid)}${right}${c.reset}`;

    const formatRow = (cells: string[], color = '') =>
        `  ${c.gray}│${c.reset}${cells.map((cell, i) => {
            const pad = ' '.repeat(Math.max(0, colWidths[i] - cell.length));
            return ` ${color}${cell}${color ? c.reset : ''}${pad} `;
        }).join(`${c.gray}│${c.reset}`)}${c.gray}│${c.reset}`;

    const output: string[] = [];
    output.push(line('─', '┌', '┬', '┐'));
    output.push(formatRow(headers, c.bold));
    output.push(line('─', '├', '┼', '┤'));
    for (const row of rows) {
        output.push(formatRow(row));
    }
    output.push(line('─', '└', '┴', '┘'));
    return output;
}

// ─── Timestamp helper ────────────────────────────────────────────
function timestamp(): string {
    return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

// ═════════════════════════════════════════════════════════════════
//  TestLogger — one instance per test
// ═════════════════════════════════════════════════════════════════
export class TestLogger {
    private file: string;
    private testName: string;
    private startTime: number = 0;
    private stepCount: number = 0;

    constructor(file: string, testName: string) {
        this.file = file;
        this.testName = testName;
    }

    // ── Lifecycle ────────────────────────────────────────────────

    /** Print a bordered header with test name and timestamp */
    start(): void {
        this.startTime = Date.now();
        console.log('');
        console.log(boxTop());
        console.log(boxLine(`${c.bold}${this.file}${c.reset} ${c.dim}›${c.reset} ${c.bold}${this.testName}${c.reset}`));
        console.log(boxLine(`${c.gray}Started: ${timestamp()}${c.reset}`));
        console.log(boxBottom());
        console.log('');
    }

    /** Print a summary footer with duration and status */
    end(status: 'passed' | 'failed' | 'skipped'): void {
        const duration = formatDuration(Date.now() - this.startTime);
        const statusMap = {
            passed:  `${c.bgGreen}${c.bold}${c.white} ✔ PASSED ${c.reset}`,
            failed:  `${c.bgRed}${c.bold}${c.white} ✖ FAILED ${c.reset}`,
            skipped: `${c.bgYellow}${c.bold}${c.white} ⊘ SKIPPED ${c.reset}`,
        };
        console.log('');
        console.log(boxTop());
        console.log(boxLine(`${statusMap[status]}  ${c.gray}(${duration})${c.reset}`));
        console.log(boxBottom());
        console.log('');
    }

    // ── Step Tracking ────────────────────────────────────────────

    /** Log a numbered step */
    step(n: number, description: string): void {
        this.stepCount = n;
        console.log(`  ${c.cyan}${stepIcon(n)}${c.reset} ${description}`);
    }

    // ── Status Messages ──────────────────────────────────────────

    info(message: string): void {
        console.log(`    ${c.blue}ℹ${c.reset} ${message}`);
    }

    success(message: string): void {
        console.log(`    ${c.green}✔${c.reset} ${message}`);
    }

    warn(message: string): void {
        console.log(`    ${c.yellow}⚠${c.reset} ${message}`);
    }

    error(message: string, details?: Record<string, string>): void {
        console.log(`    ${c.red}✖${c.reset} ${c.red}${message}${c.reset}`);
        if (details) {
            for (const [key, value] of Object.entries(details)) {
                console.log(`      ${c.gray}${key}:${c.reset} ${value}`);
            }
        }
    }

    // ── Dividers ─────────────────────────────────────────────────

    divider(label?: string): void {
        if (label) {
            const side = '─'.repeat(4);
            console.log(`\n  ${c.gray}${side} ${c.reset}${c.bold}${label}${c.reset}${c.gray} ${side}${c.reset}\n`);
        } else {
            console.log(`  ${c.gray}${'─'.repeat(50)}${c.reset}`);
        }
    }

    // ── Environment Table ────────────────────────────────────────

    env(vars: Record<string, string | boolean | undefined>): void {
        const rows = Object.entries(vars).map(([key, val]) => [key, String(val ?? 'undefined')]);
        const lines = renderTable(['Variable', 'Value'], rows);
        lines.forEach(l => console.log(l));
    }

    // ── ASCII Table ──────────────────────────────────────────────

    table(title: string, headers: string[], rows: string[][]): void {
        console.log(`\n  ${c.bold}${title}${c.reset}`);
        const lines = renderTable(headers, rows);
        lines.forEach(l => console.log(l));
    }

    // ── Page Snapshot ────────────────────────────────────────────

    /** Capture and log current page state — URL, viewport, key selectors */
    async snapshot(page: Page, label: string = 'snapshot'): Promise<void> {
        console.log(`\n  ${c.magenta}📸 Page Snapshot${c.reset} ${c.gray}[${label}]${c.reset}`);

        const url = page.url();
        const viewport = page.viewportSize();
        const title = await page.title().catch(() => '(unknown)');

        const rows: string[][] = [
            ['URL', url],
            ['Title', title.substring(0, 60)],
            ['Viewport', viewport ? `${viewport.width}x${viewport.height}` : 'null'],
        ];

        // Check a few common selectors that are useful for debugging
        const diagnosticSelectors = [
            { name: 'Admin Bar', selector: '#wpadminbar' },
            { name: 'WC Error', selector: '.woocommerce-error' },
            { name: 'WC Notice', selector: '.woocommerce-message' },
            { name: 'Block Overlay', selector: '.blockUI.blockOverlay' },
            { name: 'SPOA Fields', selector: '.opopw-field' },
        ];

        for (const { name, selector } of diagnosticSelectors) {
            const count = await page.locator(selector).count().catch(() => 0);
            if (count > 0) {
                rows.push([name, `visible (${count})`]);
            }
        }

        const lines = renderTable(['Property', 'Value'], rows);
        lines.forEach(l => console.log(l));
    }
}

// ═════════════════════════════════════════════════════════════════
//  Environment Diagnostics (for global-setup)
// ═════════════════════════════════════════════════════════════════
export function printEnvironmentDiagnostics(): void {
    console.log('');
    console.log(boxTop());
    console.log(boxLine(`${c.bold}SPOA E2E Test Suite — Environment Diagnostics${c.reset}`));
    console.log(boxBottom());

    const rows: string[][] = [
        ['WP_URL',       process.env.WP_URL || '(not set)'],
        ['CI',           process.env.CI || 'false'],
        ['Node',         process.version],
        ['OS',           `${process.platform} (${process.arch})`],
        ['Workers',      '1 (serial)'],
        ['Timestamp',    new Date().toISOString()],
    ];

    const lines = renderTable(['Property', 'Value'], rows);
    lines.forEach(l => console.log(l));
    console.log('');
}
