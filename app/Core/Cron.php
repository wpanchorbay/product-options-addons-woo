<?php
/**
 * Cron Job management — Handling scheduled tasks and self-healing fallbacks.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */

namespace SmartProductOptionsAddons\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Cron job management for the plugin.
 *
 * Uses WP-Cron as the primary scheduler with a self-healing fallback
 * that detects missed/overdue events and runs them inline on `init`.
 * No custom database tables are used — all state lives in WP transients
 * and the built-in WP-Cron system.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */
class Cron {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @access private
	 * @var Cron
	 */
	private static $instance = null;

	/**
	 * Prefix for all cron hook names.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	const HOOK_PREFIX = 'smart_product_options_addons_cron_';

	/**
	 * Option key that stores the last-run timestamps for fallback detection.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	const LAST_RUN_OPTION = 'smart_product_options_addons_cron_last_run';

	/**
	 * Registry of dynamically scheduled callbacks.
	 *
	 * Maps hook names to callables so the fallback system can
	 * execute them even if they were registered at runtime.
	 *
	 * @since 1.0.0
	 * @access private
	 * @var array<string, callable>
	 */
	private $dynamic_callbacks = array();

	/**
	 * Number of days to retain log files.
	 *
	 * @since 1.0.0
	 * @var int
	 */
	const LOG_RETENTION_DAYS = 30;

	/**
	 * Grace period (in seconds) before a missed job triggers the fallback.
	 *
	 * @since 1.0.0
	 * @var int
	 */
	const MISSED_GRACE = 300; // 5 minutes

	/**
	 * Gets a single instance of the class.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return Cron
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor for singleton.
	 *
	 * @since 1.0.0
	 * @access private
	 */
	private function __construct() {}

	/**
	 * Returns the list of cron jobs managed by this plugin.
	 *
	 * Each entry: [ 'hook' => string, 'interval' => string, 'callback' => string ]
	 * The 'interval' must match a registered WP-Cron schedule (e.g. 'daily', 'hourly').
	 *
	 * @since 1.0.0
	 * @access public
	 * @return array
	 */
	public function get_jobs() {
		/**
		 * Filters the list of cron jobs registered by the plugin.
		 *
		 * @since 1.0.0
		 * @hook smart_product_options_addons_cron_jobs
		 * @param array $jobs The array of cron job definitions.
		 * @return array
		 */
		return apply_filters(
			'smart_product_options_addons_cron_jobs',
			array()
		);
	}

	/**
	 * Schedule all plugin cron events if they are not already scheduled.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function schedule_events() {
		$jobs = $this->get_jobs();
		foreach ( $jobs as $job ) {
			if ( ! wp_next_scheduled( $job['hook'] ) ) {
				wp_schedule_event( time(), $job['interval'], $job['hook'] );
			}
		}
	}

	/**
	 * Self-healing fallback: detect overdue cron events and run them inline.
	 *
	 * If WP-Cron hasn't fired (e.g. low-traffic site with DISABLE_WP_CRON),
	 * this method checks whether any scheduled event is overdue and, if so,
	 * executes it directly during the current request.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function maybe_run_missed() {
		$crons = _get_cron_array();
		if ( ! is_array( $crons ) ) {
			return;
		}

		$now       = time();
		$intervals = wp_get_schedules();

		foreach ( $crons as $timestamp => $hooks ) {
			if ( $timestamp > $now ) {
				// Future events. Since it's sorted, we can safely stop here.
				break;
			}

			foreach ( $hooks as $hook => $events ) {
				// Only handle our own plugin hooks.
				if ( strpos( $hook, 'smart_product_options_addons_' ) !== 0 ) {
					continue;
				}

				foreach ( $events as $sig => $details ) {
					// We've found an overdue plugin job. Run it now!
					// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Hook is verified to have prefix at line 188.
					do_action_ref_array( $hook, $details['args'] );

					// Re-schedule for next interval if it's recurring.
					if ( ! empty( $details['schedule'] ) ) {
						$interval_seconds = isset( $intervals[ $details['schedule'] ]['interval'] )
							? (int) $intervals[ $details['schedule'] ]['interval']
							: DAY_IN_SECONDS;

						wp_unschedule_event( $timestamp, $hook, $details['args'] );
						wp_schedule_event( $now + $interval_seconds, $details['schedule'], $hook, $details['args'] );
					} else {
						// Single event. Just remove it.
						wp_unschedule_event( $timestamp, $hook, $details['args'] );
					}
				}
			}
		}
	}

	// ------------------------------------------------------------------
	// Dynamic Scheduling API
	// ------------------------------------------------------------------

	/**
	 * Schedule a one-time cron event.
	 *
	 * All one-time cron scheduling in the plugin should go through this
	 * method so that the self-healing fallback can pick it up.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string   $hook     The action hook name (will be auto-prefixed if needed).
	 * @param int      $delay    Delay in seconds from now.
	 * @param callable $callback The function/method to run.
	 * @param array    $args     Optional args to pass to the callback.
	 * @return bool Whether the event was newly scheduled.
	 */
	public function schedule_single( $hook, $delay, $callback, $args = array() ) {
		$hook = $this->maybe_prefix_hook( $hook );

		// Register the callback so WP (and our fallback) can execute it.
		if ( ! has_action( $hook ) ) {
			add_action( $hook, $callback );
		}
		$this->dynamic_callbacks[ $hook ] = $callback;

		// Don't double-schedule.
		if ( wp_next_scheduled( $hook, $args ) ) {
			return false;
		}

		$scheduled = wp_schedule_single_event( time() + $delay, $hook, $args );
		smart_product_options_addons_log( 'Cron: scheduled single event "' . $hook . '" to run in ' . $delay . 's.', 'INFO' );
		return (bool) $scheduled;
	}

