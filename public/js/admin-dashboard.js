/**
 * admin-dashboard.js
 * Loads all dashboard data from the API, applies live currency conversion,
 * and uses min_monthly_purchase from settings for the below-minimum table.
 */

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ''; }
function fmtDate(d){
  if(!d) return '—';
  return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
}

// ── GREETING ──
function setGreeting(name){
  var h = new Date().getHours();
  var part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  document.getElementById('greeting').textContent =
    'Good ' + part + ', ' + (name || 'Admin') + '! 👋';
}

// ── ANIMATED COUNTER ──
function animateCount(el, target, prefix){
  var start = 0;
  var duration = 900;
  var step = target / (duration / 16);
  function tick(){
    start += step;
    if(start >= target){
      el.textContent = prefix + Number(target).toLocaleString('en-US');
      return;
    }
    el.textContent = prefix + Math.floor(start).toLocaleString('en-US');
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── MAIN LOAD ──
async function loadDashboard(){
  try {
    // Load currency + all settings first, then data in parallel
    await AppCurrency.load();
    var [usersRes, purchasesRes, commissionsRes] = await Promise.all([
      window.AppUtils.safeFetch('/api/users'),
      window.AppUtils.safeFetch('/api/purchases'),
      window.AppUtils.safeFetch('/api/commissions'),
    ]);

    // minMonthlyPurchase is stored in USD — convert to display currency
    var minUSD = Number(AppCurrency.setting('minMonthlyPurchase') || 0);
    var minInDisplayCurrency = AppCurrency.convert(minUSD);
    var minPurchaseDisplay = AppCurrency.fmt(minUSD, 0);

    var allUsers       = usersRes.users         || [];
    var allPurchases   = purchasesRes.purchases  || [];
    var allCommissions = commissionsRes.commissions || [];

    var now         = new Date();
    var thisMonth   = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

    // ── DISTRIBUTORS ──
    var distributors = allUsers.filter(function(u){ return u.role === 'distributor'; });
    var active       = distributors.filter(function(u){ return u.isActive; });

    // ── MONTHLY PURCHASES ──
    var monthPurchases = allPurchases.filter(function(p){
      return String(p.period || '').startsWith(thisMonth);
    });
    var monthTotal = monthPurchases.reduce(function(a,p){ return a + Number(p.amount||0); }, 0);

    // ── COMMISSION PAYABLE (pending + approved) ──
    var payable = allCommissions
      .filter(function(c){ return c.status === 'pending' || c.status === 'approved'; })
      .reduce(function(a,c){ return a + Number(c.totalCommission||0); }, 0);

    // ── STAT CARDS ──
    animateCount(document.getElementById('statTotalDistributors'), distributors.length, '');
    animateCount(document.getElementById('statActiveDistributors'), active.length, '');

    var mpEl = document.getElementById('statMonthlyPurchases');
    mpEl.textContent = AppCurrency.fmt(monthTotal); // monthTotal is in USD, fmt() converts

    var cpEl = document.getElementById('statCommissionPayable');
    cpEl.textContent = AppCurrency.fmt(payable);

    // Sub-labels
    var inactiveCount = distributors.length - active.length;
    document.getElementById('statTotalDistributorsSub').textContent =
      inactiveCount + ' inactive';
    document.getElementById('statActiveDistributorsSub').textContent =
      'of ' + distributors.length + ' total';
    document.getElementById('statMonthlyPurchasesSub').textContent =
      monthPurchases.length + ' purchase' + (monthPurchases.length !== 1 ? 's' : '') + ' this month';
    document.getElementById('statCommissionPayableSub').textContent =
      allCommissions.filter(function(c){ return c.status === 'pending'; }).length + ' pending approval';

    // ── RECENT REGISTRATIONS (last 5) ──
    var sponsorMap = {};
    allUsers.forEach(function(u){ sponsorMap[String(u.id)] = u.fullName || u.username || u.email; });

    var recent = distributors
      .slice()
      .sort(function(a,b){ return new Date(b.createdAt||0) - new Date(a.createdAt||0); })
      .slice(0, 5);

    var regBody = document.getElementById('recentRegistrationsBody');
    if(!recent.length){
      regBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#9ca3af;">No registrations yet.</td></tr>';
    } else {
      regBody.innerHTML = recent.map(function(u){
        var sponsor = u.sponsorId ? (sponsorMap[String(u.sponsorId)] || '—') : '—';
        return '<tr>'
          + '<td>' + esc(u.fullName || u.username || u.email) + '</td>'
          + '<td>' + esc(u.email) + '</td>'
          + '<td>' + esc(sponsor) + '</td>'
          + '<td>' + fmtDate(u.createdAt) + '</td>'
          + '</tr>';
      }).join('');
    }

    // ── BELOW MINIMUM REQUIREMENT ──
    // Build a map: userId → total purchase amount this month (stored in USD)
    var purchaseByUser = {};
    monthPurchases.forEach(function(p){
      var uid = String(p.userId);
      purchaseByUser[uid] = (purchaseByUser[uid] || 0) + Number(p.amount || 0);
    });

    // Convert purchase amounts to display currency for comparison against minInDisplayCurrency
    var belowMin = distributors
      .filter(function(u){ return u.isActive; })
      .map(function(u){
        var amtUSD = purchaseByUser[String(u.id)] || 0;
        var amtDisplay = AppCurrency.convert(amtUSD);
        return { user: u, amtUSD: amtUSD, amount: amtDisplay };
      })
      .filter(function(x){ return x.amount < minInDisplayCurrency; })
      .sort(function(a,b){ return a.amount - b.amount });

    var minBody = document.getElementById('belowMinimumBody');
    if(!belowMin.length){
      minBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#9ca3af;">'
        + 'All active distributors meet the minimum requirement of ' + minPurchaseDisplay + ' this month.</td></tr>';
    } else {
      minBody.innerHTML = belowMin.map(function(x){
        var shortfall = minInDisplayCurrency - x.amount;
        var status = x.user.isActive ? 'active' : 'inactive';
        var statusStyle = x.user.isActive
          ? 'background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;'
          : 'background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb;';
        // x.amount and shortfall are already in display currency — don't convert again
        var fmtDisplay = function(n){
          return AppCurrency.symbol() + Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        };
        return '<tr>'
          + '<td>' + esc(x.user.fullName || x.user.username || x.user.email) + '</td>'
          + '<td>' + esc(x.user.email) + '</td>'
          + '<td>' + fmtDisplay(x.amount)
            + '<div style="font-size:11.5px;color:#dc2626;margin-top:2px;">'
            + fmtDisplay(shortfall) + ' short</div></td>'
          + '<td>' + minPurchaseDisplay + '</td>'
          + '<td><span style="display:inline-flex;align-items:center;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;' + statusStyle + '">'
          + cap(status) + '</span></td>'
          + '</tr>';
      }).join('');
    }

    // ── GREETING ──
    var localUser = window.AppUtils.getLocalUser();
    setGreeting(localUser ? (localUser.name || localUser.email) : 'Admin');

  } catch(e) {
    console.error('Dashboard load error:', e);
  }
}

window.addEventListener('DOMContentLoaded', loadDashboard);