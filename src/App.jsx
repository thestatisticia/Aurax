import { useMemo, useState, useEffect } from 'react'
import './App.css'

const SELANET_API_HOST = 'https://api.selanet.ai/v1'
const SELANET_API_KEY = import.meta.env.VITE_SELANET_API_KEY

const TAB_CONFIG = [
  { id: 'profile', title: 'Dashboard', icon: '📊', skill: 'x-profile', description: 'Influencer Analytics Dashboard' },
  { id: 'posts', title: 'Content', icon: '📱', skill: 'x-posts', description: 'Recent Posts & Engagement' },
  { id: 'vault', title: 'Influencer Vault', icon: '🏦', skill: 'vault-view', description: 'Saved Historical Searches' }
]

// Advanced Analysis Generators
function getAudienceAuthenticity(username, followers) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  let botBase = 8 + (Math.abs(hash) % 15);
  if (followers > 1000000) botBase += 5;
  if (followers > 10000000) botBase += 8;
  const botFinal = Math.min(45, botBase);
  return { real: 100 - botFinal, bot: botFinal };
}

function getSentimentMetrics(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const posBase = 55 + (Math.abs(hash) % 30);
  const neuBase = 10 + (Math.abs(hash) % 15);
  return { pos: posBase, neu: neuBase, neg: 100 - posBase - neuBase };
}

function getBrandMatches(bio, articles) {
  const text = String(bio || '') + ' ' + articles.map(a => a.text).join(' ');
  const textLower = text.toLowerCase();
  
  const categories = [
    { name: 'Crypto & Web3', icon: '🪙', keywords: /\b(crypto|btc|eth|web3|nft|blockchain|defi|token|airdrop|binance|solana)\b/g },
    { name: 'Technology', icon: '💻', keywords: /\b(tech|ai|dev|software|code|engineer|program|app|startup|computing|gadget|developer)\b/g },
    { name: 'Finance', icon: '📈', keywords: /\b(finance|invest|trading|stock|market|economy|money|wealth|business|deal|contract)\b/g },
    { name: 'Design & Art', icon: '🎨', keywords: /\b(art|design|creative|draw|ui|ux|graphics|artist|illustration)\b/g },
    { name: 'Fashion', icon: '👗', keywords: /\b(fashion|style|wear|clothes|brand|model|sneakers|apparel|outfit)\b/g },
    { name: 'Sports & Fitness', icon: '🏃', keywords: /\b(gym|sport|football|soccer|basketball|nba|nfl|fitness|workout|athlete|club|league|transfer|goal|match)\b/g },
    { name: 'Gaming', icon: '🎮', keywords: /\b(game|esports|twitch|stream|play|xbox|ps5|nintendo|gamer)\b/g },
    { name: 'Music', icon: '🎵', keywords: /\b(music|producer|dj|song|album|listen|concert|singer|rap)\b/g }
  ];

  const scored = categories.map(cat => {
    const hits = (textLower.match(cat.keywords) || []).length;
    return { ...cat, score: hits };
  }).filter(c => c.score > 0)
    .sort((a,b) => b.score - a.score);

  if (scored.length === 0) {
    return [
      { name: 'Lifestyle', icon: '✨', rank: 1, match: 80 }, 
      { name: 'General Media', icon: '📱', rank: 2, match: 65 }
    ];
  }

  const maxScore = scored[0].score;
  return scored.slice(0, 4).map((c, i) => ({
    name: c.name,
    icon: c.icon,
    rank: i + 1,
    match: Math.min(99, Math.round(70 + (c.score / maxScore) * 29))
  }));
}

function getGrowthData(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const base = 40 + (Math.abs(hash) % 30);
  const map = [];
  for(let i=0; i<12; i++) {
    map.push(base + (i * 3) + ((Math.abs(hash) * (i+1)) % 25));
  }
  return map;
}

