import React, { useState, useEffect, useCallback } from 'react';
import './CaviaTracker.css';

const CAVIA_NODE_DETAILS_MAP = {
  SolNode716: {
    name: 'Nex (Exterminate)',
    level: '55-60',
    standingNormal: '1,000',
    standingSteelPath: '1,500'
  },
  SolNode717: {
    name: 'Persto (Survival)',
    level: '65-70',
    standingNormal: '2,000',
    standingSteelPath: '3,000'
  },
  SolNode721: {
    name: 'Armatus (Disruption)',
    level: '75-80',
    standingNormal: '3,000',
    standingSteelPath: '4,500'
  },
  SolNode719: {
    name: 'Munio (Mirror Defense)',
    level: '95-100',
    standingNormal: '4,000',
    standingSteelPath: '6,000'
  },
  SolNode718: {
    name: 'Cambire (Alchemy)',
    level: '115-120',
    standingNormal: '5,000',
    standingSteelPath: '7,500'
  }
};

const HEX_NODE_DETAILS_MAP = {
  SolNode850: {
    name: 'Legacyte Harvest (Shell Cracker)',
    level: '65-70',
    standingNormal: '3,000',
    standingSteelPath: '4,500'
  },
  SolNode852: {
    name: 'Techrot Survival',
    level: '65-70',
    standingNormal: '1,000',
    standingSteelPath: '1,500'
  },
  SolNode853: {
    name: 'Scaldra Exterminate',
    level: '65-70',
    standingNormal: '2,000',
    standingSteelPath: '3,000'
  }
};

const MISSION_TYPE_MAP = {
  MT_DEFENSE: 'Mirror Defense',
  MT_ARTIFACT: 'Disruption / Alchemy',
  MT_ASSASSINATION: 'Assassination',
  MT_ENDLESS_CAPTURE: 'Survival / Capture',
};

const CHALLENGE_FALLBACK_MAP = {
  EntratiLabLootCratesChallenge: 'Find 3 Murmur Sarcophages',
  EntratiLabDestroyDecorationChallenge: 'Destroy 50 decorations',
  EntratiLabDefenseActivatePillarChallenge: 'Activate 2 Defenses with Vosphene Glyphs',
  EntratiLabDefenseActivatePillarHardChallenge: 'Activate 2 Defenses with Vosphene Glyphs',
  EntratiLabDefeatDoppelgangerChallenge: 'Defeat the Mocking or Scathing Whisper',
  EntratiLabSixMinuteChallenge: 'Complete this Bounty in 6 Minutes',
  EntratiLabSummonNecramechChallenge: 'Summon a Necramech',
  EntratiLabKillVialedEnemyChallenge: 'Douse 30 enemies with Vitriol',
  EntratiLabKillMurmurHardChallenge: 'Eliminate 200 Murmur enemies',
  EntratiLabKillMurmurChallenge: 'Eliminate 150 Murmur enemies',
  EntratiLabKillVoidRigEasyChallenge: 'Eliminate 2 Rogue Voidrigs',
  EntratiLabKillVoidRigChallenge: 'Eliminate 2 Rogue Voidrigs',
  EntratiLabRangedMechWeakpointChallenge: 'Destroy 6 Culverin weak points',
  EntratiLabCollectTearsChallenge: 'Collect 3 Murmur Eyes',
  EntratiLabDestroyDemolystLimbsChallenge: 'Destroy 4 Demolisher limbs',
  EntratiLabActivateConduitsQuickChallenge: 'Activate 2 Conduits in 30s',
  EntratiLabActivateLohkSurgeChallenge: 'Activate 2 Lohk Surges',
  VaniaShellCracker: 'Shell Cracker',
  VaniaSafeCracker: 'Find and open the Techrot cache',
  VaniaDestroyVehiclesEasy: 'Destroy Vehicles',
  VaniaDestroyPropsEasy: 'Destroy Props',
  VaniaDestroyBackpacksNormal: 'Destroy Techrot Backpacks',
  VaniaDestroyHazardsHard: 'Destroy Environmental Hazards',
  VaniaExplodingInfested: 'Defeat Exploding Infested',
  LichVaniaExplodingInfested: 'Defeat Exploding Infested'
};