	/**
	 * Schedule a recurring cron event.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string   $hook     The action hook name (will be auto-prefixed if needed).
	 * @param string   $interval A registered WP-Cron recurrence (e.g. 'hourly', 'daily').
	 * @param callable $callback The function/method to run.
	 * @param array    $args     Optional args to pass to the callback.
	 * @return bool Whether the event was newly scheduled.
	 */
	public function schedule_recurring( $hook, $interval, $callback, $args = array() ) {
		$hook = $this->maybe_prefix_hook( $hook );

		if ( ! has_action( $hook ) ) {
			add_action( $hook, $callback );
		}
		$this->dynamic_callbacks[ $hook ] = $callback;

		if ( wp_next_scheduled( $hook, $args ) ) {
			return false;
		}

		$scheduled = wp_schedule_event( time(), $interval, $hook, $args );
		smart_product_options_addons_log( 'Cron: scheduled recurring event "' . $hook . '" with interval "' . $interval . '".', 'INFO' );
		return (bool) $scheduled;
	}

	/**
	 * Unschedule a specific cron event by hook name.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string $hook The action hook name (will be auto-prefixed if needed).
	 * @param array  $args Optional args that were used when scheduling.
	 * @return void
	 */
	public function unschedule( $hook, $args = array() ) {
		$hook      = $this->maybe_prefix_hook( $hook );
		$timestamp = wp_next_scheduled( $hook, $args );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, $hook, $args );
		}
		unset( $this->dynamic_callbacks[ $hook ] );
	}

	/**
	 * Auto-prefix a hook name with the plugin prefix if it doesn't already have it.
	 *
	 * @since 1.0.0
	 * @access private
	 * @param string $hook The hook name.
	 * @return string
	 */
	private function maybe_prefix_hook( $hook ) {
		if ( strpos( $hook, 'smart_product_options_addons_' ) !== 0 ) {
			$hook = 'smart_product_options_addons_' . $hook;
		}
		return $hook;
	}

	/**
	 * Unschedule all plugin cron events.
	 *
	 * Should be called during plugin deactivation.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function unschedule_all() {
		$jobs = $this->get_jobs();
		foreach ( $jobs as $job ) {
			$timestamp = wp_next_scheduled( $job['hook'] );
			if ( $timestamp ) {
				wp_unschedule_event( $timestamp, $job['hook'] );
			}
		}

		// Also clear any dynamically scheduled events.
		foreach ( array_keys( $this->dynamic_callbacks ) as $hook ) {
			$timestamp = wp_next_scheduled( $hook );
			if ( $timestamp ) {
				wp_unschedule_event( $timestamp, $hook );
			}
		}
		$this->dynamic_callbacks = array();

		delete_option( self::LAST_RUN_OPTION );
	}

	// ------------------------------------------------------------------
	// Cron Job Callbacks
	// ------------------------------------------------------------------



	/**
	 * Test job callback.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function test_job() {
		smart_product_options_addons_log( 'Test cron job executed successfully.', 'ERROR' );
	}

	// ------------------------------------------------------------------
	// Helpers
	// ------------------------------------------------------------------



	/**
	 * Record the last-run timestamp for a job.
	 *
	 * @since 1.0.0
	 * @access private
	 * @param string $job_name The callback name of the job.
	 * @return void
	 */
	private function record_last_run( $job_name ) {
		$last_runs              = get_option( self::LAST_RUN_OPTION, array() );
		$last_runs[ $job_name ] = time();
		update_option( self::LAST_RUN_OPTION, $last_runs );
	}

	/**
	 * Register the hooks for the cron system.
	 *
	 * @since 1.0.0
	 * @param \SmartProductOptionsAddons\Core\Plugin $plugin The Plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();

		// Schedule events on init.
		$loader->add_action( 'init', $this, 'schedule_events' );

		// Self-healing: check for missed events on every request.
		$loader->add_action( 'init', $this, 'maybe_run_missed', 20 );

		// Register the actual cron callbacks.
		$jobs = $this->get_jobs();
		foreach ( $jobs as $job ) {
			add_action( $job['hook'], array( $this, $job['callback'] ) );
		}

		// Register the test cron callback.
		add_action( 'smart_product_options_addons_test_cron', array( $this, 'test_job' ) );
	}
}