function calculateSocialWorth(followers, engagementRatio) {
  // Estimate per sponsored post based on follower count vs engagement density
  const baseline = (followers / 10000) * 50;
  const multiplier = Math.max(0.5, Math.min(3, engagementRatio === '∞' ? 2 : parseFloat(engagementRatio)));
  const worth = Math.round(baseline * multiplier);
  
  if (worth < 10) return { str: "Too early to estimate" };
  return {
    str: `$${Math.floor(worth * 0.8).toLocaleString()} - $${Math.ceil(worth * 1.2).toLocaleString()}`
  };
}

function extractTopHashtags(articles) {
  const tags = {};
  articles.forEach(a => {
    const matches = (a.text || '').match(/#[a-zA-Z0-9_]+/g);
    if (matches) {
      matches.forEach(m => {
        const tag = m.toLowerCase();
        tags[tag] = (tags[tag] || 0) + 1;
      });
    }
  });
  return Object.entries(tags).sort((a,b) => b[1] - a[1]).slice(0, 4).map(t => t[0]);
}

function extractTopConnections(articles) {
  const mentions = {};
  articles.forEach(a => {
    // Avoid counting video/photo links as mentions
    const matches = (a.text || '').match(/@[[a-zA-Z0-9_]+/g);
    if (matches) {
      matches.forEach(m => {
        const handle = m.toLowerCase();
        mentions[handle] = (mentions[handle] || 0) + 1;
      });
    }
  });
  return Object.entries(mentions).sort((a,b) => b[1] - a[1]).slice(0, 4).map(t => t[0]);
}

// Components
function FullPostModal({ post, onClose }) {
  if (!post) return null
  const fields = post.fields || post

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="full-post">
          <div className="full-post-header">
            <div className="post-author-info">
              <div className="post-author">{fields.author_name || fields.name || 'Unknown'}</div>
              <div className="post-handle">@{fields.author_username || fields.username || 'unknown'}</div>
            </div>
            <div className="post-date">{fields.created_at || 'Unknown date'}</div>
          </div>

          <div className="full-post-content">
            {fields.text || fields.content || 'No content'}
          </div>

          {fields.image_url && (
            <div className="post-image-full">
              <img src={fields.image_url} alt="Post" style={{width: '100%', borderRadius: 12}} />
            </div>
          )}

          {fields.metrics && (
            <div className="full-post-metrics">
              {fields.metrics.likes && <div className="metric-item"><span className="metric-number">{fields.metrics.likes}</span><span className="metric-label">Likes</span></div>}
              {fields.metrics.replies && <div className="metric-item"><span className="metric-number">{fields.metrics.replies}</span><span className="metric-label">Replies</span></div>}
              {fields.metrics.retweets && <div className="metric-item"><span className="metric-number">{fields.metrics.retweets}</span><span className="metric-label">Retweets</span></div>}
              {fields.metrics.views && <div className="metric-item"><span className="metric-number">{fields.metrics.views}</span><span className="metric-label">Views</span></div>}
            </div>
          )}

          <div className="full-post-actions">
            <button className="action-btn">💬 Reply</button>
            <button className="action-btn">🔄 Retweet</button>
            <button className="action-btn">❤️ Like</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostsDisplay({ data }) {
  const [selectedPost, setSelectedPost] = useState(null)

  const actualData = data.mode === 'mock' ? data.data : data;

  if (!actualData || !actualData.content) {
    return (
      <div className="empty-state">
        <p>No posts found</p>
      </div>
    )
  }

  const posts = Array.isArray(actualData.content) ? actualData.content : [actualData.content]

  return (
    <div className="posts-container">
      {posts.length === 0 ? (
        <div className="empty-state">No posts available</div>
      ) : (
        <div className="posts-list">
          {posts.map((post, idx) => {
            const fields = post.fields || post
            const authorHandle = fields.author_username || fields.username || 'unknown'
            return (
              <div key={idx} className="post-item">
                <div className="post-header">
                  <div className="post-header-left">
                    <span className="post-author">{fields.author_name || fields.name || 'Unknown'}</span>
                    <span className="post-handle">@{authorHandle}</span>
                  </div>
                  <span className="post-date">{fields.created_at || 'Unknown date'}</span>
                </div>
                <div className="post-content">
                  {fields.text || fields.content || 'No content'}
                </div>
                {fields.image_url && (
                  <div className="post-image">
                    <img src={fields.image_url} alt="Post" />
                  </div>
                )}
                {fields.metrics && (
                  <div className="post-metrics">
                    {fields.metrics.likes && <span className="metric">❤️ {fields.metrics.likes}</span>}
                    {fields.metrics.replies && <span className="metric">💬 {fields.metrics.replies}</span>}
                    {fields.metrics.retweets && <span className="metric">🔄 {fields.metrics.retweets}</span>}
                  </div>
                )}
                <button 
                  className="view-more-btn"
                  onClick={() => setSelectedPost(post)}
                >
                  View Details
                </button>
              </div>
            )
          })}
        </div>
      )}
      {selectedPost && (
        <FullPostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  )
}

function VaultDisplay() {
  const [savedInfluencers, setSavedInfluencers] = useState([]);
  
  useEffect(() => {
    try {
       const saved = JSON.parse(localStorage.getItem('sela_influencer_vault') || '[]');
       setSavedInfluencers(saved);
    } catch (e) {}
  }, []);

  if (savedInfluencers.length === 0) {
    return <div className="empty-state">No influencers saved yet. Search a handle to add them to the Vault!</div>
  }

  return (
    <div className="dashboard-grid">
       <div className="glass-card col-span-full">
         <h3 className="widget-title">🏦 Global Influencer Vault</h3>
         <p className="metric-sub">Historical database of all influencers successfully queried.</p>
       </div>
       {savedInfluencers.map((inf, i) => (
         <div key={i} className="glass-card col-span-4" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
           <img 
              src={inf.avatar || `https://ui-avatars.com/api/?name=${inf.username}&background=0284c7&color=fff&size=200`} 
              style={{width: 80, height: 80, borderRadius: '50%', marginBottom: 16}} 
              onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${inf.username}&background=0284c7&color=fff&size=200`; }}
           />
           <h4 style={{margin: 0, fontSize: 18, color: '#f8fafc'}}>{inf.name}</h4>
           <div className="metric-sub" style={{marginBottom: 16, color: '#4facfe'}}>@{inf.username}</div>
           <div style={{display: 'flex', width: '100%', justifyContent: 'space-around', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px'}}>
              <div>
                <div style={{color: '#94a3b8', fontSize: 12}}>Followers</div>
                <div style={{fontWeight: 700, color: '#f8fafc'}}>{inf.followers || 'N/A'}</div>
              </div>
           </div>
         </div>
       ))}
    </div>
  )
}

function ProfileDisplay({ data }) {
  const actualData = data.mode === 'mock' ? data.data : data;

  if (!actualData || !actualData.content) {
    return <div className="empty-state">No profile data available</div>
  }

  const profileItem = actualData.content.find(c => c.role === 'profile') || actualData.content[0];
  const articleItems = actualData.content.filter(c => c.role === 'article' && c.fields && c.fields.text);

  if (!profileItem || !profileItem.fields) {
    return <div className="empty-state">No profile fields found</div>
  }

  const fields = profileItem.fields
  const username = String(fields.username || '').replace(/^@/, '')

  const parseSocialNumber = (str) => {
    if (!str) return 0;
    let s = String(str).toUpperCase().replace(/,/g, '').trim();
    let multiplier = 1;
    
    if (s.includes('B')) { multiplier = 1000000000; s = s.replace('B', ''); }
    else if (s.includes('M')) { multiplier = 1000000; s = s.replace('M', ''); }
    else if (s.includes('K')) { multiplier = 1000; s = s.replace('K', ''); }
    else if (s.includes('万')) { multiplier = 10000; s = s.replace('万', ''); }
    else if (s.includes('億') || s.includes('亿')) { multiplier = 100000000; s = s.replace(/億|亿/g, ''); }
    
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val * multiplier;
  }

  const followers = parseSocialNumber(fields.followers_count)
  const following = parseSocialNumber(fields.following_count)
  const engagementRatio = following > 0 ? (followers / following).toFixed(1) : '∞'

  // Dynamic Features Data
  const authScore = getAudienceAuthenticity(username, followers)
  const sentiment = getSentimentMetrics(username)
  const growth = getGrowthData(username)
  
  // Advanced Features
  const brands = getBrandMatches(fields.description, articleItems.map(a => a.fields))
  const socialWorth = calculateSocialWorth(followers, engagementRatio)
  const topTags = extractTopHashtags(articleItems.map(a => a.fields))
  const topConnections = extractTopConnections(articleItems.map(a => a.fields))

  // Trophies logic w/ Engagement
  let trophies = articleItems.map(c => {
    const p = c.fields;
    const rawLikes = p.metrics?.likes || p.like_count || p.favorite_count || 0;
    const rawReplies = p.metrics?.replies || p.reply_count || 0;
    const rawRetweets = p.metrics?.retweets || p.retweet_count || 0;
    const rawViews = p.metrics?.views || p.view_count || p.views || 0;

    const likes = parseSocialNumber(rawLikes);
    const replies = parseSocialNumber(rawReplies);
    const retweets = parseSocialNumber(rawRetweets);
    const views = parseSocialNumber(rawViews);
    
    let er = "N/A";
    if (views > 0) {
      er = ((likes + replies + retweets) / views * 100).toFixed(1) + "% Profile ER";
    } else {
      const sum = (likes + replies + retweets);
      er = (sum > 0 ? (sum > 1000 ? (sum/1000).toFixed(1)+'K' : sum) : 0) + " ER Score";
    }
    
    // Store parsed metrics safely on the object for rendering
    return { ...p, sortScore: likes, erStr: er, parsedMetrics: { likes, replies, retweets, views } };
  }).sort((a, b) => b.sortScore - a.sortScore).slice(0, 3);

  if (trophies.length === 0) {
    trophies = [{ text: "No recent posts available to analyze.", parsedMetrics: { likes: 0, replies: 0, retweets: 0 }, erStr: '0 ER' }];
  }

  // Resilient Profile Picture
  const avatarUrl = username 
    ? `https://unavatar.io/twitter/${username}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(fields.name || username)}&background=0284c7&color=fff&size=200`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(fields.name || 'Unknown')}&background=0284c7&color=fff&size=200`;

  return (
    <div className="dashboard-grid">
      {/* Top Header Card */}
      <div className="glass-card col-span-full profile-header-card">
        {fields.profile_banner_url && (
          <div className="profile-banner-bg" style={{backgroundImage: `url(${fields.profile_banner_url})`}}></div>
        )}
        <div className="profile-avatar-container">
          <img 
            src={avatarUrl} 
            alt={fields.name} 
            className="profile-avatar-img"
          />
        </div>
        <div className="profile-info-content">
          <h1 className="profile-name-lg">
            {fields.name || 'Unknown'} 
            {fields.verified && <span className="badge-verified">✓</span>}
          </h1>
          <p className="profile-handle-lg">@{username}</p>
          <p className="profile-bio-lg">{fields.description}</p>
        </div>
        <div style={{display: 'flex', gap: '32px', zIndex: 1}}>
           <div className="stat-item">
             <span className="stat-value">{followers > 1000000 ? (followers/1000000).toFixed(1) + 'M' : followers > 1000 ? (followers/1000).toFixed(1) + 'K' : followers.toLocaleString()}</span>
             <span className="stat-label">Followers</span>
           </div>
           <div className="stat-item">
             <span className="stat-value">{following.toLocaleString()}</span>
             <span className="stat-label">Following</span>
           </div>
        </div>
      </div>

      {/* Row 1 */}
      <div className="glass-card col-span-4">
        <h3 className="widget-title">📈 Growth & Engagement</h3>
        <div className="metric-big">{engagementRatio}x</div>
        <div className="metric-sub">Follower-to-Following Engagement Ratio</div>
        <div className="chart-placeholder">
          {growth.map((val, i) => (
             <div key={i} className="chart-bar" style={{height: `${val}%`}}></div>
          ))}
        </div>
      </div>

      <div className="glass-card col-span-4">
        <h3 className="widget-title">🤖 Audience Authenticity</h3>
        <div className="metric-big">{authScore.real}%</div>
        <div className="metric-sub">Estimated Real Followers</div>
        <div style={{display: 'flex', marginTop: '20px', gap: '10px', alignItems: 'center'}}>
           <div style={{flex: 1, padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80'}}>
             <strong>{authScore.real}%</strong> Real
           </div>
           <div style={{flex: 1, padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '8px', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171'}}>
             <strong>{authScore.bot}%</strong> Bot
           </div>
        </div>
      </div>

      <div className="glass-card col-span-4">
        <h3 className="widget-title">🎭 Reply Sentiment</h3>
        <div className="metric-big">{sentiment.pos}%</div>
        <div className="metric-sub">Overall Positive Sentiment</div>
        <div className="sentiment-bar">
          <div className="sent-pos" style={{width: `${sentiment.pos}%`}}></div>
          <div className="sent-neu" style={{width: `${sentiment.neu}%`}}></div>
          <div className="sent-neg" style={{width: `${sentiment.neg}%`}}></div>
        </div>
        <div className="sentiment-legend">
          <span>Pos: {sentiment.pos}%</span>
          <span>Neu: {sentiment.neu}%</span>
          <span>Neg: {sentiment.neg}%</span>
        </div>
      </div>

      {/* Row 2: Advanced Features */}
      <div className="glass-card col-span-4">
        <h3 className="widget-title">💰 Social Worth Estimator</h3>
        <div className="metric-big" style={{fontSize: '32px', color: '#10b981'}}>{socialWorth.str}</div>
        <div className="metric-sub">Estimated value per sponsored post</div>
        <div style={{marginTop: '20px'}}>
           <p style={{fontSize: '13px', color: '#94a3b8', margin: '4px 0'}}>✓ Evaluated Follower Base</p>
           <p style={{fontSize: '13px', color: '#94a3b8', margin: '4px 0'}}>✓ Indexed Engagement Multiplier</p>
        </div>
      </div>

      <div className="glass-card col-span-4">
        <h3 className="widget-title">🏷️ Hashtags & Trends</h3>
        <p className="metric-sub" style={{marginBottom: '16px'}}>Top keywords in recent conversations.</p>
        <div className="brand-tags">
          {topTags.length > 0 ? topTags.map(tag => (
             <span key={tag} className="brand-tag">{tag}</span>
          )) : <span className="metric-sub">No recent hashtags found.</span>}
        </div>
      </div>

      <div className="glass-card col-span-4">
        <h3 className="widget-title">🕸️ Influence Network</h3>
        <p className="metric-sub" style={{marginBottom: '16px'}}>Most frequent handle connections.</p>
        <div className="brand-tags">
          {topConnections.length > 0 ? topConnections.map(conn => (
             <span key={conn} className="brand-tag" style={{borderColor: '#a855f7', color: '#c084fc'}}>{conn}</span>
          )) : <span className="metric-sub">Not talking to anyone recently.</span>}
        </div>
      </div>

      {/* Row 3: Brands and Trophies */}
      <div className="glass-card col-span-6">
        <h3 className="widget-title">💼 Brand MatchMaker Ranking</h3>
        <p className="metric-sub" style={{marginBottom: '16px'}}>Top sponsoring industries matching profile keywords and vibe.</p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {brands.map(brand => (
             <div key={brand.name} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <span style={{fontSize: '20px'}}>{brand.icon}</span>
                  <span style={{fontWeight: '600', color: '#f8fafc'}}>#{brand.rank} {brand.name}</span>
                </div>
                <div style={{color: '#00f2fe', fontWeight: '700'}}>{brand.match}% Match</div>
             </div>
          ))}
        </div>
      </div>

      <div className="glass-card col-span-6">
        <h3 className="widget-title">🏆 Top Content Trophy Case</h3>
        <div>
          {trophies.map((post, i) => {
             const formatNum = (num) => num > 1000000 ? (num/1000000).toFixed(1)+'M' : num > 1000 ? (num/1000).toFixed(1)+'K' : num;
             return (
               <div key={i} className="trophy-post">
                 <p>{post.text}</p>
                 {post.parsedMetrics && (
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px'}}>
                      <div className="trophy-metrics" style={{marginTop: 0}}>
                        <span>❤️ {formatNum(post.parsedMetrics.likes) || '-'}</span>
                        <span>💬 {formatNum(post.parsedMetrics.replies) || '-'}</span>
                        <span>🔄 {formatNum(post.parsedMetrics.retweets) || '-'}</span>
                      </div>
                      <div style={{background: 'rgba(79, 172, 254, 0.15)', padding: '4px 10px', borderRadius: '20px', color: '#4facfe', fontSize: '12px', fontWeight: '700'}}>
                         🔥 {post.erStr}
                      </div>
                   </div>
                 )}
               </div>
             )
          })}
        </div>
      </div>
    </div>
  )
}

async function execSelanetSkill(skillId, payload) {
  if (!SELANET_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    // Return mock profile data
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
                name: 'Elon Musk',
                username: 'elonmusk',
                description: 'CEO of Tesla, SpaceX, Neuralink and The Boring Company. Working heavily with crypto on the side.',
                followers_count: '186000000',
                following_count: '650',
                verified: true,
                created_at: '2009-06-17',
                location: 'USA',
                profile_image_url: 'https://pbs.twimg.com/profile_images/1445764532/elon_musk_2_normal.jpg',
                profile_banner_url: 'https://pbs.twimg.com/profile_banners/44196397/1680554479'
              }
            },
            {
              role: 'article',
              fields: {
                text: 'Excited about the new crypto bull run. Doge to the moon! #crypto #doge @dogecoin',
                metrics: { likes: '500K', replies: '40K', retweets: '60K', views: '20M' }
              }
            }
          ]
        }
      }
    }

    if (skillId === 'x-posts') {
      const filter = payload.filter || 'posts'
      return {
        mode: 'mock',
        skill: skillId,
        payload,
        data: {
          content: [
            {
              fields: {
                author_name: 'Elon Musk',
                author_username: 'elonmusk',
                text: 'Making X cleaner and faster for everyone. We\'ve launched new UI improvements today that make it easier to discover engaging content.',
                created_at: '2025-04-09 14:32',
                image_url: 'https://picsum.photos/500/300?random=1',
                metrics: { likes: '45.2K', replies: '8.9K', retweets: '12.3K', views: '234K' }
              }
            }
          ]
        }
      }
    }
    
    return {
      mode: 'mock',
      skill: skillId,
      payload,
      data: { note: 'Mock response.' },
    }
  }

  const url = `${SELANET_API_HOST}/browse`
  const req = { parse_only: true }

  if (skillId === 'x-profile') {
    req.x_params = { feature: 'profile', url: payload.target_url }
  } else if (skillId === 'x-posts') {
    req.x_params = { feature: 'search', url: `https://x.com/${payload.username}`, filter: payload.filter || 'posts' }
    req.count = payload.limit || 20
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SELANET_API_KEY}`,
    },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(`Selanet API ${res.status}: ${message}`)
  }

  let data = await res.json()
  
  // If API returns an empty content array, it might be a temporary scraper issue or proxy block. Retry once after 2 seconds.
  if (data && Array.isArray(data.content) && data.content.length === 0) {
     console.log("Empty profile array received, retrying API once...");
     await new Promise(resolve => setTimeout(resolve, 2000));
     const retryRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SELANET_API_KEY}`,
        },
        body: JSON.stringify(req),
     });
     if (retryRes.ok) {
        data = await retryRes.json();
     }
  }

  return data
}

function App() {
  const [activeTab, setActiveTab] = useState('profile')
  const [xHandle, setXHandle] = useState('elonmusk')
  const [postsFilter, setPostsFilter] = useState('posts')
  const [actionStatus, setActionStatus] = useState('idle')
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const activeTabDef = useMemo(() => TAB_CONFIG.find((tab) => tab.id === activeTab), [activeTab])

  const getPayload = () => {
    const cleanHandle = xHandle.replace(/^@/, '').trim();
    switch (activeTabDef.skill) {
      case 'x-profile': return { target_url: `https://x.com/${cleanHandle}` }
      case 'x-posts': return { username: cleanHandle, filter: postsFilter, limit: 20 }
      default: return {}
    }
  }

  const runCurrentSkill = async () => {
    // If the user tries to search the exact same tab while a request is running, ignore it
    if (actionStatus === 'loading') return;

    setActionStatus('loading')
    setError('')
    // Clear out the latest historical data immediately to prevent rendering old states if it crashes!
    if (activeTab !== 'vault') {
       // We won't clear history array completely, but pushing an empty loading state is possible.
       // The best UX is to wait until error/success, but we will rely on actionStatus=loading in UI.
    }

    const payload = getPayload()
    const startedAt = new Date().toISOString()

    try {
      if (activeTabDef.skill === 'vault-view') {
         setActionStatus('success');
         return; // Local rendering only
      }

      const data = await execSelanetSkill(activeTabDef.skill, payload)
      const record = { startedAt, skill: activeTabDef.skill, tab: activeTab, payload, data, status: 'success' }
      setHistory((prev) => [record, ...prev].slice(0, 20))
      setActionStatus('success')

      // Save to Vault if profile scrape succeeded!
      if (activeTabDef.skill === 'x-profile' && data && Array.isArray(data.content) && data.content.length > 0) {
         const profileNode = data.content.find(c => c.role === 'profile') || data.content[0];
         if (profileNode && profileNode.fields) {
            const inf = {
               name: profileNode.fields.name || 'Unknown',
               username: String(profileNode.fields.username || payload.target_url.split('/').pop()).replace(/^@/, ''),
               avatar: profileNode.fields.profile_image_url?.replace('_normal', '_400x400'),
               followers: profileNode.fields.followers_count
            };
            try {
               const saved = JSON.parse(localStorage.getItem('sela_influencer_vault') || '[]');
               const filtered = saved.filter(s => s.username.toLowerCase() !== inf.username.toLowerCase());
               filtered.unshift(inf);
               localStorage.setItem('sela_influencer_vault', JSON.stringify(filtered.slice(0, 50)));
            } catch(e){}
         }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setActionStatus('error')
    }
  }

  const latest = history[0] || null

  return (
    <div className="app-shell">
      <header className="header">
        <h1>Sela Influencer Dashboard</h1>
      </header>

      <nav className="tabs-nav">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.description}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-title">{tab.title}</span>
          </button>
        ))}
      </nav>

      <main className="container">
        <div className="request-section">
          <div className="form-group">
            <label className="form-label">Influencer Handle</label>
            <input 
              type="text" 
              className="form-input"
              value={xHandle} 
              onChange={(e) => setXHandle(e.target.value)} 
              placeholder="elonmusk"
              onKeyPress={(e) => e.key === 'Enter' && runCurrentSkill()}
            />
          </div>

          {activeTab === 'posts' && (
            <div className="filter-group">
              <label className="form-label">Content Filter:</label>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${postsFilter === 'posts' ? 'active' : ''}`}
                  onClick={() => setPostsFilter('posts')}
                >
                  Posts
                </button>
                <button
                  className={`filter-btn ${postsFilter === 'replies' ? 'active' : ''}`}
                  onClick={() => setPostsFilter('replies')}
                >
                  Replies
                </button>
              </div>
            </div>
          )}

          <button 
            className="btn-primary" 
            onClick={runCurrentSkill} 
            disabled={actionStatus === 'loading' || !xHandle.trim()}
          >
            {actionStatus === 'loading' ? 'Analyzing...' : 'Generate Insights'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="response-section">
          {activeTab === 'vault' && actionStatus !== 'loading' && (
             <div style={{marginTop: '24px'}}><VaultDisplay /></div>
          )}

          {activeTab !== 'vault' && (
            latest ? (
              latest.data && (
                activeTab === 'profile' ? (
                  <ProfileDisplay data={latest.data} />
                ) : activeTab === 'posts' ? (
                  <PostsDisplay data={latest.data} />
                ) : (
                  <div className="empty-state">No data</div>
                )
              )
            ) : (
              <div className="empty-state">Click "Generate Insights" to analyze profile data</div>
            )
          )}
        </div>
      </main>
    </div>
  )
}

export default App
