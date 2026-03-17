/**
 * Simple unilevel tree renderer (static demo data).
 */

function buildNode(node) {
  const item = document.createElement('div');
  item.className = 'tree-node';
  item.innerHTML = `<strong>${node.name}</strong><div class="tree-meta">${node.email}</div>`;

  if (node.children && node.children.length) {
    const children = document.createElement('div');
    children.className = 'tree-children';
    node.children.forEach((child) => {
      children.appendChild(buildNode(child));
    });
    item.appendChild(children);
  }

  return item;
}

function renderTree(rootId, data) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = '';
  root.appendChild(buildNode(data));
}

function buildTreeFromFlat(list) {
  const byId = new Map();
  list.forEach((u) => {
    byId.set(String(u.id), { id: String(u.id), name: u.full_name || u.username || u.email, email: u.email, sponsor_id: u.sponsor_id ? String(u.sponsor_id) : null, children: [] });
  });
  let root = null;
  byId.forEach((node) => {
    if (node.sponsor_id && byId.has(node.sponsor_id)) {
      byId.get(node.sponsor_id).children.push(node);
    } else {
      root = node;
    }
  });
  return root;
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const currentUser = window.AppUtils.getLocalUser();
    const userId = currentUser ? currentUser.id : null;
    const res = await window.AppUtils.safeFetch(userId ? `/api/users/${userId}/downline` : '/api/users');
    const list = res.downline || res.users || [];
    const tree = buildTreeFromFlat(list);
    if (tree) renderTree('treeRoot', tree);
  } catch {
    // ignore errors for now
  }
});