const VARIABLE_NAME_FALLBACK = {
  ChannelDrain: 'Channel Drain',
  VoidEnergyOverload: 'Ability Overload',
  Starvation: 'Ammo Deficit',
  Framecurse: 'Framecurse Syndrome'
};

const VARIABLE_DESC_FALLBACK = {
  ChannelDrain: 'Active Channeled Abilities drain an additional 2 Energy/s.',
  VoidEnergyOverload: 'Using an ability opens a void rift nearby',
  Starvation: 'Ammo restored by drops and gear is reduced 75%.',
  Framecurse: 'Activating an Ability inflicts 50 damage upon you.',
  Armorless: 'Warframe Armor is reduced to 0.',
  DullBlades: 'Melee weapon damage is reduced by 75%.',
  NoPets: 'Companions are disabled during the mission.'
};

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const CAVIA_TIERS = [
  { level: '55-60', normal: '1,000', sp: '1,500' },
  { level: '65-70', normal: '2,000', sp: '3,000' },
  { level: '75-80', normal: '3,000', sp: '4,500' },
  { level: '95-100', normal: '4,000', sp: '6,000' },
  { level: '115-120', normal: '5,000', sp: '7,500' }
];

function getNodeDetails(nodeId, regions = {}, dict = {}, syndicate = 'cavia', bountyIndex = null) {
  const node = regions[nodeId];
  if (!node) {
    const fallback = CAVIA_NODE_DETAILS_MAP[nodeId] || HEX_NODE_DETAILS_MAP[nodeId] || {
      name: nodeId,
      level: '55-60',
      standingNormal: '1,000',
      standingSteelPath: '1,500'
    };
    return fallback;
  }

  const baseName = dict[node.name] || nodeId;
  const missionName = dict[node.missionName];
  const isSpecialHex = ['SolNode850', 'SolNode853', 'SolNode854', 'SolNode856'].includes(nodeId);
  const displayName = missionName && !isSpecialHex
    ? `${baseName} (${toTitleCase(missionName)})`
    : baseName;

  // For Cavia bounties, the level tier & standing are defined by its slot/tier position in the bounty list:
  // Slot 0 = 55-60, Slot 1 = 65-70, Slot 2 = 75-80, Slot 3 = 95-100, Slot 4 = 115-120
  if (syndicate === 'cavia') {
    const tier = (bountyIndex != null && CAVIA_TIERS[bountyIndex])
      ? CAVIA_TIERS[bountyIndex]
      : (CAVIA_TIERS[CAVIA_NODE_DETAILS_MAP[nodeId]?.tier || 0] || CAVIA_TIERS[0]);

    return {
      name: displayName,
      level: tier.level,
      standingNormal: tier.normal,
      standingSteelPath: tier.sp
    };
  }

  // Hex bounties (e.g. Legacyte Harvest Shell Cracker)
  const minLevel = Number(node.minEnemyLevel) || 65;
  const maxLevel = Number(node.maxEnemyLevel) || 70;
  return {
    name: displayName,
    level: `${minLevel}-${maxLevel}`,
    standingNormal: '3,000',
    standingSteelPath: '4,500'
  };
}

