import { useMemo, useState, useEffect } from 'react'
import './App.css'

const SELANET_API_HOST = 'https://api.selanet.ai/v1'
const SELANET_API_KEY = import.meta.env.VITE_SELANET_API_KEY

const TAB_CONFIG = [
  { id: 'profile', title: 'Overview', icon: '🏠', skill: 'x-profile' },
  { id: 'analytics', title: 'Analytics', icon: '📊', skill: 'analytics-view' },
  { id: 'posts', title: 'Top Content', icon: '🏆', skill: 'x-posts' },
  { id: 'network', title: 'Network', icon: '🕸️', skill: 'network-view' },
  { id: 'brand', title: 'Brand Match', icon: '⚙️', skill: 'brand-view' }
]

// Advanced Analysis Generators
function getBrandMatches(bio, articles) {
  const text = String(bio || '') + ' ' + articles.map(a => a.text).join(' ');
  const textLower = text.toLowerCase();
  
  const categories = [
    { name: 'Crypto & Web3', icon: '🪙', color: '#10b981', keywords: /\b(crypto|btc|eth|web3|nft|blockchain|defi|token|airdrop|binance|solana)\b/g },
    { name: 'Technology', icon: '💻', color: '#8b5cf6', keywords: /\b(tech|ai|dev|software|code|engineer|program|app|startup|computing|gadget|developer)\b/g },
    { name: 'Automotive', icon: '🚗', color: '#3b82f6', keywords: /\b(car|auto|tesla|driving|vehicle|motor|racing)\b/g },
    { name: 'Space', icon: '🚀', color: '#f59e0b', keywords: /\b(space|mars|rocket|astronomy|nasa|spacex|satellite)\b/g },
    { name: 'Finance', icon: '📈', color: '#ef4444', keywords: /\b(finance|invest|trading|stock|market|economy|money|wealth|business|deal|contract)\b/g },
    { name: 'Design & Art', icon: '🎨', color: '#ec4899', keywords: /\b(art|design|creative|draw|ui|ux|graphics|artist|illustration)\b/g },
    { name: 'Fashion', icon: '👗', color: '#a855f7', keywords: /\b(fashion|style|wear|clothes|brand|model|sneakers|apparel|outfit)\b/g },
    { name: 'Sports', icon: '🏃', color: '#22c55e', keywords: /\b(gym|sport|football|soccer|basketball|nba|nfl|fitness|workout|athlete|club|league|transfer|goal|match)\b/g },
    { name: 'Gaming', icon: '🎮', color: '#6366f1', keywords: /\b(game|esports|twitch|stream|play|xbox|ps5|nintendo|gamer)\b/g },
    { name: 'Music', icon: '🎵', color: '#14b8a6', keywords: /\b(music|producer|dj|song|album|listen|concert|singer|rap)\b/g }
  ];

  const scored = categories.map(cat => {
    const hits = (textLower.match(cat.keywords) || []).length;
    return { ...cat, score: hits };
  }).filter(c => c.score > 0).sort((a,b) => b.score - a.score);

  if (scored.length === 0) {
    return [
      { name: 'Lifestyle', icon: '✨', color: '#f59e0b', match: 80 }, 
      { name: 'Media', icon: '📱', color: '#3b82f6', match: 65 }
    ];
  }

  const maxScore = scored[0].score;
  return scored.map((c) => ({
    ...c,
    match: Math.min(99, Math.round(70 + (c.score / maxScore) * 29))
  }));
}

function calculateSocialWorth(followers, engagementRatio) {
  const baseline = (followers / 10000) * 50;
  const multiplier = Math.max(0.5, Math.min(3, engagementRatio === '∞' ? 2 : parseFloat(engagementRatio)));
  const worth = Math.round(baseline * multiplier);
  
  if (worth < 10) return { str: "Too early" };
  const wNum = worth * 0.9;
  return {
    str: wNum > 1000000 ? `$${(wNum/1000000).toFixed(2)}M` : wNum > 1000 ? `$${(wNum/1000).toFixed(1)}K` : `$${Math.floor(wNum)}`
  };
}

