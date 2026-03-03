import { db } from "@/db/database";
import { extractDomain } from "@/db/utils";
import { getCachedTimer, getIntervalTimeSpent } from "./timers";

/**
 * Update declarativeNetRequest rules for blocked websites and timers
 */
export async function updateBlockingRules() {
  try {
    const blockedWebsites = await db.getAllBlockedWebsites();
    const timers = await db.getAllTimers();

    const rules: chrome.declarativeNetRequest.Rule[] = [];
    let ruleId = 1;

    // Add rules for blocked websites (parental controls)
    for (const blocked of blockedWebsites) {
      const pattern = blocked.urlPattern.toLowerCase();
      rules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            url: chrome.runtime.getURL(
              `blocked.html?reason=parental&domain=${encodeURIComponent(pattern)}`,
            ),
          },
        },
        condition: {
          urlFilter: `*${pattern}*`,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      });
    }

    // Add rules for timer-exceeded websites
    for (const timer of timers) {
      if (!timer.enabled) continue;

      const intervalHours = timer.intervalHours || 24;
      const effectiveTimeSpent = getIntervalTimeSpent(timer.domain, intervalHours);

      if (effectiveTimeSpent >= timer.timeLimit) {
        rules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
            redirect: {
              url: chrome.runtime.getURL(
                `blocked.html?reason=timer&domain=${encodeURIComponent(timer.domain)}&limit=${timer.timeLimit}&interval=${intervalHours}`,
              ),
            },
          },
          condition: {
            urlFilter: `*${timer.domain}*`,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
          },
        });
      }
    }

    // Remove all existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: rules,
    });

    console.log(`Clarity: Updated ${rules.length} blocking rules`);
  } catch (error) {
    console.error("Clarity: Error updating blocking rules", error);
  }
}

/**
 * Check if timer limit is exceeded for a domain and take action.
 * Immediately redirects the active tab to the block screen when limit is hit.
 */
export async function checkTimerLimit(
  domain: string,
  _timeSpent: number,
  sessionTabId: number | null,
) {
  const timer = getCachedTimer(domain);
  if (!timer || !timer.enabled) return;

  const intervalHours = timer.intervalHours || 24;
  const effectiveTimeSpent = getIntervalTimeSpent(domain, intervalHours);

  if (effectiveTimeSpent >= timer.timeLimit) {
    console.log(`Clarity: Timer limit exceeded for ${domain} (interval: ${intervalHours}h)`);
    await updateBlockingRules();

    // Immediately redirect the tab to the block page (don't reload — avoids
    // a race where the reload fires before the declarativeNetRequest rule lands)
    if (sessionTabId) {
      try {
        const tab = await chrome.tabs.get(sessionTabId);
        if (tab?.url && extractDomain(tab.url) === domain) {
          const blockedUrl = chrome.runtime.getURL(
            `blocked.html?reason=timer&domain=${encodeURIComponent(domain)}&limit=${timer.timeLimit}&interval=${intervalHours}`,
          );
          await chrome.tabs.update(sessionTabId, { url: blockedUrl });
        }
      } catch (error) {
        console.error("Clarity: Error redirecting tab after timer exceeded", error);
      }
    }
  }
}
