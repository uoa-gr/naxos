/**
 * ScaleRules - per-layer / per-entry scale-dependent visibility rules.
 *
 * A user can set a "show only when zoom is..." rule on any layer or any
 * legend entry within a layer. Rules persist in localStorage and override
 * the defaults declared in LayerConfig (entry.minZoom). LayerManager calls
 * `getEffective(layerId, entryIndex, defaultRule)` on every render and
 * zoom change to decide whether each feature is visible.
 *
 * Rule shape: { minZoom: number|null, maxZoom: number|null }
 *   - minZoom: feature is hidden when current zoom < minZoom
 *   - maxZoom: feature is hidden when current zoom > maxZoom
 *   - null on either field means "no constraint on that side"
 *
 * Storage key: 'naxos_scale_rules' -> JSON object:
 *   { 'layerId|entryIndex': { minZoom, maxZoom }, ... }
 *
 * Use a single key per (layerId, entryIndex) so iteration and lookup are
 * O(1) and there is no nested object plumbing.
 */

const STORAGE_KEY = 'naxos_scale_rules';

class ScaleRulesStore {
    constructor() {
        /** @type {Map<string, {minZoom: number|null, maxZoom: number|null}>} */
        this.overrides = new Map();
        /** @type {Set<Function>} listeners notified on any change */
        this.listeners = new Set();
        this._load();
    }

    /** Build the lookup key for a (layerId, entryIndex) pair. */
    _key(layerId, entryIndex) {
        return layerId + '|' + (entryIndex == null ? '*' : entryIndex);
    }

    /** Read persisted overrides from localStorage on construction. */
    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            for (const [k, v] of Object.entries(parsed)) {
                this.overrides.set(k, {
                    minZoom: typeof v.minZoom === 'number' ? v.minZoom : null,
                    maxZoom: typeof v.maxZoom === 'number' ? v.maxZoom : null,
                });
            }
        } catch (e) {
            console.warn('ScaleRules: failed to load overrides from localStorage', e);
        }
    }

    /** Persist current overrides back to localStorage. */
    _save() {
        const obj = {};
        for (const [k, v] of this.overrides) obj[k] = v;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.warn('ScaleRules: failed to persist overrides', e);
        }
    }

    /** Subscribe to change notifications. Returns an unsubscribe function. */
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    _notify() {
        for (const fn of this.listeners) {
            try { fn(); } catch (e) { console.error(e); }
        }
    }

    /**
     * Get the effective rule for an entry, merging the user's override
     * (if any) on top of the defaults from LayerConfig.
     *
     * @param {string} layerId
     * @param {number|null} entryIndex
     * @param {{minZoom?: number|null, maxZoom?: number|null}} defaults - from LayerConfig
     * @returns {{minZoom: number|null, maxZoom: number|null, source: 'user'|'default'|'none'}}
     */
    getEffective(layerId, entryIndex, defaults = {}) {
        const key = this._key(layerId, entryIndex);
        const override = this.overrides.get(key);
        if (override) {
            return {
                minZoom: override.minZoom,
                maxZoom: override.maxZoom,
                source: 'user',
            };
        }
        const defMin = (defaults && typeof defaults.minZoom === 'number') ? defaults.minZoom : null;
        const defMax = (defaults && typeof defaults.maxZoom === 'number') ? defaults.maxZoom : null;
        if (defMin == null && defMax == null) {
            return { minZoom: null, maxZoom: null, source: 'none' };
        }
        return { minZoom: defMin, maxZoom: defMax, source: 'default' };
    }

    /**
     * Test whether a feature should be visible at the given zoom level
     * given an effective rule (the result of `getEffective`).
     */
    static isVisibleAtZoom(rule, currentZoom) {
        if (!rule) return true;
        if (rule.minZoom != null && currentZoom < rule.minZoom) return false;
        if (rule.maxZoom != null && currentZoom > rule.maxZoom) return false;
        return true;
    }

    /**
     * Set a user override for a (layerId, entryIndex). Pass null to either
     * field to leave that side unconstrained. Setting both to null is the
     * same as calling reset().
     */
    set(layerId, entryIndex, { minZoom = null, maxZoom = null } = {}) {
        const key = this._key(layerId, entryIndex);
        if (minZoom == null && maxZoom == null) {
            this.overrides.delete(key);
        } else {
            this.overrides.set(key, { minZoom, maxZoom });
        }
        this._save();
        this._notify();
    }

    /** Remove the user override for a (layerId, entryIndex), restoring the default. */
    reset(layerId, entryIndex) {
        const key = this._key(layerId, entryIndex);
        if (this.overrides.has(key)) {
            this.overrides.delete(key);
            this._save();
            this._notify();
        }
    }

    /** Remove ALL user overrides. */
    resetAll() {
        if (this.overrides.size === 0) return;
        this.overrides.clear();
        this._save();
        this._notify();
    }

    /** Has the user explicitly overridden this entry? */
    hasOverride(layerId, entryIndex) {
        return this.overrides.has(this._key(layerId, entryIndex));
    }
}

// Singleton — there is only one rule store per page.
export const scaleRules = new ScaleRulesStore();
export { ScaleRulesStore };