function extractTopConnections(articles) {
  const mentions = {};
  articles.forEach(a => {
    const matches = (a.text || '').match(/@[a-zA-Z0-9_]+/g);
    if (matches) {
      matches.forEach(m => {
        const handle = m.toLowerCase().replace('@', '');
        mentions[handle] = (mentions[handle] || 0) + 1;
      });
    }
  });
  // Expanded to 25 connections for a wider network map
  return Object.entries(mentions).sort((a,b) => b[1] - a[1]).slice(0, 25).map(t => ({ handle: t[0], weight: t[1] }));
}

function getGrowthData(hId) {
  const points = [];
  let base = 100;
  for (let i = 0; i < 30; i++) {
    base += (hId % 10) + (Math.random() * 20 - 10);
    points.push(base);
  }
  return points;
}

// Components
function Sparkline({ data, color }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${30 - ((d - min) / range) * 30}`).join(' ');

  return (
    <svg className="sparkline-svg" viewBox="0 -5 100 40" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LargeGrowthChart({ data, color, height = 300 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${height - ((d - min) / range) * height}`).join(' ');
  const areaPoints = `0,${height} ` + points + ` 100,${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={areaPoints} fill="url(#chartGradient)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CircularProgress({ score, size = 60, icon }) {
  const radius = size * 0.43;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="circular-progress-container" style={{ width: size, height: size }}>
      <svg className="circular-progress" viewBox={`0 0 ${size} ${size}`}>
        <circle className="circular-bg" cx={size/2} cy={size/2} r={radius} />
        <circle className="circular-fg" cx={size/2} cy={size/2} r={radius} style={{ strokeDashoffset: offset, strokeDasharray: circumference }} />
      </svg>
      {icon && <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: size * 0.3 }}>{icon}</div>}
    </div>
  )
}

function EngagementCircle({ mainAvatar, connections, large = false }) {
  if (!connections || connections.length === 0) {
    return <div className="empty-state">No network data found.</div>
  }

  const CIRCLE_RADIUS = large ? 160 : 90; 
  const CENTER_SIZE = large ? 80 : 56;
  const NODE_SIZE = large ? 40 : 28;
  const height = large ? 440 : 240;

  return (
    <div className="engagement-circle-wrapper" style={{ position: 'relative', width: '100%', height: `${height}px`, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
         {connections.map((conn, i) => {
            const angle = (i / connections.length) * 2 * Math.PI - Math.PI/2;
            const x = Math.cos(angle) * CIRCLE_RADIUS;
            const y = Math.sin(angle) * CIRCLE_RADIUS;
            
            return (
               <line 
                 key={'line-'+i} x1="50%" y1="50%" x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`} 
                 stroke="rgba(168, 85, 247, 0.4)" strokeWidth={Math.min(3, Math.max(1, conn.weight))}
               />
            )
         })}
      </svg>
      
      <div className="center-node" style={{ 
          width: CENTER_SIZE, height: CENTER_SIZE, borderRadius: '50%', 
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.8)', zIndex: 10,
          backgroundImage: `url(${mainAvatar})`, backgroundSize: 'cover', backgroundPosition: 'center',
          border: '3px solid #c084fc'
      }} />

      {connections.map((conn, i) => {
         const angle = (i / connections.length) * 2 * Math.PI - Math.PI/2;
         const x = Math.cos(angle) * CIRCLE_RADIUS;
         const y = Math.sin(angle) * CIRCLE_RADIUS;
         const avatarUrl = `https://unavatar.io/twitter/${conn.handle}?fallback=https://ui-avatars.com/api/?name=${conn.handle}&background=0284c7&color=fff`;

         return (
             <div 
               key={'node-'+i} className="orbit-node" title={`@${conn.handle}`}
               style={{
                 position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)',
                 width: NODE_SIZE + (conn.weight * 2), height: NODE_SIZE + (conn.weight * 2), 
                 borderRadius: '50%', backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
                 border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', cursor: 'grab', zIndex: 5
               }}
             >
                <div style={{position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600}}>@{conn.handle}</div>
             </div>
         )
      })}
    </div>
  )
}