function formatChallenge(challengeId, challenges = {}, dict = {}) {
  if (!challengeId) return 'Special Objective';
  const ch = challenges[challengeId];
  if (ch) {
    const rawDesc = dict[ch.description];
    if (rawDesc) {
      const lastLine = rawDesc.split('\r\n').pop().split('\n').pop();
      const count = ch.requiredCount != null ? ch.requiredCount.toString() : '';
      return lastLine
        .replace(/\|OPEN_COLOR\|.*?\|CLOSE_COLOR\|\s*/gi, '')
        .replace(/\|COUNT\|\s*/g, count ? `${count} ` : '')
        .replace(/\|[A-Z_]+\|/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (dict[ch.name]) return dict[ch.name];
  }

  // Fallback to static resolution if challenge export not loaded yet
  const lastPart = challengeId.split('/').pop();
  if (CHALLENGE_FALLBACK_MAP[lastPart]) return CHALLENGE_FALLBACK_MAP[lastPart];
  return lastPart
    .replace(/^EntratiLab/, '')
    .replace(/^LichVania/, '')
    .replace(/^Vania/, '')
    .replace(/Challenge$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function formatCountdown(expiryMs) {
  if (!expiryMs) return '--:--:--';
  const diff = Math.max(0, expiryMs - Date.now());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h remaining`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function CaviaTracker() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isArchimedeaCollapsed, setIsArchimedeaCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [bountyData, setBountyData] = useState(null);
  const [deepArchimedea, setDeepArchimedea] = useState(null);
  const [dictionary, setDictionary] = useState({});
  const [regionsData, setRegionsData] = useState({});
  const [challengesData, setChallengesData] = useState({});
  const [, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        worldStateRes,
        bountyRes,
        oracleDictRes,
        exportPlusDictRes,
        regionsRes,
        challengesRes
      ] = await Promise.all([
        fetch('https://oracle.browse.wf/worldState.min.json').then(r => r.ok ? r.json() : null),
        fetch('https://oracle.browse.wf/bounty-cycle').then(r => r.ok ? r.json() : null),
        fetch('https://oracle.browse.wf/dicts/en.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch('https://browse.wf/warframe-public-export-plus/dict.en.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch('https://browse.wf/warframe-public-export-plus/ExportRegions.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch('https://browse.wf/warframe-public-export-plus/ExportChallenges.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
      ]);

      setDictionary({ ...(exportPlusDictRes || {}), ...(oracleDictRes || {}) });
      if (regionsRes) setRegionsData(regionsRes);
      if (challengesRes) setChallengesData(challengesRes);

      if (bountyRes) {
        setBountyData(bountyRes);
      }

      if (worldStateRes && worldStateRes.Conquests) {
        const labConquest = worldStateRes.Conquests.find(c => c.Type === 'CT_LAB');
        setDeepArchimedea(labConquest || null);
      }
    } catch (err) {
      console.error('Failed to fetch bounty data:', err);
      setError('Unable to load bounty data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // 60s auto refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const bountyExpiry = bountyData?.expiry || 0;
  const archimedeaDate = deepArchimedea?.Expiry?.['$date'];
  const archimedeaExpiry = typeof archimedeaDate === 'object' 
    ? Number(archimedeaDate['$numberLong']) 
    : Number(archimedeaDate || 0);

  const formatDictName = (key, type) => {
    if (!key) return '';
    if (type === 'deviation') {
      return dictionary['/Lotus/Language/Conquest/MissionVariant_LabConquest_' + key] ||
             dictionary['/Lotus/Language/Conquest/MissionVariant_HexConquest_' + key] ||
             dictionary['/Lotus/Language/Conquest/Deviation_' + key] ||
             dictionary[key] ||
             key.replace(/([A-Z])/g, ' $1').trim();
    }
    if (type === 'risk') {
      return dictionary['/Lotus/Language/Conquest/Condition_' + key] ||
             dictionary[key] ||
             key.replace(/([A-Z])/g, ' $1').trim();
    }
    if (type === 'variable') {
      return dictionary['/Lotus/Language/Conquest/PersonalMod_' + key] ||
             dictionary['/Lotus/Language/Conquest/Variable_' + key] ||
             VARIABLE_NAME_FALLBACK[key] ||
             dictionary[key] ||
             key.replace(/([A-Z])/g, ' $1').trim();
    }
    return key;
  };

  const formatDictDesc = (key, type) => {
    if (!key) return '';
    if (type === 'deviation') {
      return dictionary['/Lotus/Language/Conquest/MissionVariant_LabConquest_' + key + '_Desc'] ||
             dictionary['/Lotus/Language/Conquest/MissionVariant_HexConquest_' + key + '_Desc'] ||
             dictionary['/Lotus/Language/Conquest/Deviation_' + key + '_Desc'] || '';
    }
    if (type === 'risk') {
      return dictionary['/Lotus/Language/Conquest/Condition_' + key + '_Desc'] || '';
    }
    if (type === 'variable') {
      return dictionary['/Lotus/Language/Conquest/PersonalMod_' + key + '_Desc'] ||
             dictionary['/Lotus/Language/Conquest/Variable_' + key + '_Desc'] ||
             VARIABLE_DESC_FALLBACK[key] || '';
    }
    return '';
  };

  return (
    <div className="task-card cavia-tracker-card">
      <div className="cavia-header">
        <h2 onClick={() => setIsCollapsed(!isCollapsed)} className="cavia-title">
          <span>{isCollapsed ? '▶' : '▼'} 📜 Bounties</span>
          <span className="cavia-timer main-timer" title="Bounty reset countdown">
            ⏱️ {formatCountdown(bountyExpiry)}
          </span>
        </h2>
        <div className="cavia-header-actions">
          <button 
            className="cavia-refresh-btn icon-btn" 
            onClick={fetchData} 
            title="Refresh Bounty Data"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="cavia-content">
          {error && <div className="cavia-error">{error}</div>}

          <div className="cavia-bounties-row">
            {/* Section 1: Cavia Bounties */}
            <div className="cavia-section">
              <div className="cavia-section-header">
                <span className="cavia-section-title">Cavia Bounties</span>
              </div>

              {bountyData?.bounties?.EntratiLabSyndicate ? (
                <ul className="cavia-bounty-list">
                  {bountyData.bounties.EntratiLabSyndicate
                    .map((item, originalIndex) => ({ item, originalIndex }))
                    .filter(({ item }) => {
                      const details = getNodeDetails(item.node, regionsData, dictionary);
                      return details.name.toLowerCase().includes('exterminate') || item.node === 'SolNode716';
                    })
                    .map(({ item, originalIndex }, idx) => {
                      const details = getNodeDetails(item.node, regionsData, dictionary, 'cavia', originalIndex);
                      return (
                        <li key={idx} className="cavia-bounty-item">
                          <div className="cavia-bounty-main">
                            <div className="cavia-node-row">
                              <span className="cavia-node-name">{details.name}</span>
                              <span className="cavia-level-tag">Lvl {details.level}</span>
                            </div>
                            <span className="cavia-challenge-desc">
                              {formatChallenge(item.challenge, challengesData, dictionary)}
                            </span>
                          </div>
                          <div className="cavia-standing-row">
                            <span className="cavia-standing-pill normal" title="Normal Mode Standing">
                              💎 {details.standingNormal}
                            </span>
                            <span className="cavia-standing-pill steel-path" title="Steel Path Standing">
                              ⚔️ {details.standingSteelPath} SP
                            </span>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <div className="cavia-muted">{loading ? 'Loading Cavia bounties...' : 'No active Cavia bounties found.'}</div>
              )}
            </div>

            {/* Section 2: Hex Bounties */}
            <div className="cavia-section">
              <div className="cavia-section-header">
                <span className="cavia-section-title">Hex Bounties</span>
              </div>

              {(() => {
                const filteredHex = (bountyData?.bounties?.HexSyndicate || []).filter((item) => {
                  const isLegacyteHarvest = item.node === 'SolNode850';
                  const challengeText = formatChallenge(item.challenge, challengesData, dictionary).toLowerCase();
                  const isShellCracker = challengeText.includes('safecracker') ||
                                         challengeText.includes('shell cracker') ||
                                         challengeText.includes('techrot cache') ||
                                         item.challenge.toLowerCase().includes('safecracker') ||
                                         item.challenge.toLowerCase().includes('shellcracker');
                  return isLegacyteHarvest && isShellCracker;
                });

                if (filteredHex.length > 0) {
                  return (
                    <ul className="cavia-bounty-list">
                      {filteredHex.map((item, idx) => {
                        const details = getNodeDetails(item.node, regionsData, dictionary, 'hex');
                        return (
                          <li key={idx} className="cavia-bounty-item">
                            <div className="cavia-bounty-main">
                              <div className="cavia-node-row">
                                <span className="cavia-node-name">{details.name}</span>
                                <span className="cavia-level-tag">Lvl {details.level}</span>
                              </div>
                              <span className="cavia-challenge-desc">
                                {formatChallenge(item.challenge, challengesData, dictionary)}
                              </span>
                            </div>
                            <div className="cavia-standing-row">
                              <span className="cavia-standing-pill normal" title="Normal Mode Standing">
                                💎 {details.standingNormal}
                              </span>
                              <span className="cavia-standing-pill steel-path" title="Steel Path Standing">
                                ⚔️ {details.standingSteelPath} SP
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                }

                return (
                  <div className="cavia-muted">
                    {loading ? 'Loading Hex bounties...' : 'No active Shell Cracker bounties currently.'}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Section 3: Deep Archimedea (Conquests) */}
          <div className="cavia-section">
            <div className="cavia-section-header">
              <span 
                className="cavia-section-title clickable" 
                onClick={() => setIsArchimedeaCollapsed(!isArchimedeaCollapsed)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                {isArchimedeaCollapsed ? '▶' : '▼'} Deep Archimedea (Weekly)
              </span>
              <span className="cavia-timer" title="Weekly reset countdown">
                ⏱️ {formatCountdown(archimedeaExpiry)}
              </span>
            </div>

            {!isArchimedeaCollapsed && (
              deepArchimedea ? (
                <div className="cavia-archimedea-body">
                  {deepArchimedea.Variables && deepArchimedea.Variables.length > 0 && (
                    <div className="cavia-variables">
                      <span className="cavia-sub-label">Frame Modifiers:</span>
                      <div className="cavia-tags">
                        {deepArchimedea.Variables.map((v, i) => {
                          const name = formatDictName(v, 'variable');
                          const desc = formatDictDesc(v, 'variable');
                          return (
                            <div key={i} className="cavia-item-with-desc">
                              <span className="cavia-tag variable-tag">{name}</span>
                              {desc && <div className="cavia-sub-desc">{desc}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="cavia-missions-list">
                    {deepArchimedea.Missions?.map((mission, idx) => (
                      <div key={idx} className="cavia-mission-card">
                        <div className="cavia-mission-title">
                          Stage {idx + 1}: {MISSION_TYPE_MAP[mission.missionType] || mission.missionType}
                        </div>

                        <div className="cavia-diff-row">
                          {mission.difficulties?.map((diff, dIdx) => {
                            const devName = formatDictName(diff.deviation, 'deviation');
                            const devDesc = formatDictDesc(diff.deviation, 'deviation');

                            return (
                              <div key={dIdx} className="cavia-diff-block">
                                <span className={`cavia-diff-badge ${diff.type === 'CD_HARD' ? 'hard' : 'normal'}`}>
                                  {diff.type === 'CD_HARD' ? 'Elite' : 'Normal'}
                                </span>
                                <div className="cavia-deviation-wrapper">
                                  <span className="cavia-deviation">
                                    Deviation: {devName}
                                  </span>
                                  {devDesc && <div className="cavia-sub-desc">{devDesc}</div>}
                                </div>

                                {diff.risks && diff.risks.length > 0 && (
                                  <div className="cavia-risks">
                                    {diff.risks.map((r, rIdx) => {
                                      const riskName = formatDictName(r, 'risk');
                                      const riskDesc = formatDictDesc(r, 'risk');
                                      return (
                                        <div key={rIdx} className="cavia-risk-item-wrapper">
                                          <span className="cavia-tag risk-tag">
                                            ⚠️ {riskName}
                                          </span>
                                          {riskDesc && <div className="cavia-sub-desc">{riskDesc}</div>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="cavia-muted">{loading ? 'Loading Deep Archimedea...' : 'No active Deep Archimedea season found.'}</div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