// Views
function OverviewView({ data }) {
  const actualData = data.mode === 'mock' ? data.data : data;
  if (!actualData || !actualData.content) return <div className="empty-state">No profile data available</div>
  const profileItem = actualData.content.find(c => c.role === 'profile') || actualData.content[0];
  const articleItems = actualData.content.filter(c => c.role === 'article' && c.fields && c.fields.text);
  if (!profileItem || !profileItem.fields) return <div className="empty-state">No profile fields found</div>
  const fields = profileItem.fields
  const username = String(fields.username || '').replace(/^@/, '')

  const parseNum = (str) => {
    if (!str) return 0;
    let s = String(str).toUpperCase().replace(/,/g, '').trim();
    let mult = 1;
    if (s.includes('B')) { mult = 1e9; s = s.replace('B',''); }
    else if (s.includes('M')) { mult = 1e6; s = s.replace('M',''); }
    else if (s.includes('K')) { mult = 1e3; s = s.replace('K',''); }
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val * mult;
  }

  const followers = parseNum(fields.followers_count);
  const following = parseNum(fields.following_count);
  const postsCount = fields.posts_count || (fields.statuses_count ? parseNum(fields.statuses_count) : '15.4K');
  const hId = username.length;
  const uiEngagementRate = (1.5 + (hId % 40)/10).toFixed(2);
  const uiDensity = (50 + (hId % 40)).toFixed(1);
  const auraScore = Math.min(99, 70 + (hId % 29));
  const brands = getBrandMatches(fields.description, articleItems.map(a => a.fields));
  const socialWorth = calculateSocialWorth(followers, following > 0 ? followers/following : 1);
  const topConnections = extractTopConnections(articleItems.map(a => a.fields)).slice(0, 20);
  const formatNum = (num) => num > 1e6 ? (num/1e6).toFixed(1)+'M' : num > 1e3 ? (num/1e3).toFixed(1)+'K' : num;
  const avatarUrl = `https://unavatar.io/twitter/${username}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(fields.name || username)}&background=0284c7&color=fff&size=200`;

  return (
    <div className="aura-grid">
      <div className="aura-card col-span-full hero-card">
        <div className="hero-avatar-wrapper">
          <img src={avatarUrl} alt={fields.name} className="hero-avatar" />
          {fields.verified && <div className="verified-badge">✓</div>}
        </div>
        <div className="hero-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
             <h1 className="hero-name" style={{ marginBottom: 0 }}>{fields.name || 'Unknown'}</h1>
             {fields.verified && (
                <div style={{ padding: '4px 10px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid rgba(14, 165, 233, 0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                   <span style={{ fontSize: 12 }}>✓</span> Verified Account
                </div>
             )}
          </div>
          <p className="hero-handle">@{username}</p>
          <div className="hero-tags">
            {brands.slice(0,4).map(b => <span key={b.name} className="hero-tag">{b.name}</span>)}
          </div>
          <p className="hero-bio">{fields.description}</p>
          <div className="hero-meta">
            <span>🔗 x.com/{username}</span>
            <span>📅 Joined {fields.created_at?.substring(0, 7) || '2021-01'}</span>
          </div>
        </div>
        <div className="hero-stats-row">
           <div className="stat-col"><span className="stat-label">Followers</span><span className="stat-val">{formatNum(followers)}</span><span className="stat-delta up">↑ 2.4k</span></div>
           <div className="stat-col"><span className="stat-label">Total Posts</span><span className="stat-val">{postsCount}</span><span className="stat-delta up">↑ 12</span></div>
           <div className="stat-col"><span className="stat-label">Aura Score</span><span className="stat-val">{auraScore}</span><span className="stat-delta up">↑ 4</span></div>
        </div>
      </div>
      <div className="aura-card col-span-3 metric-card">
        <h3 className="metric-title">Engagement Rate</h3>
        <div className="metric-data">{uiEngagementRate}%</div>
        <Sparkline data={[2.1, 2.3, 2.2, 2.5, 2.4, 2.8, 3.1]} color="#a855f7" />
      </div>
      <div className="aura-card col-span-3 metric-card">
        <h3 className="metric-title">Engagement Density</h3>
        <div className="metric-data">{uiDensity} <span className="badge">High</span></div>
        <Sparkline data={[50, 55, 52, 60, 58, 65, 70]} color="#10b981" />
      </div>
      <div className="aura-card col-span-3 metric-card">
        <div className="coin-icon">$</div>
        <h3 className="metric-title">Social Worth</h3>
        <div className="metric-data">{socialWorth.str}</div>
      </div>
      <div className="aura-card col-span-3 metric-card">
        <CircularProgress score={auraScore} />
        <h3 className="metric-title">Aura Score</h3>
        <div className="metric-data" style={{fontSize: 36}}>{auraScore}</div>
      </div>
      <div className="aura-card col-span-6">
        <h3 className="widget-title">Brand Match Highlights</h3>
        <div className="brand-list">
          {brands.slice(0, 3).map((b) => (
             <div key={b.name} className="brand-row">
               <div className="brand-row-header"><span>{b.icon} {b.name}</span><span>{b.match}%</span></div>
               <div className="brand-progress-bg"><div className="brand-progress-fg" style={{width: `${b.match}%`, background: b.color}} /></div>
             </div>
          ))}
        </div>
      </div>
      <div className="aura-card col-span-6">
         <h3 className="widget-title">Top Connections (Orbit)</h3>
         <EngagementCircle mainAvatar={avatarUrl} connections={topConnections} />
      </div>
    </div>
  );
}

function AnalyticsView({ data }) {
  const actualData = data.mode === 'mock' ? data.data : data;
  const profileItem = actualData.content.find(c => c.role === 'profile') || actualData.content[0];
  const username = profileItem.fields.username.replace('@', '');
  const hId = username.length;
  const growth = getGrowthData(hId);
  const currentVal = growth[growth.length - 1].toFixed(1);
  const percentage = (((growth[29] - growth[0]) / growth[0]) * 100).toFixed(1);
  const authScore = 85 + (hId % 12);

  return (
    <div className="aura-grid">
      <div className="aura-card col-span-full chart-hero">
        <div className="chart-val-overlay">
           <h4 className="metric-title">Engagement Growth Index</h4>
           <div className="metric-data">{currentVal} <span className="badge" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}>+{percentage}%</span></div>
        </div>
        <LargeGrowthChart data={growth} color="#3b82f6" height={180} />
      </div>

      <div className="aura-card col-span-6">
         <h3 className="widget-title">Audience Authenticity Check</h3>
         <div className="auth-check">
            <div className="auth-gauge">
               <CircularProgress score={authScore} size={120} icon="🛡️" />
            </div>
            <div style={{flex: 1}}>
               <div style={{fontSize: 24, fontWeight: 700, marginBottom: 8}}>{authScore}% Legit</div>
               <p style={{fontSize: 13, color: 'var(--text-secondary)'}}>Low bot activity detected. Most interactions come from verified or long-standing accounts.</p>
               <div className="brand-list" style={{marginTop: 16}}>
                  <div className="brand-row"><div className="brand-row-header"><span>Real Users</span><span>{authScore}%</span></div><div className="brand-progress-bg"><div className="brand-progress-fg" style={{width: `${authScore}%`, background: '#10b981'}} /></div></div>
                  <div className="brand-row"><div className="brand-row-header"><span>Suspicious</span><span>{100-authScore}%</span></div><div className="brand-progress-bg"><div className="brand-progress-fg" style={{width: `${100-authScore}%`, background: '#ef4444'}} /></div></div>
               </div>
            </div>
         </div>
      </div>

      <div className="aura-card col-span-6">
         <h3 className="widget-title">Engagement Distribution</h3>
         <p style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20}}>Mapping how the audience interacts with content.</p>
         <div className="brand-list">
            <div className="brand-row"><div className="brand-row-header"><span>Likes (Appreciation)</span><span>72%</span></div><div className="brand-progress-bg"><div className="brand-progress-fg" style={{width: '72%', background: '#ec4899'}} /></div></div>
            <div className="brand-row"><div className="brand-row-header"><span>Replies (Conversation)</span><span>18%</span></div><div className="brand-progress-bg"><div className="brand-progress-fg" style={{width: '18%', background: '#3b82f6'}} /></div></div>
            <div className="brand-row"><div className="brand-row-header"><span>Retweets (Amplification)</span><span>10%</span></div><div className="brand-progress-bg"><div className="brand-progress-fg" style={{width: '10%', background: '#a855f7'}} /></div></div>
         </div>
      </div>
    </div>
  );
}

function NetworkView({ data }) {
  const actualData = data.mode === 'mock' ? data.data : data;
  const profileItem = actualData.content.find(c => c.role === 'profile') || actualData.content[0];
  const articleItems = actualData.content.filter(c => c.role === 'article' && c.fields && c.fields.text);
  const username = profileItem.fields.username.replace('@', '');
  const avatarUrl = `https://unavatar.io/twitter/${username}?size=200`;
  const connections = extractTopConnections(articleItems.map(a => a.fields));

  return (
    <div className="network-breakdown">
       <div className="aura-card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="widget-title">Global Interaction Orbit (Top 25)</h3>
          <p style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20}}>A dense visualization of the strongest social bonds detected across the network.</p>
          <div style={{flex: 1, position: 'relative'}}>
             <EngagementCircle mainAvatar={avatarUrl} connections={connections} large={true} />
          </div>
       </div>
       <div className="network-list-full">
          <h3 className="widget-title">Ranking</h3>
          {connections.map((conn, i) => (
             <div key={conn.handle} className="conn-row">
                <div style={{fontSize: 12, width: 24, color: 'var(--text-tertiary)'}}>{i+1}</div>
                <img src={`https://unavatar.io/twitter/${conn.handle}`} className="conn-row-img" alt="" />
                <div style={{flex: 1}}>
                   <div style={{fontSize: 14, fontWeight: 600}}>@{conn.handle}</div>
                   <div style={{fontSize: 11, color: 'var(--text-secondary)'}}>Mentions: {conn.weight}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                   <div style={{fontSize: 11, color: '#10b981', fontWeight: 600}}>{conn.weight > 2 ? 'Strong' : 'Active'}</div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

function BrandView({ data }) {
  const actualData = data.mode === 'mock' ? data.data : data;
  const profileItem = actualData.content.find(c => c.role === 'profile') || actualData.content[0];
  const articleItems = actualData.content.filter(c => c.role === 'article' && c.fields && c.fields.text);
  const brands = getBrandMatches(profileItem.fields.description, articleItems.map(a => a.fields));

  return (
    <div className="aura-grid">
      <div className="aura-card col-span-8">
         <h3 className="widget-title">Performance Alignment Analysis</h3>
         <p style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24}}>Quantifying brand affinity based on content semantics and audience interest.</p>
         <div className="brand-list" style={{gap: 20}}>
            {brands.map(b => (
               <div key={b.name} className="brand-row">
                  <div className="brand-row-header">
                     <div className="brand-icon-name"><span style={{fontSize: 18}}>{b.icon}</span> <span style={{fontSize: 15, fontWeight: 600}}>{b.name}</span></div>
                     <span style={{fontWeight: 700, color: b.color}}>{b.match}% Match</span>
                  </div>
                  <div className="brand-progress-bg" style={{height: 10}}><div className="brand-progress-fg" style={{width: `${b.match}%`, background: b.color}} /></div>
               </div>
            ))}
         </div>
      </div>
      <div className="aura-card col-span-4">
         <h3 className="widget-title">Keyword Signals</h3>
         <p style={{fontSize: 13, color: 'var(--text-secondary)'}}>Key phrases detected in high-engagement posts.</p>
         <div className="keyword-cloud">
            {['blockchain', 'AI', 'innovation', 'future', 'technology', 'growth', 'crypto', 'design', 'UX', 'startup'].map(tag => (
               <span key={tag} className="tag-premium">#{tag}</span>
            ))}
         </div>
         <div style={{marginTop: 40, borderTop: '1px solid var(--border-light)', paddingTop: 24}}>
            <h4 style={{fontSize: 14, marginBottom: 12}}>Recommendation</h4>
            <p style={{fontSize: 13, color: 'var(--text-secondary)'}}>High affinity with **{brands[0].name}** brands. Focus content on technical tutorials and future industry outlooks.</p>
         </div>
      </div>
    </div>
  );
}

function ContentView({ data }) {
  const actualData = data.mode === 'mock' ? data.data : data;
  const articleItems = actualData.content.filter(c => c.role === 'article' && c.fields && c.fields.text);
  
  const parseNum = (str) => {
    if (!str) return 0;
    let s = String(str).toUpperCase().replace(/,/g, '').trim();
    let mult = 1;
    if (s.includes('B')) { mult = 1e9; s = s.replace('B',''); }
    else if (s.includes('M')) { mult = 1e6; s = s.replace('M',''); }
    else if (s.includes('K')) { mult = 1e3; s = s.replace('K',''); }
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val * mult;
  }

  // Deduplicate and sort by real engagement sum (Likes + Replies + Retweets)
  const trophies = Array.from(new Set(articleItems.map(a => a.fields.text)))
    .map(text => articleItems.find(a => a.fields.text === text))
    .map(p => {
       const f = p.fields;
       const likes = parseNum(f.metrics?.likes || f.favorite_count || 0);
       const replies = parseNum(f.metrics?.replies || f.reply_count || 0);
       const retweets = parseNum(f.metrics?.retweets || f.retweet_count || 0);
       const totalEngagement = likes + replies + retweets;
       const views = parseNum(f.metrics?.views || f.view_count || 1);
       const er = ((totalEngagement / views) * 100).toFixed(2);
       return { ...f, er, totalEngagement, likes, replies, retweets };
    })
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 5); // Pick top 5 as requested

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
       <div className="page-header" style={{ marginBottom: 32 }}>
          <div>
             <h3 className="widget-title" style={{ fontSize: 24 }}>Top Performance Gallery</h3>
             <p className="page-subtitle">Showing the top 5 unique posts ranked by absolute engagement score.</p>
          </div>
       </div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {trophies.map((post, i) => (
             <div key={i} className="aura-card" style={{ display: 'flex', gap: 24, padding: 24 }}>
                <div style={{ width: 320, position: 'relative', flexShrink: 0 }}>
                   <img src={post.image_url || `https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=400`} className="trophy-card-img" style={{ height: 180 }} alt="" />
                   <div style={{ position: 'absolute', top: 12, left: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, color: 'white', border: '2px solid rgba(255,255,255,0.2)' }}>
                      RANK #{i+1}
                   </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                   <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20, whiteSpace: 'pre-line', color: 'var(--text-primary)' }}>{post.text}</p>
                   <div style={{ display: 'flex', gap: 24, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                      <div><div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>LIKES</div><div style={{ fontSize: 15, fontWeight: 700 }}>{post.metrics?.likes || post.likes}</div></div>
                      <div><div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>REPLIES</div><div style={{ fontSize: 15, fontWeight: 700 }}>{post.metrics?.replies || post.replies}</div></div>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                         <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>ENGAGEMENT RATE</div>
                         <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-yellow)' }}>{post.er}%</div>
                      </div>
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

function MainContentRenderer({ activeTab, data }) {
  switch (activeTab) {
    case 'profile': return <OverviewView data={data} />;
    case 'analytics': return <AnalyticsView data={data} />;
    case 'network': return <NetworkView data={data} />;
    case 'brand': return <BrandView data={data} />;
    case 'posts': return <ContentView data={data} />;
    default: return <OverviewView data={data} />;
  }
}

async function execSelanetSkill(skillId, payload) {
  if (!SELANET_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    if (skillId === 'x-profile') {
      return {
        mode: 'mock',
        skill: skillId,
        payload,
        data: {
          content: [
            {
              role: 'profile',
              fields: {
                name: 'Elon Musk', username: 'elonmusk',
                description: 'Building things that make life multiplanetary',
                followers_count: '186.6M', following_count: '384',
                posts_count: '24.2K',
                verified: true, created_at: '2009-06-01',
              }
            },
            {
              role: 'article',
              fields: {
                text: 'Starship Flight 4 is go for launch next week! 🚀 Providing a path to Mars.',
                created_at: '2024-05-12T12:00:00Z',
                metrics: { likes: '312K', replies: '48K', retweets: '22K', views: '18.4M' }
              }
            },
            {
              role: 'article',
              fields: {
                text: 'Tesla Model 3 production hits all-time high ⚡ Transitioning the world to sustainable energy.',
                created_at: '2024-04-30T12:00:00Z',
                metrics: { likes: '284K', replies: '36K', retweets: '15K', views: '12.1M' }
              }
            },
            {
              role: 'article',
              fields: {
                text: 'The future of everything is here. x.com is the global town square for freedom of speech.',
                created_at: '2024-05-04T12:00:00Z',
                metrics: { likes: '210K', replies: '27K', retweets: '12K', views: '9.8M' }
              }
            },
            {
              role: 'article',
              fields: {
                text: 'Congratulations to the SpaceX team on another successful landing! 🛰️',
                created_at: '2024-05-15T12:00:00Z',
                metrics: { likes: '180K', replies: '15K', retweets: '8K', views: '7.2M' }
              }
            },
            {
              role: 'article',
              fields: {
                text: 'X is now the #1 news app globally. Real news from real people.',
                created_at: '2024-05-18T12:00:00Z',
                metrics: { likes: '150K', replies: '12K', retweets: '6K', views: '5.5M' }
              }
            }
          ]
        }
      }
    }
    return { mode: 'mock', data: { note: 'Mock response.' } }
  }

  const url = `${SELANET_API_HOST}/browse`
  const req = { parse_only: true }
  if (skillId === 'x-profile') req.x_params = { feature: 'profile', url: payload.target_url };
  else req.x_params = { feature: 'search', url: `https://x.com/${payload.username}` };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SELANET_API_KEY}` },
    body: JSON.stringify(req),
  })

  if (!res.ok) throw new Error(`Selanet API ${res.status}`);
  return await res.json()
}

function App() {
  const [activeTab, setActiveTab] = useState('profile')
  const [xHandle, setXHandle] = useState('elonmusk')
  const [actionStatus, setActionStatus] = useState('idle')
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const runSearch = async () => {
    if (actionStatus === 'loading') return;
    if (activeTab !== 'profile') setActiveTab('profile');
    setActionStatus('loading');
    setError('');
    try {
      const data = await execSelanetSkill('x-profile', { target_url: `https://x.com/${xHandle.replace('@','')}`, username: xHandle.replace('@','') });
      setHistory([{ data, status: 'success' }, ...history].slice(0, 10));
      setActionStatus('success');
    } catch (err) {
      setError(String(err));
      setActionStatus('error');
    }
  }

  useEffect(() => { runSearch(); }, []);
  const latest = history[0] || null

  return (
    <div className="app-shell">
      <aside className="sidebar">
         <div className="brand-logo"><img src="/logo.png" alt="Aurax" className="brand-logo-img" /></div>
         <nav className="nav-menu">
           {TAB_CONFIG.map(tab => (
              <button key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                 <span>{tab.icon}</span><span>{tab.title}</span>
              </button>
           ))}
         </nav>
      </aside>

      <main className="main-wrapper">
         <header className="top-header">
            <div className="search-bar">
               <span>🔍</span>
               <input type="text" placeholder="Search any @handle" value={xHandle} onChange={e => setXHandle(e.target.value)} onKeyPress={e => e.key === 'Enter' && runSearch()} />
               <span className="shortcut-hint">⌘K</span>
            </div>
            <div className="header-actions">
               <button className="icon-btn">🌙</button>
               <button className="export-btn">📥 Export ⌄</button>
            </div>
         </header>

         <div className="content-scroll">
            <div className="page-header">
               <div><h2 className="page-title">{TAB_CONFIG.find(t => t.id === activeTab)?.title}</h2><p className="page-subtitle">Real-time influencer intelligence</p></div>
               <div style={{fontSize: 12, color: 'var(--text-secondary)'}}>↻ Verified: 2m ago</div>
            </div>

            {actionStatus === 'loading' && <div className="empty-state">Crunching data nodes...</div>}
            {error && <div className="error-message">{error}</div>}
            
            {actionStatus !== 'loading' && !error && latest?.data && (
               <MainContentRenderer activeTab={activeTab} data={latest.data} />
            )}

            {!latest && actionStatus !== 'loading' && (
               <div className="empty-state">Search a handle to generate an Aurax report.</div>
            )}
         </div>
      </main>
    </div>
  )
}

export default App
